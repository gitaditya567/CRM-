const mongoose = require("mongoose");
require("dotenv").config({ path: "./backend/.env" });

const StockLedger = require("../models/StockLedger");
const Product = require("../models/Product");

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/crm");

  const ledgers = await StockLedger.find({
    $or: [
      { poNo: /0262/i },
      { piNo: /PI-2627-AA-645/i },
      { remarks: /0262/i },
      { productNo: /GS\.2006/i }
    ]
  });

  console.log("=== StockLedger for 0262 / GS.2006 ===");
  ledgers.forEach(l => {
    console.log({
      id: l._id,
      productNo: l.productNo,
      entryType: l.entryType,
      qty: l.quantity,
      piNo: l.piNo,
      poNo: l.poNo,
      remarks: l.remarks,
      date: l.date
    });
  });

  const pOld = await Product.findOne({ productNo: "GS.2006" });
  const pNew = await Product.findOne({ productNo: "GS.2006B" });
  console.log("GS.2006 stock:", pOld ? pOld.quantity : "N/A");
  console.log("GS.2006B stock:", pNew ? pNew.quantity : "N/A");

  process.exit(0);
}

run();
