require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        const quotationNumber = "PI-2627-AD-616";
        const newPoNumber = "4500125962";

        const q = await Quotation.findOne({ quotationNumber });
        if (!q) {
            console.log(`Could not find quotation with number: ${quotationNumber}`);
            return;
        }

        console.log(`Found Quotation: ${q.quotationNumber}, Current PO: ${q.poNumber}`);
        const oldPoNumber = q.poNumber;
        
        q.poNumber = newPoNumber;
        await q.save();
        console.log(`Quotation ${quotationNumber} updated with new PO Number: ${newPoNumber}`);

        // Check if there's a Purchase Order that needs updating
        let po = null;
        if (oldPoNumber) {
            po = await PurchaseOrder.findOne({ poNumber: oldPoNumber });
        }
        
        if (!po) {
            po = await PurchaseOrder.findOne({ pi: q._id });
        }

        if (po) {
            console.log(`Found associated PurchaseOrder with PO Number: ${po.poNumber}`);
            po.poNumber = newPoNumber;
            await po.save();
            console.log(`PurchaseOrder updated with new PO Number: ${newPoNumber}`);
        } else {
            console.log("No associated PurchaseOrder found.");
        }

    } catch (e) {
        if (e.code === 11000) {
            console.error("Error: The PO number might already exist (Duplicate Key Error).");
        } else {
            console.error(e);
        }
    } finally {
        mongoose.connection.close();
    }
}

main();
