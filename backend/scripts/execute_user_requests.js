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

async function connectWithRetry() {
  const options = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10,
  };
  for (let i = 0; i < 5; i++) {
    try {
      console.log(`Connecting to MongoDB (attempt ${i + 1})...`);
      await mongoose.connect(process.env.MONGO_URI, options);
      console.log("Connected successfully!");
      return;
    } catch (e) {
      console.log(`Connection attempt ${i + 1} failed: ${e.message}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error("Could not connect to MongoDB after 5 attempts");
}

async function execute() {
  await connectWithRetry();

  console.log("\n=========================================================================");
  console.log("TASK 1: Update PO 8000729746 QTY to 2 (and linked PI-2627-KA-1025)");
  console.log("=========================================================================");

  const po800 = await PurchaseOrder.findOne({ poNumber: /8000729746/i });
  if (!po800) {
    console.error("PO 8000729746 not found!");
  } else {
    console.log(`Found PO ${po800.poNumber}, current totalValue: ${po800.totalValue}`);
    po800.products.forEach(p => {
      p.quantity = 2;
      const taxable = p.quantity * p.unitPrice;
      const gst = taxable * ((p.gstRate || 18) / 100);
      p.total = taxable + gst;
    });
    po800.totalValue = po800.products.reduce((sum, p) => sum + p.total, 0);
    await po800.save();
    console.log(`Updated PO 8000729746 -> quantity: 2, totalValue: ${po800.totalValue}`);

    if (po800.pi) {
      const pi1025 = await Quotation.findById(po800.pi);
      if (pi1025) {
        let subTotalTaxable = 0;
        let subTotalGst = 0;
        pi1025.products.forEach(p => {
          p.quantity = 2;
          p.taxableAmount = p.quantity * p.unitPrice;
          p.gstAmount = p.taxableAmount * ((p.gstRate || 18) / 100);
          p.total = p.taxableAmount + p.gstAmount;
          subTotalTaxable += p.taxableAmount;
          subTotalGst += p.gstAmount;
        });
        pi1025.subTotal = subTotalTaxable;
        pi1025.gstTotal = subTotalGst;
        pi1025.grandTotal = Math.round(subTotalTaxable + subTotalGst);
        pi1025.roundOff = 0;
        await pi1025.save();
        console.log(`Updated PI ${pi1025.quotationNumber} -> grandTotal: ${pi1025.grandTotal}`);
      }
    }

    // StockLedger & Product stock update for 3445288
    const ledgerEntry = await StockLedger.findOne({ piNo: "PI-2627-KA-1025", productNo: "3445288" });
    if (ledgerEntry) {
      const oldQty = ledgerEntry.quantity;
      ledgerEntry.quantity = 2;
      await ledgerEntry.save();
      console.log(`Updated StockLedger entry for 3445288: quantity ${oldQty} -> 2`);
      
      const diff = 2 - oldQty;
      await Product.findOneAndUpdate({ productNo: "3445288" }, { $inc: { quantity: -diff } });
      console.log(`Adjusted Product 3445288 stock by -${diff}`);
    }
  }

  console.log("\n=========================================================================");
  console.log("TASK 2: Delete 0-value item from PO 6130092808 & PI-2627-KA-917");
  console.log("=========================================================================");

  const po613 = await PurchaseOrder.findOne({ poNumber: /6130092808/i });
  if (!po613) {
    console.error("PO 6130092808 not found!");
  } else {
    console.log(`PO 6130092808 before: ${po613.products.length} products, status: "${po613.status}"`);
    
    // Filter out 0 value item
    po613.products = po613.products.filter(p => p.unitPrice > 0 && p.productNo !== "353002");
    
    // Calculate totals
    const calcSubtotal = po613.products.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
    const calcTotal = po613.products.reduce((sum, p) => sum + p.total, 0);
    po613.totalValue = calcTotal;
    
    // Since all remaining 6 items have movedToInvoice: true, status is Processed
    po613.status = "Processed";
    await po613.save();
    console.log(`Updated PO 6130092808: ${po613.products.length} line items, subtotal: ${calcSubtotal}, totalValue: ${calcTotal}, status: "${po613.status}"`);

    // Update linked PI
    if (po613.pi) {
      const pi917 = await Quotation.findById(po613.pi);
      if (pi917) {
        pi917.products = pi917.products.filter(p => p.unitPrice > 0 && p.productNo !== "353002");
        let subTotalTaxable = 0;
        let subTotalGst = 0;
        pi917.products.forEach(p => {
          subTotalTaxable += p.taxableAmount;
          subTotalGst += p.gstAmount;
        });
        pi917.subTotal = subTotalTaxable;
        pi917.gstTotal = subTotalGst;
        pi917.grandTotal = Math.round(subTotalTaxable + subTotalGst);
        pi917.roundOff = Math.round((subTotalTaxable + subTotalGst) * 100) / 100 - (subTotalTaxable + subTotalGst);
        await pi917.save();
        console.log(`Updated PI ${pi917.quotationNumber}: ${pi917.products.length} items, subTotal: ${pi917.subTotal}, grandTotal: ${pi917.grandTotal}`);
      }
    }

    // Revert StockLedger & Product 353002 stock
    const delLedger = await StockLedger.deleteOne({ piNo: "PI-2627-KA-917", productNo: "353002" });
    console.log(`Deleted StockLedger entry for 353002 on PI-2627-KA-917: ${delLedger.deletedCount}`);
    await Product.findOneAndUpdate({ productNo: "353002" }, { $inc: { quantity: 6 } });
    console.log("Restored 6 units to Product 353002 stock");
  }

  console.log("\n=========================================================================");
  console.log("TASK 3: Merge Product 5PR-HDL into 5-HDL-L");
  console.log("=========================================================================");

  const prod5pr = await Product.findOne({ productNo: "5PR-HDL" });
  const prod5hdl = await Product.findOne({ productNo: "5-HDL-L" });

  if (!prod5hdl) {
    console.error("Canonical product 5-HDL-L not found!");
  } else if (!prod5pr) {
    console.log("Product 5PR-HDL already merged or not found in Product collection.");
  } else {
    console.log(`Found 5-HDL-L (Qty: ${prod5hdl.quantity}) and 5PR-HDL (Qty: ${prod5pr.quantity})`);

    // 1. Update Quotations
    const qUpdates = await Quotation.updateMany(
      { "products.product": prod5pr._id },
      { 
        $set: { 
          "products.$[elem].product": prod5hdl._id,
          "products.$[elem].productNo": prod5hdl.productNo,
          "products.$[elem].name": prod5hdl.name,
          "products.$[elem].brand": prod5hdl.brand || "T&S"
        } 
      },
      { arrayFilters: [{ "elem.product": prod5pr._id }] }
    );
    console.log(`Updated Quotations with 5-HDL-L: matched ${qUpdates.matchedCount}, modified ${qUpdates.modifiedCount}`);

    // Also update by productNo string if any
    const qUpdatesStr = await Quotation.updateMany(
      { "products.productNo": "5PR-HDL" },
      { 
        $set: { 
          "products.$[elem].product": prod5hdl._id,
          "products.$[elem].productNo": prod5hdl.productNo,
          "products.$[elem].name": prod5hdl.name,
          "products.$[elem].brand": prod5hdl.brand || "T&S"
        } 
      },
      { arrayFilters: [{ "elem.productNo": "5PR-HDL" }] }
    );
    console.log(`Updated Quotations by productNo 5PR-HDL: matched ${qUpdatesStr.matchedCount}, modified ${qUpdatesStr.modifiedCount}`);

    // 2. Update Purchase Orders
    const poUpdates = await PurchaseOrder.updateMany(
      { "products.product": prod5pr._id },
      { 
        $set: { 
          "products.$[elem].product": prod5hdl._id,
          "products.$[elem].productNo": prod5hdl.productNo,
          "products.$[elem].name": prod5hdl.name,
          "products.$[elem].brand": prod5hdl.brand || "T&S"
        } 
      },
      { arrayFilters: [{ "elem.product": prod5pr._id }] }
    );
    console.log(`Updated PurchaseOrders with 5-HDL-L: matched ${poUpdates.matchedCount}, modified ${poUpdates.modifiedCount}`);

    const poUpdatesStr = await PurchaseOrder.updateMany(
      { "products.productNo": "5PR-HDL" },
      { 
        $set: { 
          "products.$[elem].product": prod5hdl._id,
          "products.$[elem].productNo": prod5hdl.productNo,
          "products.$[elem].name": prod5hdl.name,
          "products.$[elem].brand": prod5hdl.brand || "T&S"
        } 
      },
      { arrayFilters: [{ "elem.productNo": "5PR-HDL" }] }
    );
    console.log(`Updated PurchaseOrders by productNo 5PR-HDL: matched ${poUpdatesStr.matchedCount}, modified ${poUpdatesStr.modifiedCount}`);

    // 3. Update StockLedger entries
    const ledgerUpdates = await StockLedger.updateMany(
      { $or: [{ product: prod5pr._id }, { productNo: "5PR-HDL" }] },
      {
        $set: {
          product: prod5hdl._id,
          productNo: prod5hdl.productNo,
          brand: prod5hdl.brand || "T&S"
        }
      }
    );
    console.log(`Updated StockLedger entries to 5-HDL-L: matched ${ledgerUpdates.matchedCount}, modified ${ledgerUpdates.modifiedCount}`);

    // 4. Merge Stock in Product Master
    prod5hdl.quantity = (prod5hdl.quantity || 0) + (prod5pr.quantity || 0);
    await prod5hdl.save();
    console.log(`Updated 5-HDL-L stock to ${prod5hdl.quantity}`);

    // 5. Delete 5PR-HDL from Product master
    const delProd = await Product.deleteOne({ _id: prod5pr._id });
    console.log(`Deleted 5PR-HDL duplicate product from Product Master: ${delProd.deletedCount}`);
  }

  console.log("\n=========================================================================");
  console.log("ALL REQUESTED UPDATES EXECUTED SUCCESSFULLY!");
  console.log("=========================================================================");

  process.exit(0);
}

execute().catch(e => {
  console.error("Execution failed:", e);
  process.exit(1);
});
