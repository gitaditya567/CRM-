const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");

const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // =========================================================================
    // 1. Product 89163: Change stock to 1
    // =========================================================================
    const prod89163 = await Product.findOne({ productNo: "89163" });
    if (!prod89163) {
      console.error("Product 89163 not found!");
    } else {
      const prevQty = prod89163.quantity || 0;
      console.log(`Product 89163 (${prod89163.name}): Current stock = ${prevQty}`);
      prod89163.quantity = 1;
      await prod89163.save();
      console.log(`Updated Product 89163 stock to 1.`);

      const adjQty = 1 - prevQty;
      const ledgerEntry1 = new StockLedger({
        product: prod89163._id,
        productNo: prod89163.productNo,
        brand: prod89163.brand || "Robot Coupe",
        entryType: "ADJUSTMENT",
        quantity: adjQty,
        balanceAfter: 1,
        remarks: "Manual stock adjustment to 1",
        date: new Date()
      });
      await ledgerEntry1.save();
      console.log(`Created StockLedger ADJUSTMENT entry for 89163: qty = ${adjQty}, balanceAfter = 1`);
    }

    // =========================================================================
    // 2. Product 89530: Change stock to 3
    // =========================================================================
    const prod89530 = await Product.findOne({ productNo: "89530" });
    if (!prod89530) {
      console.error("Product 89530 not found!");
    } else {
      const prevQty = prod89530.quantity || 0;
      console.log(`Product 89530 (${prod89530.name}): Current stock = ${prevQty}`);
      prod89530.quantity = 3;
      await prod89530.save();
      console.log(`Updated Product 89530 stock to 3.`);

      const adjQty = 3 - prevQty;
      const ledgerEntry2 = new StockLedger({
        product: prod89530._id,
        productNo: prod89530.productNo,
        brand: prod89530.brand || "Robot Coupe",
        entryType: "ADJUSTMENT",
        quantity: adjQty,
        balanceAfter: 3,
        remarks: "Manual stock adjustment to 3",
        date: new Date()
      });
      await ledgerEntry2.save();
      console.log(`Created StockLedger ADJUSTMENT entry for 89530: qty = ${adjQty}, balanceAfter = 3`);
    }

    // =========================================================================
    // 3. Product 102690S: Verify stock is 0
    // =========================================================================
    const prod102690S = await Product.findOne({ productNo: "102690S" });
    if (!prod102690S) {
      console.error("Product 102690S not found!");
    } else {
      console.log(`Product 102690S (${prod102690S.name}): Stock = ${prod102690S.quantity}`);
      if (prod102690S.quantity !== 0) {
        prod102690S.quantity = 0;
        await prod102690S.save();
        console.log("Updated Product 102690S stock to 0.");
      } else {
        console.log("Product 102690S is already 0.");
      }
    }

    console.log("\n=== ALL STOCK UPDATES APPLIED SUCCESSFULLY ===");
    process.exit(0);
  } catch (err) {
    console.error("Error applying stock updates:", err);
    process.exit(1);
  }
}

main();
