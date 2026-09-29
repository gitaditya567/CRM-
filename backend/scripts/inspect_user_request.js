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
  console.log("Connected to DB:", mongoUri);

  const searchTerms = [
    "Q-2627-AA-1223",
    "IV7000605",
    "IV7000610",
    "1420013259",
    "02.30.266.00",
    "R02.30.266.12",
    "Culinexis",
    "Enoki",
    "GEN-054",
    "Q-2627-KG-218"
  ];

  console.log("\n--- QUOTATIONS ---");
  for (const term of searchTerms) {
    const quotes = await Quotation.find({
      $or: [
        { quotationNumber: new RegExp(term, "i") },
        { poNumber: new RegExp(term, "i") },
        { "billTo.name": new RegExp(term, "i") },
        { "billTo.address": new RegExp(term, "i") },
        { "shipTo.name": new RegExp(term, "i") },
        { "shipTo.address": new RegExp(term, "i") },
        { "products.productNo": new RegExp(term, "i") },
        { "products.name": new RegExp(term, "i") }
      ]
    }).populate("lead").lean();
    if (quotes.length > 0) {
      console.log(`Found ${quotes.length} Quotations matching "${term}":`);
      for (const q of quotes) {
        console.log({
          id: q._id,
          quotationNumber: q.quotationNumber,
          poNumber: q.poNumber,
          lead: q.lead ? { id: q.lead._id, name: q.lead.name, leadNumber: q.lead.leadNumber } : null,
          billTo: q.billTo,
          shipTo: q.shipTo,
          productsCount: q.products.length,
          products: q.products.map(p => ({ productNo: p.productNo, name: p.name, quantity: p.quantity, unitPrice: p.unitPrice, brand: p.brand }))
        });
      }
    }
  }

  console.log("\n--- PURCHASE ORDERS ---");
  for (const term of searchTerms) {
    const pos = await PurchaseOrder.find({
      $or: [
        { poNumber: new RegExp(term, "i") },
        { vendorName: new RegExp(term, "i") },
        { leadNumber: new RegExp(term, "i") },
        { "products.productNo": new RegExp(term, "i") },
        { "products.name": new RegExp(term, "i") }
      ]
    }).lean();
    if (pos.length > 0) {
      console.log(`Found ${pos.length} POs matching "${term}":`);
      for (const po of pos) {
        console.log({
          id: po._id,
          poNumber: po.poNumber,
          vendorName: po.vendorName,
          leadNumber: po.leadNumber,
          type: po.type,
          status: po.status,
          products: po.products.map(p => ({ productNo: p.productNo, name: p.name, quantity: p.quantity, unitPrice: p.unitPrice }))
        });
      }
    }
  }

  console.log("\n--- LEADS ---");
  for (const term of searchTerms) {
    const leads = await Lead.find({
      $or: [
        { leadNumber: new RegExp(term, "i") },
        { name: new RegExp(term, "i") },
        { notes: new RegExp(term, "i") }
      ]
    }).lean();
    if (leads.length > 0) {
      console.log(`Found ${leads.length} Leads matching "${term}":`);
      for (const l of leads) {
        console.log({
          id: l._id,
          leadNumber: l.leadNumber,
          name: l.name,
          phone: l.phone,
          status: l.status
        });
      }
    }
  }

  console.log("\n--- PRODUCTS ---");
  for (const term of searchTerms) {
    const prods = await Product.find({
      $or: [
        { productNo: new RegExp(term, "i") },
        { name: new RegExp(term, "i") }
      ]
    }).lean();
    if (prods.length > 0) {
      console.log(`Found ${prods.length} Products matching "${term}":`);
      for (const p of prods) {
        console.log({
          id: p._id,
          productNo: p.productNo,
          name: p.name,
          quantity: p.quantity,
          brand: p.brand
        });
      }
    }
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
