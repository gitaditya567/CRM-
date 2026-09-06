const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");

async function checkInvoiceDeductions() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const invoiceEntries = await StockLedger.find({
      remarks: /Subtracted stock upon Invoice creation/i
    }).lean();

    console.log(`Found ${invoiceEntries.length} entries with 'Subtracted stock upon Invoice creation':`);
    for (const entry of invoiceEntries) {
      const prod = await Product.findById(entry.product).lean();
      console.log(`- ID: ${entry._id} | Product: ${entry.productNo} (${prod?.name}) | Qty: ${entry.quantity} | Current Stock: ${prod?.quantity} | InvNo: ${entry.invoiceNo}`);
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

checkInvoiceDeductions();
