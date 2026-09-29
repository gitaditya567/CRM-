const mongoose = require("mongoose");
require("dotenv").config({ path: __dirname + "/../.env" });

const Quotation = require("../models/Quotation");
const PurchaseOrder = require("../models/PurchaseOrder");
const Lead = require("../models/Lead");

async function run() {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
  await mongoose.connect(mongoUri);

  console.log("=== CHECK PI-2627-AA-1223 ===");
  const q = await Quotation.find({ quotationNumber: "PI-2627-AA-1223" }).lean();
  console.log("Quotation PI-2627-AA-1223:", JSON.stringify(q, null, 2));

  const po = await PurchaseOrder.findOne({ poNumber: "Q-2627-AA-1223" }).lean();
  console.log("PO Q-2627-AA-1223 pi ref:", po?.pi);
  if (po?.pi) {
    const qByRef = await Quotation.findById(po.pi).lean();
    console.log("Quotation by PO.pi ref:", JSON.stringify(qByRef, null, 2));
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
