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
        
        const poNumber = "DELAP00216474";
        const newQty = 3;

        // 1. Update Quotation
        const q = await Quotation.findOne({ poNumber });
        if (q) {
            let qSubTotalTaxable = 0;
            let qSubTotalGst = 0;
            
            q.products.forEach(p => {
                p.quantity = newQty;
                p.taxableAmount = p.quantity * p.unitPrice;
                p.gstAmount = p.taxableAmount * (p.gstRate / 100);
                p.total = p.taxableAmount + p.gstAmount;

                qSubTotalTaxable += p.taxableAmount;
                qSubTotalGst += p.gstAmount;
            });

            const charges = q.additionalCharges || { installation: 0, freight: 0, insurance: 0, other: 0 };
            const chargesTaxable = (Number(charges.installation) || 0) + (Number(charges.freight) || 0) + (Number(charges.insurance) || 0) + (Number(charges.other) || 0);
            const chargesGst = chargesTaxable * 0.18;

            const finalSubTotal = qSubTotalTaxable + qSubTotalGst + chargesTaxable + chargesGst;
            q.subTotal = qSubTotalTaxable + chargesTaxable;
            q.gstTotal = qSubTotalGst + chargesGst;
            q.grandTotal = Math.round(finalSubTotal);
            q.roundOff = q.grandTotal - finalSubTotal;

            await q.save();
            console.log(`Updated Quotation ${q.quotationNumber}. New Grand Total: ${q.grandTotal}`);
        }

        // 2. Update Purchase Order
        const po = await PurchaseOrder.findOne({ poNumber });
        if (po) {
            let poSubTotal = 0;
            po.products.forEach(p => {
                p.quantity = newQty;
                const taxable = p.quantity * p.unitPrice;
                const gst = taxable * (p.gstRate / 100);
                p.total = taxable + gst;
                poSubTotal += p.total;
            });

            const installation = Number(po.installationCharges) || 0;
            const freight = Number(po.freightCartage) || 0;
            const chargesTaxable = installation + freight;
            const chargesGst = chargesTaxable * 0.18;
            
            po.totalValue = Math.round(poSubTotal + chargesTaxable + chargesGst);
            await po.save();
            console.log(`Updated PurchaseOrder ${po.poNumber}. New Total Value: ${po.totalValue}`);
        }
        
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.connection.close();
    }
}
main();
