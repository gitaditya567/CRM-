const mongoose = require("mongoose");
require("dotenv").config();

const PurchaseOrder = require("../models/PurchaseOrder");
const Product = require("../models/Product");

async function checkPOAndProduct() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const po = await PurchaseOrder.findOne({ poNumber: /IEC-3155\/26-27\(A\)/i });
    if (!po) {
      console.log("PO IEC-3155/26-27(A) not found!");
    } else {
      console.log("Found PO:", po.poNumber);
      console.log("PO Products:", JSON.stringify(po.products, null, 2));
    }

    let prod = await Product.findOne({ productNo: /SCSC98050106-00/i });
    if (!prod) {
      prod = await Product.findOne({ name: /ICE THICKNESS SENSOR/i });
    }

    if (prod) {
      console.log("Found Product:", prod.name, "| ProductNo:", prod.productNo, "| ID:", prod._id, "| Stock:", prod.quantity);
    } else {
      console.log("Product SCSC98050106-00 not found in database.");
    }

    process.exit(0);
  } catch (err) {
    console.error("Error checking PO & Product:", err);
    process.exit(1);
  }
}

checkPOAndProduct();
