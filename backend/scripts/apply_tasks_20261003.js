// 2026-10-03 data tasks
// 1. Merge duplicate client "The Oberoi, New Delhi": keep EIH-006, delete EIH-016
//    (+ 2 POs whose vendorName is EIH-016's legal name → "The Oberoi, New Delhi" so client contact lookup keeps working)
// 2. Inward PO "Q-2627-KA-954" (from PI-2627-KA-954) → back to Quotation Q-2627-KA-954
//    (delete PO, restore stock + IN ledger entry, PI → quotation, lead → Quotation Submitted)
// 3. PO 1730062452: unit price 2,99,950 → 2,52,375 (ex-GST) in PO and linked PI PI-2627-AA-419
// A JSON backup of every touched document is written next to this script first.
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const Client = require("../models/Client");
const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");
const Lead = require("../models/Lead");
const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");

const round2 = (n) => Math.round(n * 100) / 100;

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const session = await mongoose.startSession();
    try {
        // ---------- Load + backup ----------
        const keepClient = await Client.findOne({ clientId: "EIH-006" }).lean();
        const dupClient = await Client.findOne({ clientId: "EIH-016" }).lean();
        const dupLegalRx = dupClient ? new RegExp(`^${dupClient.legalEntityName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") : null;
        const dupNamePOs = dupLegalRx ? await PurchaseOrder.find({ vendorName: dupLegalRx }).select("poNumber vendorName").lean() : [];

        const kaPO = await PurchaseOrder.findOne({ poNumber: "Q-2627-KA-954", type: "inward" }).lean();
        const kaPI = kaPO ? await Quotation.findById(kaPO.pi).lean() : null;
        const kaLead = kaPI?.lead ? await Lead.findById(kaPI.lead).lean() : null;

        const pricePO = await PurchaseOrder.findOne({ poNumber: "1730062452" }).lean();
        const pricePI = pricePO?.pi ? await Quotation.findById(pricePO.pi).lean() : null;

        const backupFile = path.join(__dirname, `backup_tasks_20261003_${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify({ keepClient, dupClient, dupNamePOs, kaPO, kaPI, kaLead, pricePO, pricePI }, null, 2));
        console.log(`Backup written: ${backupFile}\n`);

        // ---------- 1. Merge clients ----------
        console.log("1) Merge clients");
        if (!keepClient || !dupClient) {
            console.log("   SKIPPED: EIH-006 or EIH-016 not found");
        } else if (keepClient.clientName !== dupClient.clientName || String(keepClient.group) !== String(dupClient.group)) {
            console.log("   SKIPPED: clients no longer share name/group — needs manual review");
        } else {
            await session.withTransaction(async () => {
                if (dupNamePOs.length) {
                    const r = await PurchaseOrder.updateMany({ _id: { $in: dupNamePOs.map(p => p._id) } }, { $set: { vendorName: keepClient.clientName } }, { session });
                    console.log(`   POs re-pointed to "${keepClient.clientName}": ${r.modifiedCount} (${dupNamePOs.map(p => p.poNumber).join(", ")})`);
                }
                await Client.deleteOne({ _id: dupClient._id }, { session });
                console.log(`   Deleted duplicate ${dupClient.clientId}; kept ${keepClient.clientId} (${keepClient.contactPerson1?.name})`);
            });
        }

        // ---------- 2. Q-2627-KA-954 back to Quotation ----------
        console.log("\n2) Q-2627-KA-954 → Quotation");
        const kaActivity = kaPO && ((kaPO.invoiceHistory || []).length || (kaPO.dispatchHistory || []).length ||
            (kaPO.products || []).some(p => (p.invoicedQuantity || 0) > 0 || (p.dispatchedQuantity || 0) > 0));
        const quoteNo = kaPI ? kaPI.quotationNumber.replace(/^PI-/i, "Q-") : "";
        const quoteNoTaken = quoteNo ? await Quotation.exists({ quotationNumber: quoteNo, _id: { $ne: kaPI._id } }) : true;
        if (!kaPO || !kaPI) {
            console.log("   SKIPPED: PO or linked PI not found");
        } else if (kaActivity) {
            console.log("   SKIPPED: PO has invoices / dispatches — needs manual review");
        } else if (quoteNoTaken) {
            console.log(`   SKIPPED: quotation number ${quoteNo} already used by another document`);
        } else {
            await session.withTransaction(async () => {
                for (const p of kaPO.products || []) {
                    const qty = Number(p.quantity) || 0;
                    if (qty <= 0) continue;
                    let prod = p.product ? await Product.findById(p.product).session(session) : null;
                    if (!prod && p.productNo) prod = await Product.findOne({ productNo: p.productNo }).session(session);
                    if (!prod) { console.log(`   Product ${p.productNo} not found — stock not restored`); continue; }
                    const before = prod.quantity || 0;
                    prod.quantity = before + qty;
                    await prod.save({ session });
                    await new StockLedger({
                        product: prod._id, productNo: prod.productNo, brand: prod.brand, entryType: "IN",
                        piNo: kaPI.quotationNumber, poNo: kaPO.poNumber, date: new Date(), quantity: qty,
                        unitPrice: p.unitPrice || 0, balanceAfter: prod.quantity,
                        remarks: `Stock restored: Inward PO ${kaPO.poNumber} reverted back to Quotation ${quoteNo}`
                    }).save({ session });
                    console.log(`   Stock ${prod.productNo}: ${before} → ${prod.quantity}`);
                }

                await Quotation.updateOne({ _id: kaPI._id }, {
                    $set: { quotationNumber: quoteNo, status: "Sent", poNumber: "", poDate: null, poComment: "", isConvertedToPO: false }
                }, { session });
                console.log(`   ${kaPI.quotationNumber} → ${quoteNo} (status Sent, PO no/date cleared)`);

                await PurchaseOrder.deleteOne({ _id: kaPO._id }, { session });
                console.log(`   Inward PO ${kaPO.poNumber} deleted`);

                if (kaLead) {
                    const otherPIs = await Quotation.countDocuments({ lead: kaLead._id, _id: { $ne: kaPI._id }, quotationNumber: /^PI/i }).session(session);
                    if (otherPIs === 0) {
                        await Lead.updateOne({ _id: kaLead._id }, { $set: { status: "Quotation Submitted" } }, { session });
                        console.log(`   Lead ${kaLead.leadNumber}: ${kaLead.status} → Quotation Submitted`);
                    } else {
                        console.log(`   Lead ${kaLead.leadNumber} kept as ${kaLead.status} (has ${otherPIs} other PI)`);
                    }
                }
            });
        }

        // ---------- 3. Price change PO 1730062452 ----------
        console.log("\n3) PO 1730062452 price");
        const NEW_UNIT_PRICE = 252375;
        if (!pricePO || !pricePI) {
            console.log("   SKIPPED: PO or linked PI not found");
        } else if ((pricePO.invoiceHistory || []).length || pricePO.products.length !== 1 || pricePI.products.length !== 1) {
            console.log("   SKIPPED: PO is invoiced or has more than one item — needs manual review");
        } else {
            await session.withTransaction(async () => {
                const pi = await Quotation.findById(pricePI._id).session(session);
                const item = pi.products[0];
                const qty = Number(item.quantity) || 1;
                const taxable = round2(qty * NEW_UNIT_PRICE);
                const gst = round2(taxable * (Number(item.gstRate) || 0) / 100);
                const lineTotal = round2(taxable + gst);
                const old = { unitPrice: item.unitPrice, grandTotal: pi.grandTotal };

                item.unitPrice = NEW_UNIT_PRICE;
                item.taxableAmount = taxable;
                item.gstAmount = gst;
                item.total = lineTotal;

                // Same formula as quotationController: charges + items, rounded grand total
                const ch = pi.additionalCharges || {};
                const chargesTaxable = ["installation", "freight", "insurance", "other"].reduce((s, k) => s + (Number(ch[k]) || 0), 0);
                const itemsTaxable = pi.products.reduce((s, p) => s + (Number(p.taxableAmount) || 0), 0);
                const itemsGst = pi.products.reduce((s, p) => s + (Number(p.gstAmount) || 0), 0);
                if (chargesTaxable !== 0) throw new Error("PI has additional charges — recalc manually");
                pi.subTotal = itemsTaxable;
                pi.gstTotal = itemsGst;
                pi.grandTotal = Math.round(itemsTaxable + itemsGst);
                pi.markModified("products");
                await pi.save({ session });

                await PurchaseOrder.updateOne({ _id: pricePO._id }, {
                    $set: {
                        "products.0.unitPrice": NEW_UNIT_PRICE,
                        "products.0.total": lineTotal,
                        totalValue: pi.grandTotal
                    }
                }, { session });
                console.log(`   Unit price ${old.unitPrice} → ${NEW_UNIT_PRICE} | line total ${lineTotal} | grand total ${old.grandTotal} → ${pi.grandTotal} (PO + ${pi.quotationNumber})`);
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
