const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("../models/Product");
const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");

async function inspectAndPrepare() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const prod = await Product.findOne({ productNo: /SCSC98050106-00/i });
    console.log("Target Product Details:", JSON.stringify(prod, null, 2));

    const po = await PurchaseOrder.findOne({ poNumber: /IEC-3155\/26-27\(A\)/i }).populate("pi");
    console.log("Target PO Details:", {
      id: po._id,
      poNumber: po.poNumber,
      piNumber: po.pi?.quotationNumber,
      products: po.products,
      invoiceHistory: po.invoiceHistory
    });

    process.exit(0);
  } catch (err) {
    console.error("Error inspecting:", err);
    process.exit(1);
  }
}

inspectAndPrepare();
