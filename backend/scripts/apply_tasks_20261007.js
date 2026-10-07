// 2026-10-07 data tasks
// 1. Merge duplicate product HBH-755CE into HBH755R-CE (HBH-755CE has no quotations / POs / ledger entries).
//    Missing fields on HBH755R-CE (e.g. priceUSD) are filled from HBH-755CE, then HBH-755CE is deleted.
// 2. NT2210GK: physical stock correction +1 (IN entry) so stock reads 0 — keeps the sale entry of PO DELRH0000041516.
// A JSON backup of touched documents is written next to this script first.
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const Product = require("../models/Product");
const Quotation = require("../models/Quotation");
const PurchaseOrder = require("../models/PurchaseOrder");
const StockLedger = require("../models/StockLedger");

const KEEP_CODE = "HBH755R-CE";
const DUP_CODE = "HBH-755CE";
const ADJUST_CODE = "NT2210GK";

const isEmpty = (v) => v === null || v === undefined || v === "" || v === 0;

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const session = await mongoose.startSession();
    try {
        const keep = await Product.findOne({ productNo: KEEP_CODE }).lean();
        const dup = await Product.findOne({ productNo: DUP_CODE }).lean();
        const adjust = await Product.findOne({ productNo: ADJUST_CODE }).lean();

        const backupFile = path.join(__dirname, `backup_tasks_20261007_${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify({ keep, dup, adjust }, null, 2));
        console.log(`Backup written: ${backupFile}\n`);

        // ---------- 1. Merge products ----------
        console.log(`1) Merge ${DUP_CODE} → ${KEEP_CODE}`);
        if (!keep || !dup) {
            console.log("   SKIPPED: one of the products not found");
        } else {
            const refs = await Promise.all([
                Quotation.countDocuments({ $or: [{ "products.productNo": DUP_CODE }, { "products.product": dup._id }] }),
                PurchaseOrder.countDocuments({ $or: [{ "products.productNo": DUP_CODE }, { "products.product": dup._id }, { "invoiceHistory.products.productNo": DUP_CODE }, { "dispatchHistory.products.productNo": DUP_CODE }] }),
                StockLedger.countDocuments({ $or: [{ productNo: DUP_CODE }, { product: dup._id }] })
            ]);
            if (refs.some(n => n > 0)) {
                console.log(`   SKIPPED: ${DUP_CODE} is now referenced (quotations ${refs[0]}, POs ${refs[1]}, ledger ${refs[2]}) — needs a full re-point`);
            } else {
                await session.withTransaction(async () => {
                    const fill = {};
                    ["priceUSD", "dealerPriceINR", "retailPriceINR", "description"].forEach(k => {
                        if (isEmpty(keep[k]) && !isEmpty(dup[k])) fill[k] = dup[k];
                    });
                    const dupQty = Number(dup.quantity) || 0;
                    const update = { ...(Object.keys(fill).length ? { $set: fill } : {}), ...(dupQty ? { $inc: { quantity: dupQty } } : {}) };
                    if (Object.keys(update).length) await Product.updateOne({ _id: keep._id }, update, { session });
                    await Product.deleteOne({ _id: dup._id }, { session });
                    console.log(`   Filled on ${KEEP_CODE}: ${JSON.stringify(fill)} | stock added from duplicate: ${dupQty}`);
                    console.log(`   Deleted ${DUP_CODE}`);
                });
            }
        }

        // ---------- 2. NT2210GK stock correction ----------
        console.log(`\n2) ${ADJUST_CODE} stock correction`);
        if (!adjust) {
            console.log("   SKIPPED: product not found");
        } else if ((adjust.quantity || 0) >= 0) {
            console.log(`   SKIPPED: stock already ${adjust.quantity}`);
        } else {
            await session.withTransaction(async () => {
                const prod = await Product.findById(adjust._id).session(session);
                const qty = -(prod.quantity || 0);
                const before = prod.quantity;
                prod.quantity = 0;
                await prod.save({ session });
                await new StockLedger({
                    product: prod._id, productNo: prod.productNo, brand: prod.brand, entryType: "IN",
                    date: new Date(), quantity: qty, unitPrice: 0, balanceAfter: 0,
                    remarks: "Physical stock correction — stock set to 0 (sale of PO DELRH0000041516 kept)"
                }).save({ session });
                console.log(`   Stock ${before} → 0 (IN ${qty} adjustment entry added)`);
            });
        }

        console.log("\n✅ Done");
    } catch (err) {
        console.error("❌ Failed (current task rolled back):", err.message);
        process.exitCode = 1;
    } finally {
        await session.endSession();
        await mongoose.disconnect();
    }
};

run();
