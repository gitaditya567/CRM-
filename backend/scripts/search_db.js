require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        const po = await PurchaseOrder.findOne({ poNumber: "DELAP00216474" });
        if (po) {
            console.log("PO Products:");
            po.products.forEach(p => {
                console.log(`- ${p.productNo} / ${p.name}: Qty ${p.quantity}, Unit Price ${p.unitPrice}`);
            });
        } else {
            console.log("Not found");
        }
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.connection.close();
    }
}
main();
