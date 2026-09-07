const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");
const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");

async function verify() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    console.log("\n=================== VERIFYING PO 0218 ===================");
    const po0218 = await PurchaseOrder.findOne({ poNumber: /PO\/SE\/INR\/26-27\/0218/i });
    console.log({
      poNumber: po0218.poNumber,
      status: po0218.status,
      isMovedToInvoice: po0218.isMovedToInvoice,
      products: po0218.products.map(p => ({
        productNo: p.productNo,
        name: p.name,
        quantity: p.quantity,
        invoicedQuantity: p.invoicedQuantity,
        currentInvoiceQty: p.currentInvoiceQty,
        selected: p.selected
      })),
      invoiceHistory: po0218.invoiceHistory.map(inv => ({
        invoiceNo: inv.invoiceNo,
        totalValue: inv.totalValue,
        products: inv.products.map(p => ({ productNo: p.productNo, qty: p.quantity, total: p.total }))
      }))
    });

    console.log("\n=================== VERIFYING REC/0262/2026 ===================");
    const po0262 = await PurchaseOrder.findOne({ poNumber: /REC\/0262\/2026/i });
    console.log("PO REC/0262/2026 products:");
    po0262.products.forEach(p => {
      console.log(`- ${p.productNo} | ${p.name} | Qty: ${p.quantity} | UnitPrice: ₹${p.unitPrice}`);
    });

    const quote0262 = await Quotation.findOne({ poNumber: /REC\/0262\/2026/i });
    console.log(`\nQuotation ${quote0262?.quotationNumber} products:`);
    quote0262.products.forEach(p => {
      console.log(`- ${p.productNo} | ${p.name} | Qty: ${p.quantity} | UnitPrice: ₹${p.unitPrice}`);
    });

    const prodOld = await Product.findOne({ productNo: "GS.2006" });
    const prodNew = await Product.findOne({ productNo: "GS.2006B" });
    console.log(`\nStock Quantities: GS.2006 = ${prodOld?.quantity}, GS.2006B = ${prodNew?.quantity}`);

    const ledgerEntries = await StockLedger.find({
      $or: [
        { piNo: "PI-2627-AA-645" },
        { piNo: "PI-2627-AD-1066" }
      ]
    });
    console.log("\nStockLedger entries for both orders:");
    ledgerEntries.forEach(l => {
      console.log(`- [${l.entryType}] PI: ${l.piNo} | Prod: ${l.productNo} | Qty: ${l.quantity} | Inv: ${l.invoiceNo || "N/A"} | Balance: ${l.balanceAfter}`);
    });

    process.exit(0);
  } catch (err) {
    console.error("Verification failed:", err);
    process.exit(1);
  }
}

verify();
