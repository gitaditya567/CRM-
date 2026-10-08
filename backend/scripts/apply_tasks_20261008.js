// 2026-10-08: PO 1730062452 (PI-2627-AA-419) — change model DCSB2-2420-1 → DCSB400-R24-1
// - Re-points the item in PO + PI to catalog product DCSB400-R24-1 (description & price unchanged, unit price 2,52,375)
// - Moves the stock deduction made at PI → PO conversion: old code +1 (IN reversal), new code -1 (OUT)
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

const PO_NUMBER = "1730062452";
const OLD_CODE = "DCSB2-2420-1";
const NEW_CODE = "DCSB400-R24-1";
const EXPECTED_UNIT_PRICE = 252375;

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const session = await mongoose.startSession();
    try {
        const po = await PurchaseOrder.findOne({ poNumber: PO_NUMBER }).lean();
        const pi = po?.pi ? await Quotation.findById(po.pi).lean() : null;
        const oldProd = await Product.findOne({ productNo: OLD_CODE }).lean();
        const newProd = await Product.findOne({ productNo: NEW_CODE }).lean();
        if (!po || !pi || !oldProd || !newProd) throw new Error("PO, PI or one of the products not found");
        if ((po.invoiceHistory || []).length || (po.dispatchHistory || []).length) throw new Error("PO already invoiced / dispatched — needs manual review");

        const backupFile = path.join(__dirname, `backup_tasks_20261008_${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify({ po, pi, oldProd, newProd }, null, 2));
        console.log(`Backup written: ${backupFile}\n`);

        await session.withTransaction(async () => {
            // 1. PO item
            const poIdx = po.products.findIndex(p => p.productNo === OLD_CODE);
            if (poIdx < 0) throw new Error(`${OLD_CODE} not found in PO`);
            const qty = Number(po.products[poIdx].quantity) || 0;
            await PurchaseOrder.updateOne({ _id: po._id }, {
                $set: { [`products.${poIdx}.productNo`]: NEW_CODE, [`products.${poIdx}.product`]: newProd._id }
            }, { session });

            // 2. PI item
            const piIdx = pi.products.findIndex(p => p.productNo === OLD_CODE);
            if (piIdx < 0) throw new Error(`${OLD_CODE} not found in PI`);
            await Quotation.updateOne({ _id: pi._id }, {
                $set: { [`products.${piIdx}.productNo`]: NEW_CODE, [`products.${piIdx}.product`]: newProd._id }
            }, { session });
            console.log(`Item model ${OLD_CODE} → ${NEW_CODE} in PO ${PO_NUMBER} and ${pi.quotationNumber}`);
            console.log(`Unit price: PO ${po.products[poIdx].unitPrice} | PI ${pi.products[piIdx].unitPrice} (expected ${EXPECTED_UNIT_PRICE})`);

            // 3. Move stock deduction
            const oldDoc = await Product.findById(oldProd._id).session(session);
            const newDoc = await Product.findById(newProd._id).session(session);
            const oldBefore = oldDoc.quantity || 0;
            const newBefore = newDoc.quantity || 0;
            oldDoc.quantity = oldBefore + qty;
            newDoc.quantity = newBefore - qty;
            await oldDoc.save({ session });
            await newDoc.save({ session });

            await StockLedger.insertMany([{
                product: oldDoc._id, productNo: OLD_CODE, brand: oldDoc.brand, entryType: "IN",
                piNo: pi.quotationNumber, poNo: PO_NUMBER, date: new Date(), quantity: qty, unitPrice: 0,
                balanceAfter: oldDoc.quantity,
                remarks: `Stock restored: PO ${PO_NUMBER} item model changed to ${NEW_CODE}`
            }, {
                product: newDoc._id, productNo: NEW_CODE, brand: newDoc.brand, entryType: "OUT",
                piNo: pi.quotationNumber, poNo: PO_NUMBER, date: new Date(), quantity: qty,
                unitPrice: po.products[poIdx].unitPrice || 0, balanceAfter: newDoc.quantity,
                remarks: `Allocated to Inward PO ${PO_NUMBER} (model changed from ${OLD_CODE})`
            }], { session });
            console.log(`Stock ${OLD_CODE}: ${oldBefore} → ${oldDoc.quantity} | ${NEW_CODE}: ${newBefore} → ${newDoc.quantity}`);
        });

        console.log("\n✅ Done");
    } catch (err) {
        console.error("❌ Failed (no changes committed):", err.message);
        process.exitCode = 1;
    } finally {
        await session.endSession();
        await mongoose.disconnect();
    }
};

run();
