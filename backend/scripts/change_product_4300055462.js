const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");
const Product = require("../models/Product");

async function changeProductCode() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const poNumberStr = "4300055462";
    const oldProductNo = "34790L";
    const newProductNo = "34791L";

    // 1. Fetch new product details from Product collection
    const newProductDoc = await Product.findOne({ productNo: new RegExp(`^${newProductNo}$`, "i") });
    if (!newProductDoc) {
      console.error(`Product ${newProductNo} not found in database!`);
      process.exit(1);
    }
    console.log(`Found New Product: ${newProductDoc.name} (${newProductDoc.productNo}) ID: ${newProductDoc._id}`);

    // 2. Fetch PO 4300055462
    const po = await PurchaseOrder.findOne({ poNumber: new RegExp(`^${poNumberStr}$`, "i") });
    if (!po) {
      console.error(`PO ${poNumberStr} not found!`);
      process.exit(1);
    }

    console.log(`Found PO: ${po.poNumber}`);

    let poProductUpdated = false;
    po.products.forEach((p) => {
      if (p.productNo && p.productNo.toUpperCase() === oldProductNo.toUpperCase()) {
        console.log(`Updating PO product entry from ${p.productNo} (${p.name}) to ${newProductDoc.productNo} (${newProductDoc.name})`);
        p.product = newProductDoc._id;
        p.productNo = newProductDoc.productNo;
        p.name = newProductDoc.name;
        if (newProductDoc.brand) p.brand = newProductDoc.brand;
        if (newProductDoc.hsnCode) p.hsnCode = newProductDoc.hsnCode;
        poProductUpdated = true;
      }
    });

    if (poProductUpdated) {
      await po.save();
      console.log(`PO ${po.poNumber} updated and saved successfully.`);
    } else {
      console.log(`Product ${oldProductNo} not found in PO ${po.poNumber} products.`);
    }

    // 3. Fetch linked PI / Quotation
    const piId = po.pi;
    if (piId) {
      const pi = await Quotation.findById(piId);
      if (pi) {
        let piProductUpdated = false;
        pi.products.forEach((p) => {
          if (p.productNo && p.productNo.toUpperCase() === oldProductNo.toUpperCase()) {
            console.log(`Updating PI product entry from ${p.productNo} (${p.name}) to ${newProductDoc.productNo} (${newProductDoc.name})`);
            p.product = newProductDoc._id;
            p.productNo = newProductDoc.productNo;
            p.name = newProductDoc.name;
            if (newProductDoc.brand) p.brand = newProductDoc.brand;
            if (newProductDoc.hsnCode) p.hsnCode = newProductDoc.hsnCode;
            piProductUpdated = true;
          }
        });

        if (piProductUpdated) {
          await pi.save();
          console.log(`Linked PI ${pi.quotationNumber} updated and saved successfully.`);
        }
      }
    }

    console.log("=== Verification of updated PO ===");
    const updatedPo = await PurchaseOrder.findOne({ poNumber: new RegExp(`^${poNumberStr}$`, "i") });
    console.log("Updated PO Products:", JSON.stringify(updatedPo.products, null, 2));

    process.exit(0);
  } catch (err) {
    console.error("Error changing product code:", err);
    process.exit(1);
  }
}

changeProductCode();
