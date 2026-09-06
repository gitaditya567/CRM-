const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");

async function cleanupInvoiceEntries() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const invoiceEntries = await StockLedger.find({
      remarks: /Subtracted stock upon Invoice creation/i
    });

    console.log(`Found ${invoiceEntries.length} invoice deduction entries to revert:`);
    for (const entry of invoiceEntries) {
      const product = await Product.findById(entry.product);
      if (product) {
        console.log(`Reverting ${entry.quantity} PCS for ${product.name} (${product.productNo}). Stock before: ${product.quantity}`);
        product.quantity = (product.quantity || 0) + entry.quantity;
        await product.save();
        console.log(`Stock after: ${product.quantity}`);
      }
      await StockLedger.findByIdAndDelete(entry._id);
      console.log(`Deleted ledger entry ${entry._id}`);
    }

    console.log("Cleanup completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Cleanup error:", err);
    process.exit(1);
  }
}

cleanupInvoiceEntries();
