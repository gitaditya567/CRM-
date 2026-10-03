// READ-ONLY: inspect PO DELRH0000040891 before moving it back to PI
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");
const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");

const PO_NUMBER = "DELRH0000040891";

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const pos = await PurchaseOrder.find({ poNumber: PO_NUMBER }).lean();
        console.log(`POs found with number ${PO_NUMBER}: ${pos.length}`);

        for (const po of pos) {
            console.log("\n=== PO ===");
            console.log({
                _id: po._id, type: po.type, status: po.status, vendorName: po.vendorName,
                leadNumber: po.leadNumber, isMovedToInvoice: po.isMovedToInvoice, totalValue: po.totalValue,
                pi: po.pi, createdAt: po.createdAt,
                invoiceHistory: (po.invoiceHistory || []).length,
                dispatchHistory: (po.dispatchHistory || []).length,
            });
            console.log("Products:");
            for (const p of po.products || []) {
                const prod = p.product ? await Product.findById(p.product).select("productNo quantity").lean() : null;
                console.log(`  ${p.productNo} | qty ${p.quantity} | invoiced ${p.invoicedQuantity || 0} | dispatched ${p.dispatchedQuantity || 0} | movedToInvoice ${p.movedToInvoice} | current stock ${prod ? prod.quantity : "N/A"}`);
            }

            if (po.pi) {
                const pi = await Quotation.findById(po.pi).select("quotationNumber status isConvertedToPO poNumber poDate lead").lean();
                console.log("\n=== Linked PI ===");
                console.log(pi);
            }

            // Ledger entries for this PI or any of the PO's products
            const pi = po.pi ? await Quotation.findById(po.pi).select("quotationNumber").lean() : null;
            const productNos = (po.products || []).map(p => p.productNo);
            const ledger = await StockLedger.find({
                $or: [
                    { poNo: PO_NUMBER },
                    ...(pi ? [{ piNo: pi.quotationNumber }] : []),
                    { productNo: { $in: productNos } }
                ]
            }).sort({ date: 1 }).lean();
            console.log(`\n=== StockLedger entries (PO / PI / products): ${ledger.length} ===`);
            for (const l of ledger) {
                console.log(`  ${new Date(l.date).toISOString()} | ${l.entryType} | ${l.productNo} | qty ${l.quantity} | bal ${l.balanceAfter} | PI ${l.piNo || "-"} | PO ${l.poNo || "-"} | ${l.remarks || ""}`);
            }
        }
    } catch (err) {
        console.error("Inspect failed:", err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
