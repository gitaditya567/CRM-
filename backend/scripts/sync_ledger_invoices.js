const mongoose = require("mongoose");
require("dotenv").config();

const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");
const StockLedger = require("../models/StockLedger");

async function syncLedgerInvoices() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const pos = await PurchaseOrder.find({
      type: "inward",
      "invoiceHistory.0": { $exists: true }
    }).populate("pi").lean();

    console.log(`Found ${pos.length} inward POs with invoices to sync.`);

    let updatedCount = 0;
    for (const po of pos) {
      const piNumber = po.pi?.quotationNumber || "";
      
      for (const inv of po.invoiceHistory) {
        if (!inv.invoiceNo) continue;

        const invProducts = (inv.products && inv.products.length > 0) ? inv.products : po.products;
        for (const item of invProducts) {
          const conditions = [];
          if (item.product) conditions.push({ product: item.product });
          if (item.productNo) conditions.push({ productNo: item.productNo });

          if (conditions.length === 0) continue;

          const ledgerQuery = {
            $or: conditions,
            entryType: "OUT",
            $or: [
              { invoiceNo: "" },
              { invoiceNo: null },
              { invoiceNo: { $exists: false } }
            ]
          };

          const refConditions = [];
          if (po.poNumber) refConditions.push({ poNo: po.poNumber });
          if (piNumber) refConditions.push({ piNo: piNumber });

          if (refConditions.length > 0) {
            const res = await StockLedger.updateMany(
              {
                $and: [
                  { $or: conditions },
                  { entryType: "OUT" },
                  { $or: refConditions }
                ]
              },
              { $set: { invoiceNo: inv.invoiceNo } }
            );
            if (res.modifiedCount > 0) {
              console.log(`Updated ${res.modifiedCount} ledger entries for ${item.productNo} with invoiceNo: ${inv.invoiceNo} (PI: ${piNumber}, PO: ${po.poNumber})`);
              updatedCount += res.modifiedCount;
            }
          }
        }
      }
    }

    console.log(`Sync completed! Total ledger entries updated with Invoice No: ${updatedCount}`);
    process.exit(0);
  } catch (err) {
    console.error("Error syncing ledger invoices:", err);
    process.exit(1);
  }
}

syncLedgerInvoices();
