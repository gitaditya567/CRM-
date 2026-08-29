const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");

async function testStockFeature() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/crm_team_inspire");
        console.log("Connected to MongoDB successfully.");

        // 1. Create or find test product
        let product = await Product.findOne({ productNo: "TEST-SKF-6204" });
        if (!product) {
            product = new Product({
                type: "Spare Part",
                productNo: "TEST-SKF-6204",
                name: "Deep Groove Ball Bearing 6204-2RS",
                brand: "SKF",
                uom: "Nos",
                currency: "USD",
                priceUSD: 12.5,
                dealerPriceINR: 1100,
                retailPriceINR: 1450,
                quantity: 0
            });
            await product.save();
            console.log("Created test product:", product.productNo);
        } else {
            console.log("Found existing test product:", product.productNo);
        }

        // 2. Add Stock Transaction (Stock In)
        const addQty = 50;
        const updatedProduct = await Product.findByIdAndUpdate(
            product._id,
            { $inc: { quantity: addQty } },
            { new: true }
        );

        const ledgerEntry = new StockLedger({
            product: updatedProduct._id,
            productNo: updatedProduct.productNo,
            brand: updatedProduct.brand,
            entryType: "IN",
            piNo: "PI-TEST-001",
            invoiceNo: "INV-9901",
            date: new Date(),
            quantity: addQty,
            unitPrice: 12.5,
            balanceAfter: updatedProduct.quantity,
            supplier: "SKF India Ltd",
            remarks: "Test Stock Inward verification"
        });
        await ledgerEntry.save();
        console.log("Created Stock Ledger Entry successfully! Balance:", ledgerEntry.balanceAfter);

        // 3. Query Stock Ledger
        const ledgerHistory = await StockLedger.find({ product: product._id }).sort({ date: -1 });
        console.log(`Found ${ledgerHistory.length} ledger entries for ${product.productNo}.`);

        console.log("All stock verification tests PASSED!");
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("Verification failed:", err);
        process.exit(1);
    }
}

testStockFeature();
