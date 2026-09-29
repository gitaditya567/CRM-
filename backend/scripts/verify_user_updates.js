const mongoose = require("mongoose");
require("dotenv").config({ path: __dirname + "/../.env" });

const Quotation = require("../models/Quotation");
const PurchaseOrder = require("../models/PurchaseOrder");
const Product = require("../models/Product");
const Lead = require("../models/Lead");
const StockLedger = require("../models/StockLedger");

async function run() {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
  await mongoose.connect(mongoUri);

  console.log("=== VERIFICATION RESULTS ===");

  console.log("\n1. PO Q-2627-AA-1223:");
  const po1 = await PurchaseOrder.findOne({ poNumber: "Q-2627-AA-1223" }).lean();
  console.log("- Products:", po1.products.map(p => ({ productNo: p.productNo, name: p.name, brand: p.brand })));

  const q1 = await Quotation.findOne({ quotationNumber: "PI-2627-AA-1223" }).lean();
  console.log("- Quotation PI-2627-AA-1223 Products:", q1.products.map(p => ({ productNo: p.productNo, name: p.name })));

  const prodOld1 = await Product.findOne({ productNo: "IV7000605" }).lean();
  console.log("- Stock IV7000605:", prodOld1.quantity);
  const prodNew1 = await Product.findOne({ productNo: "IV7000610" }).lean();
  console.log("- Stock IV7000610:", prodNew1.quantity);

  const ledger1 = await StockLedger.findOne({ piNo: "PI-2627-AA-1223" }).lean();
  console.log("- StockLedger PI-2627-AA-1223:", { productNo: ledger1.productNo, balanceAfter: ledger1.balanceAfter });

  console.log("\n2. PO 1420013259:");
  const po2 = await PurchaseOrder.findOne({ poNumber: "1420013259" }).lean();
  console.log("- Products:", po2.products.map(p => ({ productNo: p.productNo, name: p.name, brand: p.brand })));

  const q2 = await Quotation.findOne({ poNumber: "1420013259" }).lean();
  console.log("- Quotation PI-2627-AA-901 Products:", q2.products.map(p => ({ productNo: p.productNo, name: p.name })));

  const prodOld2 = await Product.findOne({ productNo: "02.30.266.00" }).lean();
  console.log("- Stock 02.30.266.00:", prodOld2.quantity);
  const prodNew2 = await Product.findOne({ productNo: "R02.30.266.12" }).lean();
  console.log("- Stock R02.30.266.12:", prodNew2.quantity);

  const ledger2 = await StockLedger.findOne({ piNo: "PI-2627-AA-901" }).lean();
  console.log("- StockLedger PI-2627-AA-901:", { productNo: ledger2.productNo, balanceAfter: ledger2.balanceAfter });

  console.log("\n3. PO Q-2627-KG-218:");
  const po3 = await PurchaseOrder.findOne({ poNumber: "Q-2627-KG-218" }).lean();
  console.log("- PO vendorName:", po3.vendorName);

  const q3 = await Quotation.findOne({ poNumber: "Q-2627-KG-218" }).lean();
  console.log("- Quotation billTo.name:", q3.billTo.name);
  console.log("- Quotation shipTo.name:", q3.shipTo.name);

  const lead3 = await Lead.findOne({ leadNumber: "L-260521-AD-012" }).lean();
  console.log("- Lead name:", lead3.name);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
