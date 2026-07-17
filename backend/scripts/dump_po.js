require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');
const Quotation = require('../models/Quotation');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log("--- Quotation ---");
        const q = await Quotation.findOne({ poNumber: "Q-2627-AD-260" });
        if (q) {
            console.log(`Q: ${q.quotationNumber}`);
            q.products.forEach(p => {
                if (p.productNo === '600018S') {
                    console.log(`Part: ${p.productNo}, Qty: ${p.quantity}, Unit Price: ${p.unitPrice}, Total: ${p.total}`);
                }
            });
            console.log(`Q Grand Total: ${q.grandTotal}`);
        } else {
            console.log("No Quotation");
        }

        console.log("--- PurchaseOrder ---");
        let po = await PurchaseOrder.findOne({ poNumber: "Q-2627-AD-260" });
        if (!po && q) {
            po = await PurchaseOrder.findOne({ pi: q._id });
        }
        
        if (po) {
            console.log(`PO Number: ${po.poNumber}, Total Value: ${po.totalValue}`);
            po.products.forEach(p => {
                if (p.productNo === '600018S') {
                    console.log(`Part: ${p.productNo}, Qty: ${p.quantity}, Unit Price: ${p.unitPrice}, Total: ${p.total}`);
                }
            });
        } else {
            console.log("No PurchaseOrder");
        }
        
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.connection.close();
    }
}

main();
