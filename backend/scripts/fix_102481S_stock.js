const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");

async function fix102481S() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const product = await Product.findOne({ productNo: /102481S/i });
    if (!product) {
      console.error("Product 102481S not found!");
      process.exit(1);
    }

    console.log(`Found Product: ${product.name} (${product.productNo}), Current Stock: ${product.quantity}`);

    // Find the duplicate PI conversion ledger entry for PI-2627-KA-1067
    const piLedger = await StockLedger.findOne({
      product: product._id,
      piNo: "PI-2627-KA-1067",
      entryType: "OUT",
      remarks: /PI conversion/i
    });

    if (piLedger) {
      console.log(`Found duplicate PI conversion ledger entry: ${piLedger._id}. Deleting...`);
      await StockLedger.findByIdAndDelete(piLedger._id);
    }

    // Update product quantity to 0
    product.quantity = 0;
    await product.save();

    console.log(`Product 102481S quantity updated to: ${product.quantity} PCS`);
    console.log("Fix completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Error fixing 102481S:", err);
    process.exit(1);
  }
}

fix102481S();
