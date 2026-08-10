const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const Lead = require('../models/Lead');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log('--- TASK 1 DETAILS ---');
        const q1 = await Quotation.findById('6a1158f87734ec546fa28cf8').lean();
        console.log('Quotation 1 (B202606-02815):', JSON.stringify(q1, null, 2));

        const po1 = await PurchaseOrder.findById('6a33dc4db5752bcae0fc85c3').lean();
        console.log('PO 1 (B202606-02815):', JSON.stringify(po1, null, 2));

        console.log('\n--- TASK 2 DETAILS ---');
        const q2 = await Quotation.findById('6a6711496e114d0788ea7af7').lean();
        console.log('Quotation 2 (Q-2627-KG-728):', JSON.stringify(q2, null, 2));

        const po2 = await PurchaseOrder.findById('6a69a9688b3103d0754e20fb').lean();
        console.log('PO 2 (Q-2627-KG-728):', JSON.stringify(po2, null, 2));

        if (q2 && q2.lead) {
            const lead2 = await Lead.findById(q2.lead).lean();
            console.log('Lead 2:', JSON.stringify(lead2, null, 2));
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
    }
}
main();
