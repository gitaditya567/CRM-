const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const Lead = require('../models/Lead');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        const q = await Quotation.findById('6a75dc73827bf5938b68ef8f').lean();
        console.log('--- QUOTATION ---');
        console.log(JSON.stringify(q, null, 2));

        const po = await PurchaseOrder.findById('6a7605f4827bf5938b68f37c').lean();
        console.log('--- PURCHASE ORDER ---');
        console.log(JSON.stringify(po, null, 2));

        if (q && q.lead) {
            const lead = await Lead.findById(q.lead).lean();
            console.log('--- LEAD ---');
            console.log(JSON.stringify(lead, null, 2));
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
    }
}
main();
