const mongoose = require("mongoose");
require("dotenv").config();

const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");
const Product = require("../models/Product");

async function checkAndSwap() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    // 1. Find PO 8000711883
    const po = await PurchaseOrder.findOne({ poNumber: /8000711883/i }).populate("pi");
    if (!po) {
      console.error("PO 8000711883 not found!");
      process.exit(1);
    }
    console.log("Found PO:", po.poNumber);
    console.log("Current Products in PO 8000711883:", JSON.stringify(po.products, null, 2));

    // 2. Find target product SCSC98050106-00
    const newProd = await Product.findOne({ productNo: /SCSC98050106-00/i });
    if (!newProd) {
      console.error("Target product SCSC98050106-00 not found!");
      process.exit(1);
    }
    console.log(`Found Target Product: ${newProd.name} (${newProd.productNo})`);

    // Price details (Keep Qty: 1, Unit Price: 8800 as in current PO item)
    const qty = 1;
    const unitPrice = 8800;
    const gstRate = newProd.gstRate || 18;
    const taxable = qty * unitPrice;
    const gst = taxable * (gstRate / 100);
    const total = taxable + gst;

    const newPOItem = {
      product: newProd._id,
      productNo: newProd.productNo,
      name: newProd.name,
      brand: newProd.brand || "Scotsman",
      type: newProd.type || "Spare Part",
      hsnCode: newProd.hsnCode || "90328990",
      quantity: qty,
      unitPrice: unitPrice,
      gstRate: gstRate,
      total: total,
      selected: true,
      invoicedQuantity: 0,
      currentInvoiceQty: 1,
      dispatchedQuantity: 0
    };

    // Replace products in PO 8000711883
    po.products = [newPOItem];
    po.estimatedTotal = total;
    po.totalValue = total;

    await po.save();
    console.log(`PO ${po.poNumber} updated successfully with SCSC98050106-00 (Qty 1)!`);

    // 3. Update associated PI if present
    if (po.pi) {
      const pi = await Quotation.findById(po.pi._id || po.pi);
      if (pi) {
        pi.products = [{
          product: newProd._id,
          productNo: newProd.productNo,
          name: newProd.name,
          brand: newProd.brand || "Scotsman",
          type: newProd.type || "Spare Part",
          hsnCode: newProd.hsnCode || "90328990",
          quantity: qty,
          unitPrice: unitPrice,
          gstRate: gstRate,
          taxableAmount: taxable,
          gstAmount: gst,
          total: total
        }];
        await pi.save();
        console.log(`Associated PI ${pi.quotationNumber} updated successfully!`);
      }
    }

    console.log("Swap completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Error swapping product on PO 8000711883:", err);
    process.exit(1);
  }
}

checkAndSwap();
