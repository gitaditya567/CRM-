const mongoose = require("mongoose");
require("dotenv").config({ path: "./backend/.env" });

const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");
const Product = require("../models/Product");

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/crm");

  const pos = await PurchaseOrder.find({
    $or: [
      { poNumber: /0262/i },
      { leadNumber: /0262/i },
      { vendorName: /0262/i },
      { "invoiceHistory.invoiceNo": /0262/i }
    ]
  });
  console.log("=== POs matching 0262 ===");
  pos.forEach(p => {
    console.log({
      id: p._id,
      poNumber: p.poNumber,
      type: p.type,
      status: p.status,
      isMovedToInvoice: p.isMovedToInvoice,
      products: p.products.map(pr => ({ productNo: pr.productNo, name: pr.name, qty: pr.quantity, invoiced: pr.invoicedQuantity, dispatched: pr.dispatchedQuantity }))
    });
  });

  const quotes = await Quotation.find({
    $or: [
      { quotationNumber: /0262/i },
      { poNumber: /0262/i }
    ]
  });
  console.log("=== Quotations matching 0262 ===");
  quotes.forEach(q => {
    console.log({
      id: q._id,
      quotationNumber: q.quotationNumber,
      poNumber: q.poNumber,
      status: q.status,
      isConvertedToPO: q.isConvertedToPO,
      products: q.products.map(pr => ({ productNo: pr.productNo, name: pr.name, qty: pr.quantity }))
    });
  });

  const gs2006B = await Product.findOne({ productNo: /GS\.2006B/i });
  console.log("=== GS.2006B ===");
  console.log(gs2006B);

  process.exit(0);
}

run();
