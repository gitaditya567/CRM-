require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        const po = await PurchaseOrder.findOne({ poNumber: "Q-2627-AD-620" });
        if (!po) {
            console.log("Purchase Order Q-2627-AD-620 not found!");
            return;
        }

        console.log("Before update:", {
            id: po._id,
            poNumber: po.poNumber,
            type: po.type,
            isMovedToInvoice: po.isMovedToInvoice,
            status: po.status
        });

        po.isMovedToInvoice = false;
        await po.save();

        console.log("After update:", {
            id: po._id,
            poNumber: po.poNumber,
            type: po.type,
            isMovedToInvoice: po.isMovedToInvoice,
            status: po.status
        });

        console.log("Q-2627-AD-620 successfully moved to Inward PO!");
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.connection.close();
    }
}

main();
