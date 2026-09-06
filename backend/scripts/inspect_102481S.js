const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");
const PurchaseOrder = require("../models/PurchaseOrder");

async function inspect102481S() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const product = await Product.findOne({ productNo: /102481S/i });
    if (!product) {
      console.log("Product 102481S not found!");
    } else {
      console.log("Found Product:", product.name, "| ProductNo:", product.productNo, "| ID:", product._id, "| Current Quantity:", product.quantity);
      
      const ledger = await StockLedger.find({
        $or: [
          { product: product._id },
          { productNo: product.productNo }
        ]
      }).sort({ date: -1 }).lean();

      console.log(`Found ${ledger.length} StockLedger entries for 102481S:`);
      ledger.forEach(entry => {
        console.log(`- Date: ${entry.date?.toISOString()}, Type: ${entry.entryType}, Qty: ${entry.quantity}, BalanceAfter: ${entry.balanceAfter}, PI: ${entry.piNo}, PO: ${entry.poNo}, Inv: ${entry.invoiceNo}, Remarks: ${entry.remarks}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error("Error inspecting 102481S:", err);
    process.exit(1);
  }
}

inspect102481S();
