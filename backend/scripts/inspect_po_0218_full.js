const mongoose = require("mongoose");
require("dotenv").config({ path: "./backend/.env" });

const PurchaseOrder = require("../models/PurchaseOrder");

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);

    const po = await PurchaseOrder.findOne({ poNumber: /0218/i });
    console.log("=== PO 0218 FULL ===");
    console.log(JSON.stringify(po, null, 2));

    process.exit(0);
  } catch (err) {
    console.error("Error inspecting:", err);
    process.exit(1);
  }
}

run();
