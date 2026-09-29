const mongoose = require("mongoose");
require("dotenv").config({ path: __dirname + "/../.env" });

const Quotation = require("../models/Quotation");
const PurchaseOrder = require("../models/PurchaseOrder");
const Product = require("../models/Product");
const Lead = require("../models/Lead");
const Client = require("../models/Client");
const StockLedger = require("../models/StockLedger");

async function run() {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
  await mongoose.connect(mongoUri);

  console.log("=== SEARCH FOR GEN-054 ===");
  const gen054Quotes = await Quotation.find({
    $or: [
      { quotationNumber: /GEN-054/i },
      { poNumber: /GEN-054/i },
      { "billTo.name": /GEN-054/i },
      { "shipTo.name": /GEN-054/i },
      { "products.productNo": /GEN-054/i },
      { "products.name": /GEN-054/i }
    ]
  }).lean();
  console.log("Quotes search for GEN-054:", gen054Quotes);

  const gen054POs = await PurchaseOrder.find({
    $or: [
      { poNumber: /GEN-054/i },
      { vendorName: /GEN-054/i },
      { leadNumber: /GEN-054/i },
      { "products.productNo": /GEN-054/i }
    ]
  }).lean();
  console.log("POs search for GEN-054:", gen054POs);

  const gen054Leads = await Lead.find({
    $or: [
      { leadNumber: /GEN-054/i },
      { name: /GEN-054/i },
      { notes: /GEN-054/i }
    ]
  }).lean();
  console.log("Leads search for GEN-054:", gen054Leads);

  const gen054Clients = await Client.find({
    $or: [
      { name: /GEN-054/i },
      { company: /GEN-054/i },
      { code: /GEN-054/i },
      { notes: /GEN-054/i }
    ]
  }).lean();
  console.log("Clients search for GEN-054:", gen054Clients);

  const gen054Products = await Product.find({
    $or: [
      { productNo: /GEN-054/i },
      { name: /GEN-054/i }
    ]
  }).lean();
  console.log("Products search for GEN-054:", gen054Products);

  console.log("\n=== FULL PO Q-2627-AA-1223 ===");
  const po1 = await PurchaseOrder.findOne({ poNumber: "Q-2627-AA-1223" }).lean();
  console.log(JSON.stringify(po1, null, 2));

  console.log("\n=== QUOTATION FOR Q-2627-AA-1223 ===");
  const q1 = await Quotation.find({ $or: [{ quotationNumber: /Q-2627-AA-1223/i }, { poNumber: /Q-2627-AA-1223/i }] }).lean();
  console.log(JSON.stringify(q1, null, 2));

  console.log("\n=== FULL PO 1420013259 ===");
  const po2 = await PurchaseOrder.findOne({ poNumber: "1420013259" }).lean();
  console.log(JSON.stringify(po2, null, 2));

  console.log("\n=== QUOTATION FOR 1420013259 ===");
  const q2 = await Quotation.find({ $or: [{ quotationNumber: /1420013259/i }, { poNumber: /1420013259/i }] }).lean();
  console.log(JSON.stringify(q2, null, 2));

  console.log("\n=== FULL PO Q-2627-KG-218 ===");
  const po3 = await PurchaseOrder.findOne({ poNumber: "Q-2627-KG-218" }).lean();
  console.log(JSON.stringify(po3, null, 2));

  console.log("\n=== QUOTATION FOR Q-2627-KG-218 ===");
  const q3 = await Quotation.find({ $or: [{ quotationNumber: /Q-2627-KG-218/i }, { poNumber: /Q-2627-KG-218/i }] }).lean();
  console.log(JSON.stringify(q3, null, 2));

  console.log("\n=== LEAD FOR Q-2627-KG-218 ===");
  if (po3 && po3.leadNumber) {
    const l3 = await Lead.findOne({ leadNumber: po3.leadNumber }).lean();
    console.log(JSON.stringify(l3, null, 2));
  } else if (q3.length && q3[0].lead) {
    const l3 = await Lead.findById(q3[0].lead).lean();
    console.log(JSON.stringify(l3, null, 2));
  }

  console.log("\n=== SEARCH Culinexis IN ALL COLLECTIONS ===");
  const cQuotes = await Quotation.find({
    $or: [{ "billTo.name": /Culinexis/i }, { "shipTo.name": /Culinexis/i }]
  }).lean();
  console.log("Culinexis Quotes:", JSON.stringify(cQuotes, null, 2));
  const cPOs = await PurchaseOrder.find({ vendorName: /Culinexis/i }).lean();
  console.log("Culinexis POs:", JSON.stringify(cPOs, null, 2));
  const cLeads = await Lead.find({ name: /Culinexis/i }).lean();
  console.log("Culinexis Leads:", JSON.stringify(cLeads, null, 2));

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
