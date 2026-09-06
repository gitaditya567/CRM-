const mongoose = require("mongoose");
require("dotenv").config();

const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");
const StockLedger = require("../models/StockLedger");

async function checkPI1031() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const pi = await Quotation.findOne({ quotationNumber: /PI-2627-KA-1031/i });
    console.log("Found PI:", pi?.quotationNumber, "| ID:", pi?._id);

    const po = await PurchaseOrder.findOne({
      $or: [
        { pi: pi?._id },
        { "products.productNo": /GS\.3713/i }
      ]
    });
    console.log("Found PO:", po?.poNumber, "| Invoices:", po?.invoiceHistory);

    const ledger = await StockLedger.find({
      $or: [
        { piNo: /PI-2627-KA-1031/i },
        { productNo: /GS\.3713/i }
      ]
    }).lean();

    console.log(`Found ${ledger.length} StockLedger entries:`);
    ledger.forEach(l => {
      console.log(`- ID: ${l._id} | Date: ${l.date?.toISOString()} | Type: ${l.entryType} | Product: ${l.productNo} | PI: ${l.piNo} | PO: ${l.poNo} | Inv: ${l.invoiceNo}`);
    });

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

checkPI1031();
