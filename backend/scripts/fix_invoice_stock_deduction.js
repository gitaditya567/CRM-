const mongoose = require("mongoose");
require("dotenv").config();

const PurchaseOrder = require("../models/PurchaseOrder");
const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");

async function fixInvoiceStock() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    // Find PO IEC-3155/26-27(A)
    const po = await PurchaseOrder.findOne({ poNumber: /IEC-3155\/26-27\(A\)/i });
    if (!po) {
      console.error("PO not found!");
      process.exit(1);
    }

    console.log(`Found PO: ${po.poNumber}, Invoices count: ${po.invoiceHistory?.length || 0}`);

    if (po.invoiceHistory && po.invoiceHistory.length > 0) {
      for (const inv of po.invoiceHistory) {
        console.log(`Processing Invoice: ${inv.invoiceNo}, Total Value: ${inv.totalValue}`);
        
        // Check if ledger entry already exists for this invoice
        const existingLedger = await StockLedger.findOne({ invoiceNo: inv.invoiceNo, entryType: "OUT" });
        if (existingLedger) {
          console.log(`Ledger entry for invoice ${inv.invoiceNo} already exists.`);
          continue;
        }

        const invProducts = inv.products && inv.products.length > 0 ? inv.products : po.products;
        for (const item of invProducts) {
          let productDoc = await Product.findOne({ productNo: item.productNo });
          if (!productDoc && item.product) {
            productDoc = await Product.findById(item.product);
          }

          if (productDoc) {
            const qtyToDeduct = Number(item.quantity) || 0;
            console.log(`Deducting ${qtyToDeduct} PCS from product ${productDoc.name} (${productDoc.productNo}). Current stock: ${productDoc.quantity}`);
            
            productDoc.quantity = (productDoc.quantity || 0) - qtyToDeduct;
            await productDoc.save();

            console.log(`New Product Quantity: ${productDoc.quantity}`);

            // Create StockLedger OUT entry
            const ledgerEntry = new StockLedger({
              product: productDoc._id,
              productNo: productDoc.productNo,
              brand: productDoc.brand,
              entryType: "OUT",
              poNo: po.poNumber,
              invoiceNo: inv.invoiceNo,
              date: inv.date ? new Date(inv.date) : new Date(),
              quantity: qtyToDeduct,
              unitPrice: item.unitPrice || 0,
              balanceAfter: productDoc.quantity,
              remarks: `Subtracted stock upon Invoice creation (${inv.invoiceNo})`
            });

            await ledgerEntry.save();
            console.log(`Logged StockLedger OUT entry for invoice ${inv.invoiceNo}`);
          }
        }
      }
    }

    console.log("Fix completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Error fixing invoice stock:", err);
    process.exit(1);
  }
}

fixInvoiceStock();
