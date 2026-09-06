const mongoose = require("mongoose");
require("dotenv").config();

const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");
const Product = require("../models/Product");

async function replaceProduct() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    // 1. Find product SCSC98050106-00
    const newProductDoc = await Product.findOne({ productNo: /SCSC98050106-00/i });
    if (!newProductDoc) {
      console.error("New product SCSC98050106-00 not found!");
      process.exit(1);
    }
    console.log(`Target Product: ${newProductDoc.name} (${newProductDoc.productNo})`);

    // 2. Find PO IEC-3155/26-27(A)
    const po = await PurchaseOrder.findOne({ poNumber: /IEC-3155\/26-27\(A\)/i });
    if (!po) {
      console.error("PO IEC-3155/26-27(A) not found!");
      process.exit(1);
    }

    console.log(`Found PO: ${po.poNumber}`);

    // Create the new product object for PO
    const qty = 2; // Keep quantity as 2
    const unitPrice = 26000;
    const gstRate = newProductDoc.gstRate || 18;
    const taxable = qty * unitPrice;
    const gst = taxable * (gstRate / 100);
    const total = taxable + gst;

    const newPOItem = {
      product: newProductDoc._id,
      productNo: newProductDoc.productNo,
      name: newProductDoc.name,
      brand: newProductDoc.brand || "Scotsman",
      type: newProductDoc.type || "Spare Part",
      hsnCode: newProductDoc.hsnCode || "90328990",
      quantity: qty,
      unitPrice: unitPrice,
      gstRate: gstRate,
      total: total,
      selected: true,
      invoicedQuantity: qty,
      currentInvoiceQty: 0,
      dispatchedQuantity: qty
    };

    // Replace products in PO
    po.products = [newPOItem];
    
    // Update invoiceHistory product list if present
    if (po.invoiceHistory && po.invoiceHistory.length > 0) {
      po.invoiceHistory.forEach(inv => {
        inv.products = [{
          productNo: newProductDoc.productNo,
          name: newProductDoc.name,
          brand: newProductDoc.brand || "Scotsman",
          quantity: qty,
          unitPrice: unitPrice,
          total: qty * unitPrice
        }];
      });
    }

    await po.save();
    console.log("PO updated successfully with new product SCSC98050106-00!");

    // 3. Also update PI PI-2627-AD-1008 if linked
    if (po.pi) {
      const pi = await Quotation.findById(po.pi);
      if (pi) {
        pi.products = [{
          product: newProductDoc._id,
          productNo: newProductDoc.productNo,
          name: newProductDoc.name,
          brand: newProductDoc.brand || "Scotsman",
          type: newProductDoc.type || "Spare Part",
          hsnCode: newProductDoc.hsnCode || "90328990",
          quantity: qty,
          unitPrice: unitPrice,
          gstRate: gstRate,
          taxableAmount: taxable,
          gstAmount: gst,
          total: total
        }];
        await pi.save();
        console.log("Associated PI updated successfully with new product SCSC98050106-00!");
      }
    }

    console.log("Replacement operation completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Error replacing product:", err);
    process.exit(1);
  }
}

replaceProduct();
