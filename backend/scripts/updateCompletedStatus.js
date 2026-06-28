require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const PurchaseOrder = require("../models/PurchaseOrder");

async function convertCompletedToProcessed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to database.");

    const result = await PurchaseOrder.updateMany(
      { status: "Completed" },
      { $set: { status: "Processed" } }
    );

    console.log(`Successfully updated ${result.modifiedCount} Purchase Orders from 'Completed' to 'Processed'.`);
    process.exit(0);
  } catch (err) {
    console.error("Error updating PO status:", err);
    process.exit(1);
  }
}

convertCompletedToProcessed();
