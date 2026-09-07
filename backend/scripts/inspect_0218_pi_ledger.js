const mongoose = require("mongoose");
require("dotenv").config({ path: "./backend/.env" });

const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");
const StockLedger = require("../models/StockLedger");

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);

    const po = await PurchaseOrder.findOne({ poNumber: /0218/i });
    if (po && po.pi) {
      const pi = await Quotation.findById(po.pi);
      console.log("=== PI FOR 0218 ===");
      console.log(JSON.stringify(pi, null, 2));
    }

    const ledgers = await StockLedger.find({
      $or: [
        { reference: /0218/i },
        { invoiceNo: /TBSPL262700678/i },
        { reference: /TBSPL262700678/i },
        { note: /0218/i }
      ]
    });
    console.log("=== STOCK LEDGERS FOR 0218 / INVOICE ===");
    console.log(JSON.stringify(ledgers, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
