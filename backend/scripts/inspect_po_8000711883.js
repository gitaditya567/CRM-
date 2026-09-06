const mongoose = require("mongoose");
require("dotenv").config();

const PurchaseOrder = require("../models/PurchaseOrder");

async function inspectPO() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const po = await PurchaseOrder.findOne({ poNumber: /8000711883/i });
    if (!po) {
      console.error("PO 8000711883 not found!");
      process.exit(1);
    }

    console.log("PO Details:", JSON.stringify(po, null, 2));

    process.exit(0);
  } catch (err) {
    console.error("Error inspecting PO:", err);
    process.exit(1);
  }
}

inspectPO();
