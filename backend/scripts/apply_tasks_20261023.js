// 2026-10-23 data tasks
// 1. Merge duplicate product " PD.249HC-4" (leading space, NAYATI, unused) into "PD.249HC-4" (Nayati) — keep the 2nd
// 2. PO 2608000247 (PI-2627-AA-398): activate item 5HR-HDL (Qty 4 @ ₹2,760) — selected + moved to invoice, stock OUT 4
// 3. PO Q-2627-AD-916: move back to Quotation Q-2627-AD-916 with stock correction (delete PO, stock IN, PI → quotation, lead status)
// A JSON backup of every touched document is written next to this script first.
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const Product = require("../models/Product");
const Quotation = require("../models/Quotation");
const PurchaseOrder = require("../models/PurchaseOrder");
const StockLedger = require("../models/StockLedger");
const Lead = require("../models/Lead");

const isEmpty = (v) => v === null || v === undefined || v === "" || v === 0;

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const session = await mongoose.startSession();
    try {
        // ---------- Load + backup ----------
        const keepProd = await Product.findOne({ productNo: "PD.249HC-4" }).lean();
        const dupProd = await Product.findOne({ productNo: " PD.249HC-4" }).lean();
        const po2 = await PurchaseOrder.findOne({ poNumber: "2608000247" }).lean();
        const hdlProd = await Product.findOne({ productNo: "5HR-HDL" }).lean();
        const po3 = await PurchaseOrder.findOne({ poNumber: "Q-2627-AD-916", type: "inward" }).lean();
        const pi3 = po3 ? await Quotation.findById(po3.pi).lean() : null;
        const lead3 = pi3?.lead ? await Lead.findById(pi3.lead).lean() : null;

        const backupFile = path.join(__dirname, `backup_tasks_20261023_${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify({ keepProd, dupProd, po2, hdlProd, po3, pi3, lead3 }, null, 2));
        console.log(`Backup written: ${backupFile}\n`);

        // ---------- 1. Merge duplicate product ----------
        console.log("1) Merge \" PD.249HC-4\" → \"PD.249HC-4\"");
        if (!keepProd || !dupProd) {
            console.log("   SKIPPED: one of the products not found");
        } else {
            const refs = await Promise.all([
                Quotation.countDocuments({ "products.product": dupProd._id }),
                PurchaseOrder.countDocuments({ "products.product": dupProd._id }),
                StockLedger.countDocuments({ product: dupProd._id })
            ]);
            if (refs.some(n => n > 0)) {
                console.log(`   SKIPPED: duplicate is referenced (quotes ${refs[0]}, POs ${refs[1]}, ledger ${refs[2]})`);
            } else {
                await session.withTransaction(async () => {
                    const fill = {};
                    ["priceUSD", "dealerPriceINR", "retailPriceINR", "description", "hsnCode"].forEach(k => {
                        if (isEmpty(keepProd[k]) && !isEmpty(dupProd[k])) fill[k] = dupProd[k];
                    });
                    const dupQty = Number(dupProd.quantity) || 0;
                    const update = { ...(Object.keys(fill).length ? { $set: fill } : {}), ...(dupQty ? { $inc: { quantity: dupQty } } : {}) };
                    if (Object.keys(update).length) await Product.updateOne({ _id: keepProd._id }, update, { session });
                    await Product.deleteOne({ _id: dupProd._id }, { session });
                    console.log(`   Kept ${keepProd.brand} ${keepProd.productNo} (stock ${keepProd.quantity + dupQty}) | filled ${JSON.stringify(fill)} | deleted duplicate (${dupProd.brand}, stock ${dupQty})`);
                });
            }
        }

        // ---------- 2. Activate 5HR-HDL on PO 2608000247 ----------
        console.log("\n2) PO 2608000247 — activate 5HR-HDL");
        const idx = po2 ? po2.products.findIndex(p => p.productNo === "5HR-HDL") : -1;
        if (!po2 || idx < 0 || !hdlProd) {
            console.log("   SKIPPED: PO, item or product not found");
        } else if (po2.products[idx].selected !== false) {
            console.log("   SKIPPED: item already selected");
        } else {
            const item = po2.products[idx];
            await session.withTransaction(async () => {
                await PurchaseOrder.updateOne({ _id: po2._id }, {
                    $set: { [`products.${idx}.selected`]: true, [`products.${idx}.movedToInvoice`]: true }
                }, { session });

                const prod = await Product.findById(hdlProd._id).session(session);
                const qty = Number(item.quantity) || 0;
                const before = prod.quantity || 0;
                prod.quantity = before - qty;
                await prod.save({ session });
                await new StockLedger({
                    product: prod._id, productNo: prod.productNo, brand: prod.brand, entryType: "OUT",
                    piNo: "PI-2627-AA-398", poNo: po2.poNumber, date: new Date(), quantity: qty,
                    unitPrice: item.unitPrice || 0, balanceAfter: prod.quantity,
                    remarks: `Item added back to Inward PO ${po2.poNumber} (Qty ${qty} @ ₹${item.unitPrice})`
                }).save({ session });
                console.log(`   5HR-HDL Qty ${qty} @ ₹${item.unitPrice} selected & ready to invoice | stock ${before} → ${prod.quantity}`);
            });
        }

        // ---------- 3. Q-2627-AD-916 → Quotation ----------
        console.log("\n3) Q-2627-AD-916 → Quotation");
        const activity = po3 && ((po3.invoiceHistory || []).length || (po3.dispatchHistory || []).length ||
            (po3.products || []).some(p => (p.invoicedQuantity || 0) > 0 || (p.dispatchedQuantity || 0) > 0));
        const quoteNo = pi3 ? pi3.quotationNumber.replace(/^PI-/i, "Q-") : "";
        const taken = quoteNo ? await Quotation.exists({ quotationNumber: quoteNo, _id: { $ne: pi3._id } }) : true;
        if (!po3 || !pi3) {
            console.log("   SKIPPED: PO or PI not found");
        } else if (activity) {
            console.log("   SKIPPED: PO has invoices / dispatches");
        } else if (taken) {
            console.log(`   SKIPPED: ${quoteNo} already used`);
        } else {
            await session.withTransaction(async () => {
                for (const p of po3.products || []) {
                    const qty = Number(p.quantity) || 0;
                    if (qty <= 0) continue;
                    let prod = p.product ? await Product.findById(p.product).session(session) : null;
                    if (!prod && p.productNo) prod = await Product.findOne({ productNo: p.productNo.trim() }).session(session);
                    if (!prod) { console.log(`   Product ${p.productNo} not found — stock not restored`); continue; }
                    const before = prod.quantity || 0;
                    prod.quantity = before + qty;
                    await prod.save({ session });
                    await new StockLedger({
                        product: prod._id, productNo: prod.productNo, brand: prod.brand, entryType: "IN",
                        piNo: pi3.quotationNumber, poNo: po3.poNumber, date: new Date(), quantity: qty,
                        unitPrice: p.unitPrice || 0, balanceAfter: prod.quantity,
                        remarks: `Stock restored: Inward PO ${po3.poNumber} reverted back to Quotation ${quoteNo}`
                    }).save({ session });
                    console.log(`   Stock ${prod.productNo}: ${before} → ${prod.quantity}`);
                }
                await Quotation.updateOne({ _id: pi3._id }, {
                    $set: { quotationNumber: quoteNo, status: "Sent", poNumber: "", poDate: null, poComment: "", isConvertedToPO: false }
                }, { session });
                console.log(`   ${pi3.quotationNumber} → ${quoteNo} (status Sent, PO no/date cleared)`);
                await PurchaseOrder.deleteOne({ _id: po3._id }, { session });
                console.log(`   Inward PO ${po3.poNumber} deleted`);
                if (lead3) {
                    const otherPIs = await Quotation.countDocuments({ lead: lead3._id, _id: { $ne: pi3._id }, quotationNumber: /^PI/i }).session(session);
                    if (otherPIs === 0) {
                        await Lead.updateOne({ _id: lead3._id }, { $set: { status: "Quotation Submitted" } }, { session });
                        console.log(`   Lead ${lead3.leadNumber}: ${lead3.status} → Quotation Submitted`);
                    } else {
                        console.log(`   Lead ${lead3.leadNumber} kept as ${lead3.status} (${otherPIs} other PI)`);
                    }
                }
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
