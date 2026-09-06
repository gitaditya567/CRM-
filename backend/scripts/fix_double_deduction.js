const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");

async function fixDoubleDeduction() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    // Find product SC620433 08R
    const product = await Product.findOne({ productNo: /SC620433 08R/i });
    if (!product) {
      console.error("Product SC620433 08R not found!");
      process.exit(1);
    }

    console.log(`Found Product: ${product.name} (${product.productNo}), Current Stock: ${product.quantity}`);

    // Remove the PI conversion OUT entry for PI-2627-AD-595 if double deducted
    const piLedger = await StockLedger.findOne({
      product: product._id,
      piNo: "PI-2627-AD-595",
      entryType: "OUT",
      remarks: /PI conversion/i
    });

    if (piLedger) {
      console.log(`Found duplicate PI conversion ledger entry: ${piLedger._id}. Deleting entry...`);
      await StockLedger.findByIdAndDelete(piLedger._id);
      
      // Add back +1 to product quantity
      product.quantity = (product.quantity || 0) + 1;
      await product.save();
      console.log(`Updated Product Quantity: ${product.quantity} PCS`);
    } else {
      // Direct adjustment to 0 if ledger entry was formatted differently
      if (product.quantity === -1) {
        product.quantity = 0;
        await product.save();
        console.log(`Updated Product Quantity directly to: ${product.quantity} PCS`);
      }
    }

    console.log("Double deduction fix completed!");
    process.exit(0);
  } catch (err) {
    console.error("Error fixing double deduction:", err);
    process.exit(1);
  }
}

fixDoubleDeduction();
