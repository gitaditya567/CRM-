const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");

const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");
const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const pos = await PurchaseOrder.find({
    $or: [
      { poNumber: /1067/i },
      { "products.productNo": "29903" }
    ]
  });
  console.log("=== Matching POs ===");
  pos.forEach(p => {
    console.log({
      id: p._id,
      poNumber: p.poNumber,
      status: p.status,
      totalValue: p.totalValue,
      products: p.products.map(pr => ({ productNo: pr.productNo, name: pr.name, qty: pr.quantity, invoiced: pr.invoicedQuantity, price: pr.unitPrice, total: pr.total }))
    });
  });

  const quotes = await Quotation.find({
    $or: [
      { quotationNumber: /1067/i },
      { poNumber: /1067/i },
      { "products.productNo": "29903" }
    ]
  });
  console.log("=== Matching Quotations ===");
  quotes.forEach(q => {
    console.log({
      id: q._id,
      quotationNumber: q.quotationNumber,
      poNumber: q.poNumber,
      status: q.status,
      grandTotal: q.grandTotal,
      products: q.products.map(pr => ({ productNo: pr.productNo, name: pr.name, qty: pr.quantity, price: pr.unitPrice, total: pr.total }))
    });
  });

  const prod29903 = await Product.findOne({ productNo: "29903" });
  console.log("=== Product 29903 ===", {
    id: prod29903?._id,
    productNo: prod29903?.productNo,
    name: prod29903?.name,
    qty: prod29903?.quantity
  });

  const ledgers = await StockLedger.find({
    $or: [
      { productNo: "29903" },
      { piNo: /1067/i },
      { poNo: /1067/i },
      { remarks: /1067/i }
    ]
  });
  console.log("=== Matching StockLedgers ===");
  ledgers.forEach(l => {
    console.log({
      id: l._id,
      productNo: l.productNo,
      entryType: l.entryType,
      qty: l.quantity,
      piNo: l.piNo,
      poNo: l.poNo,
      balanceAfter: l.balanceAfter,
      remarks: l.remarks
    });
  });

  process.exit(0);
}

check();
