// 2026-10-23: PO 6130091968 (PI-2627-AA-857) — item 79302 CONVEYOR BELT unit price ₹19,500 → ₹25,500 (ex-GST)
// Updates PO line + totalValue and PI line + subTotal / gstTotal / roundOff / grandTotal. Stock is unaffected.
// A JSON backup is written next to this script first.
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const Quotation = require("../models/Quotation");
const PurchaseOrder = require("../models/PurchaseOrder");

const PO_NUMBER = "6130091968";
const PRODUCT_NO = "79302";
const NEW_UNIT_PRICE = 25500;
const round2 = (n) => Math.round(n * 100) / 100;

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const session = await mongoose.startSession();
    try {
        const po = await PurchaseOrder.findOne({ poNumber: PO_NUMBER }).lean();
        const pi = po?.pi ? await Quotation.findById(po.pi).lean() : null;
        if (!po || !pi) throw new Error("PO or PI not found");
        if ((po.invoiceHistory || []).length) throw new Error("PO already invoiced — needs manual review");

        const backupFile = path.join(__dirname, `backup_price_${PO_NUMBER}_${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify({ po, pi }, null, 2));
        console.log(`Backup written: ${backupFile}`);

        await session.withTransaction(async () => {
            // PI line + totals (same formula as quotationController: items + charges, rounded grand total)
            const piDoc = await Quotation.findById(pi._id).session(session);
            const line = piDoc.products.find(p => p.productNo === PRODUCT_NO);
            if (!line) throw new Error(`${PRODUCT_NO} not in PI`);
            const oldPrice = line.unitPrice;
            const taxable = round2((Number(line.quantity) || 0) * NEW_UNIT_PRICE);
            const gst = round2(taxable * (Number(line.gstRate) || 0) / 100);
            line.unitPrice = NEW_UNIT_PRICE;
            line.taxableAmount = taxable;
            line.gstAmount = gst;
            line.total = round2(taxable + gst);

            const ch = piDoc.additionalCharges || {};
            const chargesTaxable = ["installation", "freight", "insurance", "other"].reduce((s, k) => s + (Number(ch[k]) || 0), 0);
            if (chargesTaxable !== 0) throw new Error("PI has additional charges — recalc manually");
            const itemsTaxable = piDoc.products.reduce((s, p) => s + (Number(p.taxableAmount) || 0), 0);
            const itemsGst = piDoc.products.reduce((s, p) => s + (Number(p.gstAmount) || 0), 0);
            const exact = itemsTaxable + itemsGst;
            const oldGrand = piDoc.grandTotal;
            piDoc.subTotal = itemsTaxable;
            piDoc.gstTotal = itemsGst;
            piDoc.grandTotal = Math.round(exact);
            piDoc.roundOff = round2(piDoc.grandTotal - exact);
            piDoc.markModified("products");
            await piDoc.save({ session });

            // PO line + total
            const idx = po.products.findIndex(p => p.productNo === PRODUCT_NO);
            if (idx < 0) throw new Error(`${PRODUCT_NO} not in PO`);
            await PurchaseOrder.updateOne({ _id: po._id }, {
                $set: {
                    [`products.${idx}.unitPrice`]: NEW_UNIT_PRICE,
                    [`products.${idx}.total`]: line.total,
                    totalValue: piDoc.grandTotal
                }
            }, { session });

            console.log(`${PRODUCT_NO}: ₹${oldPrice} → ₹${NEW_UNIT_PRICE} per piece | line ${line.total} | grand total ₹${oldGrand} → ₹${piDoc.grandTotal} (PO ${PO_NUMBER} + ${piDoc.quotationNumber})`);
        });
        console.log("✅ Done");
    } catch (err) {
        console.error("❌ Failed (no changes committed):", err.message);
        process.exitCode = 1;
    } finally {
        await session.endSession();
        await mongoose.disconnect();
    }
};

run();
