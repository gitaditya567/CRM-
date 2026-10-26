// 2026-10-26: PO Q-2627-1434 (PI-2627-KA-1434) — part code 0L2826 → 0L2836 (price & qty unchanged)
// 0L2826 was created on 24-Oct only for this PI and 0L2836 is not in the catalog, so the catalog product is
// renamed and the PO line, PI line and its stock-ledger entry follow. Aborts if 0L2826 is used anywhere else.
// A JSON backup is written next to this script first.
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const Product = require("../models/Product");
const Quotation = require("../models/Quotation");
const PurchaseOrder = require("../models/PurchaseOrder");
const StockLedger = require("../models/StockLedger");

const PO_NUMBER = "Q-2627-1434";
const OLD_CODE = "0L2826";
const NEW_CODE = "0L2836";

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const session = await mongoose.startSession();
    try {
        const po = await PurchaseOrder.findOne({ poNumber: PO_NUMBER }).lean();
        const pi = po?.pi ? await Quotation.findById(po.pi).lean() : null;
        const prod = await Product.findOne({ productNo: OLD_CODE }).lean();
        if (!po || !pi || !prod) throw new Error("PO, PI or product not found");
        if (await Product.exists({ productNo: NEW_CODE })) throw new Error(`${NEW_CODE} already exists in catalog — needs a re-point instead of a rename`);

        // Must be used only by this PO / PI
        const [otherQuotes, otherPOs, otherLedger] = await Promise.all([
            Quotation.countDocuments({ _id: { $ne: pi._id }, $or: [{ "products.product": prod._id }, { "products.productNo": OLD_CODE }] }),
            PurchaseOrder.countDocuments({ _id: { $ne: po._id }, $or: [{ "products.product": prod._id }, { "products.productNo": OLD_CODE }] }),
            StockLedger.countDocuments({ product: prod._id, piNo: { $ne: pi.quotationNumber } })
        ]);
        if (otherQuotes || otherPOs || otherLedger) {
            throw new Error(`${OLD_CODE} is also used elsewhere (quotes ${otherQuotes}, POs ${otherPOs}, ledger ${otherLedger}) — not renaming`);
        }

        const ledger = await StockLedger.find({ product: prod._id }).lean();
        const backupFile = path.join(__dirname, `backup_partcode_${PO_NUMBER}_${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify({ po, pi, prod, ledger }, null, 2));
        console.log(`Backup written: ${backupFile}`);

        await session.withTransaction(async () => {
            await Product.updateOne({ _id: prod._id }, { $set: { productNo: NEW_CODE } }, { session });

            const poIdx = po.products.findIndex(p => p.productNo === OLD_CODE);
            const piIdx = pi.products.findIndex(p => p.productNo === OLD_CODE);
            if (poIdx < 0 || piIdx < 0) throw new Error(`${OLD_CODE} not found in PO or PI`);
            await PurchaseOrder.updateOne({ _id: po._id }, { $set: { [`products.${poIdx}.productNo`]: NEW_CODE } }, { session });
            await Quotation.updateOne({ _id: pi._id }, { $set: { [`products.${piIdx}.productNo`]: NEW_CODE } }, { session });

            const l = await StockLedger.updateMany({ product: prod._id }, { $set: { productNo: NEW_CODE } }, { session });
            console.log(`Catalog product, PO ${PO_NUMBER} line, ${pi.quotationNumber} line and ${l.modifiedCount} ledger entr(y/ies): ${OLD_CODE} → ${NEW_CODE}`);
            console.log(`Unchanged: ${po.products[poIdx].name} | qty ${po.products[poIdx].quantity} | ₹${po.products[poIdx].unitPrice} | stock ${prod.quantity}`);
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
