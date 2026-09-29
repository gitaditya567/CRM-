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

  console.log("=== PRODUCT DETAILS ===");
  console.log("IV7000605:", await Product.findOne({ productNo: "IV7000605" }).lean());
  console.log("IV7000610:", await Product.findOne({ productNo: "IV7000610" }).lean());
  console.log("02.30.266.00:", await Product.findOne({ productNo: "02.30.266.00" }).lean());
  console.log("R02.30.266.12:", await Product.findOne({ productNo: "R02.30.266.12" }).lean());

  console.log("\n=== ALL STOCK LEDGERS FOR INVOLVED POs / PRODUCTS ===");
  const ledgers = await StockLedger.find({
    $or: [
      { poNo: "Q-2627-AA-1223" },
      { poNo: "1420013259" },
      { poNo: "Q-2627-KG-218" },
      { invoiceNo: "Q-2627-AA-1223" },
      { invoiceNo: "1420013259" },
      { invoiceNo: "Q-2627-KG-218" },
      { productNo: "IV7000605" },
      { productNo: "IV7000610" },
      { productNo: "02.30.266.00" },
      { productNo: "R02.30.266.12" }
    ]
  }).lean();
  console.log("StockLedger records found:", JSON.stringify(ledgers, null, 2));

  console.log("\n=== SEARCH FOR GEN-054 IN STOCK LEDGER & CLIENTS ===");
  const genLedgers = await StockLedger.find({ remarks: /GEN-054/i }).lean();
  console.log("Gen StockLedger:", genLedgers);

  console.log("\n=== CHECK CLIENTS FOR ENOKI & CULINEXIS ===");
  const enokiClients = await Client.find({ name: /Enoki/i }).lean();
  console.log("Enoki Clients:", enokiClients);
  const culinexisClients = await Client.find({ name: /Culinexis/i }).lean();
  console.log("Culinexis Clients:", culinexisClients);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
