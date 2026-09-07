const mongoose = require("mongoose");
require("dotenv").config({ path: "./backend/.env" });

const PurchaseOrder = require("../models/PurchaseOrder");
const Product = require("../models/Product");
const Quotation = require("../models/Quotation");
const StockLedger = require("../models/StockLedger");

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const po = await PurchaseOrder.findOne({ poNumber: /0218/i }).populate("products.product");
    console.log("=== TARGET PO 0218 ===");
    console.log(JSON.stringify(po, null, 2));

    const recPO = await PurchaseOrder.find({
      $or: [
        { poNumber: /0262/i },
        { leadNumber: /0262/i },
        { "invoiceHistory.invoiceNo": /0262/i }
      ]
    });
    console.log("=== POs MATCHING 0262 ===");
    console.log(JSON.stringify(recPO, null, 2));

    const quotes = await Quotation.find({
      $or: [
        { quotationNumber: /0262/i },
        { poNumber: /0262/i },
        { leadNumber: /0262/i }
      ]
    });
    console.log("=== QUOTATIONS MATCHING 0262 ===");
    console.log(JSON.stringify(quotes, null, 2));

    const gsProducts = await Product.find({ productNo: /GS\.2006/i });
    console.log("=== GS.2006 PRODUCTS ===");
    console.log(JSON.stringify(gsProducts, null, 2));

    process.exit(0);
  } catch (err) {
    console.error("Error inspecting:", err);
    process.exit(1);
  }
}

run();
