const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const PurchaseOrder = require('../models/PurchaseOrder');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const partiallyDispatched = await PurchaseOrder.find({ status: "Partially Dispatched" });
        console.log(`POs with status "Partially Dispatched": ${partiallyDispatched.length}`);

        const dispatchedPOs = await PurchaseOrder.find({ status: "Dispatched" });
        console.log(`POs with status "Dispatched": ${dispatchedPOs.length}`);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
    }
}

main();
