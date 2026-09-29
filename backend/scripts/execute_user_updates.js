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
  console.log("Connected to MongoDB for update script execution.");

  // ==========================================
  // CHANGE 1: PO Q-2627-AA-1223 & PI-2627-AA-1223
  // Change product IV7000605 -> IV7000610
  // ==========================================
  console.log("\n--- Executing Change 1: IV7000605 to IV7000610 on Q-2627-AA-1223 ---");
  const prodOld1 = await Product.findOne({ productNo: "IV7000605" });
  const prodNew1 = await Product.findOne({ productNo: "IV7000610" });

  if (!prodOld1 || !prodNew1) {
    throw new Error("Could not find products IV7000605 or IV7000610");
  }

  // Update Quotation PI-2627-AA-1223
  const quote1 = await Quotation.findOne({ quotationNumber: "PI-2627-AA-1223" });
  if (quote1) {
    let updatedInQuote = false;
    quote1.products.forEach(p => {
      if (p.productNo === "IV7000605") {
        p.product = prodNew1._id;
        p.productNo = prodNew1.productNo;
        p.name = prodNew1.name;
        p.description = prodNew1.name;
        p.brand = prodNew1.brand;
        if (prodNew1.hsnCode) p.hsnCode = prodNew1.hsnCode;
        updatedInQuote = true;
      }
    });
    if (updatedInQuote) {
      await quote1.save();
      console.log("Updated Quotation PI-2627-AA-1223 successfully.");
    }
  }

  // Update PO Q-2627-AA-1223
  const po1 = await PurchaseOrder.findOne({ poNumber: "Q-2627-AA-1223" });
  if (po1) {
    let updatedInPO = false;
    po1.products.forEach(p => {
      if (p.productNo === "IV7000605") {
        p.product = prodNew1._id;
        p.productNo = prodNew1.productNo;
        p.name = prodNew1.name;
        p.brand = prodNew1.brand;
        if (prodNew1.hsnCode) p.hsnCode = prodNew1.hsnCode;
        if (prodNew1.type) p.type = prodNew1.type;
        updatedInPO = true;
      }
    });
    if (updatedInPO) {
      await po1.save();
      console.log("Updated PO Q-2627-AA-1223 successfully.");
    }
  }

  // Update StockLedger entry for IV7000605 -> IV7000610 (for PI-2627-AA-1223)
  const ledger1 = await StockLedger.findOne({ piNo: "PI-2627-AA-1223", productNo: "IV7000605" });
  if (ledger1) {
    ledger1.product = prodNew1._id;
    ledger1.productNo = prodNew1.productNo;
    ledger1.brand = prodNew1.brand;
    ledger1.balanceAfter = prodNew1.quantity - ledger1.quantity;
    await ledger1.save();
    console.log("Updated StockLedger entry 1 successfully.");
  }

  // Restore 1 stock to IV7000605, subtract 1 stock from IV7000610
  prodOld1.quantity = prodOld1.quantity + 1; // -1 + 1 = 0
  await prodOld1.save();
  console.log(`Restored IV7000605 stock to: ${prodOld1.quantity}`);

  prodNew1.quantity = prodNew1.quantity - 1; // 2 - 1 = 1
  await prodNew1.save();
  console.log(`Deducted IV7000610 stock to: ${prodNew1.quantity}`);


  // ==========================================
  // CHANGE 2: PO 1420013259 & PI-2627-AA-901
  // Change product 02.30.266.00 -> R02.30.266.12
  // ==========================================
  console.log("\n--- Executing Change 2: 02.30.266.00 to R02.30.266.12 on PO 1420013259 ---");
  const prodOld2 = await Product.findOne({ productNo: "02.30.266.00" });
  const prodNew2 = await Product.findOne({ productNo: "R02.30.266.12" });

  if (!prodOld2 || !prodNew2) {
    throw new Error("Could not find products 02.30.266.00 or R02.30.266.12");
  }

  // Update Quotation PI-2627-AA-901
  const quote2 = await Quotation.findOne({ poNumber: "1420013259" });
  if (quote2) {
    let updatedInQuote = false;
    quote2.products.forEach(p => {
      if (p.productNo === "02.30.266.00") {
        p.product = prodNew2._id;
        p.productNo = prodNew2.productNo;
        p.name = prodNew2.name;
        p.description = prodNew2.name;
        p.brand = prodNew2.brand;
        if (prodNew2.hsnCode) p.hsnCode = prodNew2.hsnCode;
        updatedInQuote = true;
      }
    });
    if (updatedInQuote) {
      await quote2.save();
      console.log("Updated Quotation PI-2627-AA-901 (poNumber 1420013259) successfully.");
    }
  }

  // Update PO 1420013259
  const po2 = await PurchaseOrder.findOne({ poNumber: "1420013259" });
  if (po2) {
    let updatedInPO = false;
    po2.products.forEach(p => {
      if (p.productNo === "02.30.266.00") {
        p.product = prodNew2._id;
        p.productNo = prodNew2.productNo;
        p.name = prodNew2.name;
        p.brand = prodNew2.brand;
        if (prodNew2.hsnCode) p.hsnCode = prodNew2.hsnCode;
        if (prodNew2.type) p.type = prodNew2.type;
        updatedInPO = true;
      }
    });
    if (updatedInPO) {
      await po2.save();
      console.log("Updated PO 1420013259 successfully.");
    }
  }

  // Update StockLedger entry for 02.30.266.00 -> R02.30.266.12 (for PI-2627-AA-901)
  const ledger2 = await StockLedger.findOne({ piNo: "PI-2627-AA-901", productNo: "02.30.266.00" });
  if (ledger2) {
    ledger2.product = prodNew2._id;
    ledger2.productNo = prodNew2.productNo;
    ledger2.brand = prodNew2.brand;
    ledger2.balanceAfter = prodNew2.quantity - ledger2.quantity;
    await ledger2.save();
    console.log("Updated StockLedger entry 2 successfully.");
  }

  // Restore 10 stock to 02.30.266.00, subtract 10 stock from R02.30.266.12
  prodOld2.quantity = prodOld2.quantity + 10; // -10 + 10 = 0
  await prodOld2.save();
  console.log(`Restored 02.30.266.00 stock to: ${prodOld2.quantity}`);

  prodNew2.quantity = prodNew2.quantity - 10; // 0 - 10 = -10
  await prodNew2.save();
  console.log(`Deducted R02.30.266.12 stock to: ${prodNew2.quantity}`);


  // ==========================================
  // CHANGE 3: Update Client Name for Q-2627-KG-218
  // Enoki Hospitality Private Limited, Gurugram, Haryana -> Culinexis Food Service Private Limited, Gurugram, Haryana
  // ==========================================
  console.log("\n--- Executing Change 3: Client Name Update for Q-2627-KG-218 ---");
  const oldClientName = "Enoki Hospitality Private Limited, Gurugram, Haryana";
  const newClientName = "Culinexis Food Service Private Limited, Gurugram, Haryana";

  // Update PO Q-2627-KG-218
  const po3 = await PurchaseOrder.findOne({ poNumber: "Q-2627-KG-218" });
  if (po3) {
    po3.vendorName = newClientName;
    await po3.save();
    console.log("Updated PO Q-2627-KG-218 vendorName successfully.");
  }

  // Update Quotation PI-2627-KG-218
  const quote3 = await Quotation.findOne({ poNumber: "Q-2627-KG-218" });
  if (quote3) {
    if (quote3.billTo) quote3.billTo.name = newClientName;
    if (quote3.shipTo) quote3.shipTo.name = newClientName;
    await quote3.save();
    console.log("Updated Quotation PI-2627-KG-218 billTo & shipTo successfully.");
  }

  // Update Lead L-260521-AD-012
  const lead3 = await Lead.findOne({ leadNumber: "L-260521-AD-012" });
  if (lead3) {
    lead3.name = newClientName;
    await lead3.save();
    console.log("Updated Lead L-260521-AD-012 name successfully.");
  }

  // Also check if any other record mentions Enoki Hospitality
  const allPosWithEnoki = await PurchaseOrder.find({ vendorName: new RegExp(oldClientName, "i") });
  for (const p of allPosWithEnoki) {
    p.vendorName = newClientName;
    await p.save();
    console.log(`Updated PO ${p.poNumber} vendorName to ${newClientName}`);
  }

  const allQuotesWithEnoki = await Quotation.find({
    $or: [{ "billTo.name": new RegExp(oldClientName, "i") }, { "shipTo.name": new RegExp(oldClientName, "i") }]
  });
  for (const q of allQuotesWithEnoki) {
    if (q.billTo && q.billTo.name.includes("Enoki")) q.billTo.name = newClientName;
    if (q.shipTo && q.shipTo.name.includes("Enoki")) q.shipTo.name = newClientName;
    await q.save();
    console.log(`Updated Quotation ${q.quotationNumber} client name to ${newClientName}`);
  }

  const allLeadsWithEnoki = await Lead.find({ name: new RegExp(oldClientName, "i") });
  for (const l of allLeadsWithEnoki) {
    l.name = newClientName;
    await l.save();
    console.log(`Updated Lead ${l.leadNumber} name to ${newClientName}`);
  }

  console.log("\nAll requested updates executed successfully!");
  process.exit(0);
}

run().catch(err => {
  console.error("Error executing user updates:", err);
  process.exit(1);
});
