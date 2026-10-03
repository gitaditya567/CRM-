// Move Inward PO DELRH0000040891 back to PI (PI-2627-KA-802)
// - Deletes the Inward PO (only if it has no invoices / dispatches)
// - Restores stock deducted at PI → PO conversion + adds an IN reversal entry in StockLedger
// - Marks the PI as not converted, so it shows again in the PI tab with "Move to PO"
// A JSON backup of the PO, PI and product is written next to this script before any change.
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");
const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");

const PO_NUMBER = "DELRH0000040891";

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const session = await mongoose.startSession();
    try {
        const po = await PurchaseOrder.findOne({ poNumber: PO_NUMBER, type: "inward" }).lean();
        if (!po) throw new Error(`Inward PO ${PO_NUMBER} not found`);

        const hasActivity = (po.invoiceHistory || []).length > 0 || (po.dispatchHistory || []).length > 0 ||
            (po.products || []).some(p => (p.invoicedQuantity || 0) > 0 || (p.dispatchedQuantity || 0) > 0);
        if (hasActivity) throw new Error("PO has invoices / dispatches — aborting, needs manual review");

        const pi = await Quotation.findById(po.pi).lean();
        if (!pi) throw new Error("Linked PI not found");

        const products = await Product.find({ _id: { $in: po.products.map(p => p.product).filter(Boolean) } }).lean();

        // 💾 Backup
        const backupFile = path.join(__dirname, `backup_${PO_NUMBER}_${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify({ po, pi, products }, null, 2));
        console.log(`Backup written: ${backupFile}`);

        await session.withTransaction(async () => {
            // 1. Restore stock + reversal ledger entry
            for (const p of po.products || []) {
                const qty = Number(p.quantity) || 0;
                if (qty <= 0) continue;
                let productDoc = p.product ? await Product.findById(p.product).session(session) : null;
                if (!productDoc && p.productNo) productDoc = await Product.findOne({ productNo: p.productNo }).session(session);
                if (!productDoc) {
                    console.warn(`  Product ${p.productNo} not found — stock not restored`);
                    continue;
                }
                const before = productDoc.quantity || 0;
                productDoc.quantity = before + qty;
                await productDoc.save({ session });

                await new StockLedger({
                    product: productDoc._id,
                    productNo: productDoc.productNo,
                    brand: productDoc.brand,
                    entryType: "IN",
                    piNo: pi.quotationNumber,
                    poNo: PO_NUMBER,
                    date: new Date(),
                    quantity: qty,
                    unitPrice: p.unitPrice || 0,
                    balanceAfter: productDoc.quantity,
                    remarks: `Stock restored: Inward PO ${PO_NUMBER} reverted back to PI`
                }).save({ session });
                console.log(`  Stock ${productDoc.productNo}: ${before} → ${productDoc.quantity}`);
            }

            // 2. Mark PI as not converted (keeps PI number, client PO number & date for re-conversion)
            await Quotation.updateOne({ _id: pi._id }, { $set: { isConvertedToPO: false } }, { session });
            console.log(`  PI ${pi.quotationNumber}: isConvertedToPO → false`);

            // 3. Delete the Inward PO
            await PurchaseOrder.deleteOne({ _id: po._id }, { session });
            console.log(`  Inward PO ${PO_NUMBER} deleted`);
        });

        console.log("✅ Done — PO moved back to PI.");
    } catch (err) {
        console.error("❌ Failed (no changes committed):", err.message);
        process.exitCode = 1;
    } finally {
        await session.endSession();
        await mongoose.disconnect();
    }
};

run();
