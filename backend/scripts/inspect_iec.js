const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const q = await Quotation.findById('6a61edad6e114d0788ea4603').lean();
        console.log('--- QUOTATION ---');
        console.log(JSON.stringify(q, null, 2));

        const po = await PurchaseOrder.findById('6a630f776e114d0788ea581d').lean();
        console.log('--- PURCHASE ORDER ---');
        console.log(JSON.stringify(po, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
    }
}
main();
