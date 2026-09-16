const dns = require('dns');
try {
    dns.setDefaultResultOrder('ipv4first');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const StockLedger = require('../models/StockLedger');

async function verify() {
  const options = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10,
  };
  await mongoose.connect(process.env.MONGO_URI, options);
  console.log("Connected to MongoDB for Verification.");

  console.log("\n--- VERIFYING TASK 1: PO 8000729746 ---");
  const po800 = await PurchaseOrder.findOne({ poNumber: /8000729746/i }).lean();
  console.log("PO 8000729746:", {
    poNumber: po800.poNumber,
    totalValue: po800.totalValue,
    products: po800.products.map(p => ({ productNo: p.productNo, name: p.name, qty: p.quantity, price: p.unitPrice, total: p.total }))
  });

  const pi1025 = await Quotation.findById(po800.pi).lean();
  console.log("PI-2627-KA-1025:", {
    quotationNumber: pi1025.quotationNumber,
    subTotal: pi1025.subTotal,
    grandTotal: pi1025.grandTotal,
    products: pi1025.products.map(p => ({ productNo: p.productNo, qty: p.quantity, price: p.unitPrice, total: p.total }))
  });

  const p344 = await Product.findOne({ productNo: "3445288" }).lean();
  console.log("Product 3445288 Stock Qty:", p344.quantity);

  console.log("\n--- VERIFYING TASK 2: PO 6130092808 ---");
  const po613 = await PurchaseOrder.findOne({ poNumber: /6130092808/i }).lean();
  const subtotal613 = po613.products.reduce((s, p) => s + (p.quantity * p.unitPrice), 0);
  console.log("PO 6130092808:", {
    poNumber: po613.poNumber,
    status: po613.status,
    lineItemsCount: po613.products.length,
    subtotal: subtotal613,
    totalValue: po613.totalValue,
    products: po613.products.map(p => ({ productNo: p.productNo, name: p.name, qty: p.quantity, price: p.unitPrice, total: p.total }))
  });

  const pi917 = await Quotation.findById(po613.pi).lean();
  console.log("PI-2627-KA-917:", {
    quotationNumber: pi917.quotationNumber,
    lineItemsCount: pi917.products.length,
    subTotal: pi917.subTotal,
    grandTotal: pi917.grandTotal
  });

  const p353 = await Product.findOne({ productNo: "353002" }).lean();
  console.log("Product 353002 Stock Qty:", p353.quantity);

  console.log("\n--- VERIFYING TASK 3: Product Merge 5PR-HDL -> 5-HDL-L ---");
  const check5pr = await Product.findOne({ productNo: "5PR-HDL" });
  console.log("Product 5PR-HDL exists in Product master?", !!check5pr);

  const check5hdl = await Product.findOne({ productNo: "5-HDL-L" }).lean();
  console.log("Product 5-HDL-L in master:", {
    productNo: check5hdl.productNo,
    name: check5hdl.name,
    brand: check5hdl.brand,
    quantity: check5hdl.quantity
  });

  const pi398 = await Quotation.findOne({ quotationNumber: "PI-2627-AA-398" }).lean();
  console.log("PI-2627-AA-398 products:", pi398.products.map(p => ({ productNo: p.productNo, name: p.name, qty: p.quantity, price: p.unitPrice, total: p.total })));

  const po247 = await PurchaseOrder.findOne({ poNumber: "2608000247" }).lean();
  console.log("PO 2608000247 products:", po247.products.map(p => ({ productNo: p.productNo, name: p.name, qty: p.quantity, price: p.unitPrice, total: p.total })));

  const ledger5pr = await StockLedger.countDocuments({ productNo: "5PR-HDL" });
  console.log("StockLedger entries with 5PR-HDL:", ledger5pr);

  const ledger5hdl = await StockLedger.find({ productNo: "5-HDL-L" }).lean();
  console.log("StockLedger entries with 5-HDL-L:", ledger5hdl.map(l => ({ entryType: l.entryType, qty: l.quantity, piNo: l.piNo })));

  process.exit(0);
}

verify().catch(e => {
  console.error("Verification failed:", e);
  process.exit(1);
});
