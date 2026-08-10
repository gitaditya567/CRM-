const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const PurchaseOrder = require('../models/PurchaseOrder');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Update all POs with status "Partially Dispatched" directly to "Dispatched"
        const result1 = await PurchaseOrder.updateMany(
            { status: "Partially Dispatched" },
            { $set: { status: "Dispatched" } }
        );
        console.log(`Updated ${result1.modifiedCount} PO(s) from "Partially Dispatched" to "Dispatched".`);

        // 2. Also check any POs where dispatchHistory exists and dispatchedQuantity > 0, but status is not "Dispatched"
        const posWithDispatch = await PurchaseOrder.find({
            $or: [
                { 'dispatchHistory': { $exists: true, $not: { $size: 0 } } },
                { 'products.dispatchedQuantity': { $gt: 0 } }
            ]
        });

        console.log(`Checking ${posWithDispatch.length} POs with dispatch records...`);
        let updatedCount = 0;
        for (const po of posWithDispatch) {
            if (po.status !== "Dispatched") {
                console.log(`PO ${po.poNumber} (${po._id}) current status "${po.status}" -> converting to "Dispatched"`);
                po.status = "Dispatched";
                await po.save();
                updatedCount++;
            }
        }

        console.log(`Successfully converted ${updatedCount} additional dispatched PO(s) to "Dispatched".`);
        console.log("SUCCESS: All partially dispatched POs have been converted to Dispatched!");

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
    }
}

main();
