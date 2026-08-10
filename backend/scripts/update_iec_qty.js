const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const poNumber = "IEC-3105/26-27";
        const targetProductNo = "RCS511 TSI";
        const newQty = 15;

        // 1. Update Quotation
        const q = await Quotation.findOne({
            $or: [
                { poNumber: poNumber },
                { quotationNumber: poNumber }
            ]
        });

        if (!q) {
            console.log(`Quotation with PO number ${poNumber} not found!`);
        } else {
            console.log(`Found Quotation ID: ${q._id}, Current Grand Total: ${q.grandTotal}`);
            let qSubTotalTaxable = 0;
            let qSubTotalGst = 0;
            let productUpdated = false;

            q.products.forEach(p => {
                if (p.productNo === targetProductNo) {
                    console.log(`Updating Quotation product ${p.productNo} (${p.name}) quantity from ${p.quantity} to ${newQty}`);
                    p.quantity = newQty;
                    productUpdated = true;
                }

                p.taxableAmount = p.quantity * p.unitPrice;
                p.gstAmount = p.taxableAmount * ((p.gstRate || 18) / 100);
                p.total = p.taxableAmount + p.gstAmount;

                qSubTotalTaxable += p.taxableAmount;
                qSubTotalGst += p.gstAmount;
            });

            if (!productUpdated) {
                console.log(`Product ${targetProductNo} not found in quotation products!`);
            } else {
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
        }

        // 2. Update Purchase Order
        const po = await PurchaseOrder.findOne({ poNumber: poNumber });
        if (!po) {
            console.log(`Purchase Order ${poNumber} not found!`);
        } else {
            console.log(`Found Purchase Order ID: ${po._id}, Current Total Value: ${po.totalValue}`);
            let poSubTotal = 0;
            let poProductUpdated = false;

            po.products.forEach(p => {
                if (p.productNo === targetProductNo) {
                    console.log(`Updating PO product ${p.productNo} (${p.name}) quantity from ${p.quantity} to ${newQty}`);
                    p.quantity = newQty;
                    poProductUpdated = true;
                }

                const taxable = p.quantity * p.unitPrice;
                const gst = taxable * ((p.gstRate || 18) / 100);
                p.total = taxable + gst;
                poSubTotal += p.total;
            });

            if (!poProductUpdated) {
                console.log(`Product ${targetProductNo} not found in PO products!`);
            } else {
                const installation = Number(po.installationCharges) || 0;
                const freight = Number(po.freightCartage) || 0;
                const chargesTaxable = installation + freight;
                const chargesGst = chargesTaxable * 0.18;

                po.totalValue = Math.round(poSubTotal + chargesTaxable + chargesGst);
                await po.save();
                console.log(`Updated PurchaseOrder ${po.poNumber}. New Total Value: ${po.totalValue}`);
            }
        }

        console.log("SUCCESS: Quantity updated successfully!");
    } catch (e) {
        console.error("Error updating quantity:", e);
    } finally {
        await mongoose.connection.close();
    }
}

main();
