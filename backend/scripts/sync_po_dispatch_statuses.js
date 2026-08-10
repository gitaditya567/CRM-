const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const PurchaseOrder = require('../models/PurchaseOrder');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const pos = await PurchaseOrder.find({ status: "Partially Dispatched" });
        console.log(`Found ${pos.length} POs with status "Partially Dispatched".`);

        for (const po of pos) {
            const activeProducts = (po.products || []).filter(p => p.selected !== false);
            const totalInvoiced = activeProducts.reduce((sum, p) => sum + (p.invoicedQuantity || 0), 0);
            const totalDispatched = activeProducts.reduce((sum, p) => sum + (p.dispatchedQuantity || 0), 0);

            const newStatus = (totalInvoiced > 0 && totalDispatched >= totalInvoiced) ? "Dispatched" : "Pending";
            console.log(`PO ${po.poNumber} (${po._id}): totalInvoiced=${totalInvoiced}, totalDispatched=${totalDispatched} -> updating status to "${newStatus}"`);

            po.status = newStatus;
            await po.save();
        }

        console.log("SUCCESS: All PO dispatch statuses synced!");

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
    }
}

main();
