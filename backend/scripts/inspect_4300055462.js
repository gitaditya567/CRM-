const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");
const Product = require("../models/Product");

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB.");

    const term = "4300055462";
    const pos = await PurchaseOrder.find({
      $or: [
        { poNumber: new RegExp(term, "i") },
        { leadNumber: new RegExp(term, "i") },
        { vendorName: new RegExp(term, "i") },
        { "invoiceHistory.invoiceNo": new RegExp(term, "i") }
      ]
    });

    console.log(`=== Found ${pos.length} Purchase Orders for ${term} ===`);
    pos.forEach((po) => {
      console.log("PO ID:", po._id);
      console.log("PO Number:", po.poNumber);
      console.log("Status:", po.status);
      console.log("Type:", po.type);
      console.log("Products:", JSON.stringify(po.products, null, 2));
      console.log("Invoice History:", JSON.stringify(po.invoiceHistory, null, 2));
      console.log("Dispatch History:", JSON.stringify(po.dispatchHistory, null, 2));
    });

    const quotes = await Quotation.find({
      $or: [
        { quotationNumber: new RegExp(term, "i") },
        { poNumber: new RegExp(term, "i") }
      ]
    });

    console.log(`=== Found ${quotes.length} Quotations/PIs for ${term} ===`);
    quotes.forEach((q) => {
      console.log("Quotation ID:", q._id);
      console.log("Quotation Number:", q.quotationNumber);
      console.log("Products:", JSON.stringify(q.products, null, 2));
    });

    // Also search for Product with productNo 34790L or 34791L
    const prodOld = await Product.findOne({ productNo: new RegExp("^34790L$", "i") });
    const prodNew = await Product.findOne({ productNo: new RegExp("^34791L$", "i") });
    console.log("Old Product (34790L):", prodOld);
    console.log("New Product (34791L):", prodNew);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
