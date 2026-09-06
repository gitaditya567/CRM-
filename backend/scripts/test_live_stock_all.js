const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");
const { getProductLiveStock } = require("../controllers/productController");

async function testAllLiveStock() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const products = await Product.find({}).lean();
    console.log(`Found ${products.length} products to test.`);

    let errors = 0;
    for (const product of products) {
      try {
        const req = { params: { id: String(product._id) }, query: {} };
        const res = {
          json: (data) => data,
          status: (code) => ({ json: (data) => console.error(`Error status ${code} for product ${product._id}:`, data) })
        };
        await getProductLiveStock(req, res);
      } catch (err) {
        console.error(`500 Exception for product ${product._id} (${product.productNo}):`, err.message);
        errors++;
      }
    }

    // Also test by-query route with missing/invalid params
    try {
      const req = { params: { id: "by-query" }, query: { productNo: "NON_EXISTENT_XYZ_123" } };
      const res = {
        json: (data) => data,
        status: (code) => ({ json: (data) => console.log(`Expected status ${code} for non-existent:`, data) })
      };
      await getProductLiveStock(req, res);
    } catch (err) {
      console.error("500 Exception for non-existent by-query:", err.message);
      errors++;
    }

    console.log(`Test completed. Total errors: ${errors}`);
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

testAllLiveStock();
