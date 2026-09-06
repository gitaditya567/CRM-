const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");

async function addStock() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    // Find product CB 699 J2
    let product = await Product.findOne({ productNo: /CB 699 J2/i });
    if (!product) {
      product = await Product.findOne({ name: /Multifunction Commercial Blender/i });
    }

    if (!product) {
      console.error("Product CB 699 J2 not found!");
      process.exit(1);
    }

    console.log(`Found Product: ${product.name} (${product.productNo})`);
    console.log(`Current Quantity before update: ${product.quantity} PCS`);

    const qtyToAdd = 2;
    product.quantity = (product.quantity || 0) + qtyToAdd;
    await product.save();

    console.log(`Updated Quantity: ${product.quantity} PCS`);

    // Create StockLedger entry
    const ledgerEntry = new StockLedger({
      product: product._id,
      productNo: product.productNo,
      brand: product.brand,
      entryType: "IN",
      date: new Date(),
      quantity: qtyToAdd,
      unitPrice: product.retailPriceINR || 0,
      balanceAfter: product.quantity,
      supplier: "Manual Adjustment",
      remarks: "Added +2 PCS stock to enable Inward Invoice creation"
    });
    await ledgerEntry.save();

    console.log("StockLedger entry created successfully!");
    console.log(`NEW ACTIVE PHYSICAL STOCK: ${product.quantity} PCS`);

    process.exit(0);
  } catch (err) {
    console.error("Error updating stock:", err);
    process.exit(1);
  }
}

addStock();
