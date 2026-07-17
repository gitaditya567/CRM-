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

        // Check Quotation
        const q = await Quotation.findOne({ poNumber: "Q-2627-AD-260" });
        if (q) {
            console.log(`Found Quotation: ${q.quotationNumber}, PO: ${q.poNumber}`);
            let found = false;
            q.products.forEach(p => {
                if (p.productNo === '600018S') {
                    console.log(`Quotation Quantity for ${p.productNo}: ${p.quantity}`);
                    found = true;
                }
            });
            if (!found) console.log("600018S not found in Quotation products.");
        } else {
            console.log("Could not find quotation Q-2627-AD-260");
        }

        // Check PurchaseOrder
        // We will look for poNumber Q-2627-AD-260 or by pi reference
        let po = await PurchaseOrder.findOne({ poNumber: "Q-2627-AD-260" });
        if (!po && q) {
            po = await PurchaseOrder.findOne({ pi: q._id });
        }

        if (po) {
            console.log(`Found PurchaseOrder: ${po.poNumber}`);
            let poSubTotal = 0;
            let itemUpdated = false;
            po.products.forEach(p => {
                if (p.productNo === '600018S') {
                    console.log(`Updating PO quantity for ${p.productNo} from ${p.quantity} to 2.`);
                    p.quantity = 2;
                    itemUpdated = true;
                }
                
                // Recalculate line total for PO
                const taxable = p.quantity * p.unitPrice;
                const gst = taxable * (p.gstRate / 100);
                p.total = taxable + gst;

                poSubTotal += p.total;
            });

            if (itemUpdated) {
                // Additional Charges for PO
                const installation = Number(po.installationCharges) || 0;
                const freight = Number(po.freightCartage) || 0;
                const chargesTaxable = installation + freight;
                const chargesGst = chargesTaxable * 0.18;
                
                po.totalValue = Math.round(poSubTotal + chargesTaxable + chargesGst);

                await po.save();
                console.log(`PurchaseOrder updated successfully. New Total: ${po.totalValue}`);
            } else {
                console.log("600018S not found in PurchaseOrder products.");
            }
        } else {
            console.log("No related PurchaseOrder found.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.connection.close();
    }
}

main();
