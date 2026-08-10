const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const Lead = require('../models/Lead');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // =========================================================================
        // TASK 1: B202606-02815 unitPrice change from 12155 to 12000
        // =========================================================================
        console.log('\n--- EXECUTING TASK 1: B202606-02815 Price Update ---');
        
        // 1. Update Quotation
        const q1 = await Quotation.findById('6a1158f87734ec546fa28cf8');
        if (!q1) {
            console.log('Quotation 1 not found!');
        } else {
            console.log(`Before update Q1 (${q1.quotationNumber}): grandTotal = ${q1.grandTotal}`);
            let subTotalTaxable = 0;
            let subTotalGst = 0;

            q1.products.forEach(p => {
                if (p.unitPrice === 12155 || p.productNo === '39910') {
                    console.log(`Updating product ${p.productNo} (${p.name}) unit price from ${p.unitPrice} to 12000`);
                    p.unitPrice = 12000;
                }
                p.taxableAmount = p.quantity * p.unitPrice;
                p.gstAmount = p.taxableAmount * ((p.gstRate || 18) / 100);
                p.total = p.taxableAmount + p.gstAmount;

                subTotalTaxable += p.taxableAmount;
                subTotalGst += p.gstAmount;
            });

            const charges = q1.additionalCharges || { installation: 0, freight: 0, insurance: 0, other: 0 };
            const chargesTaxable = (Number(charges.installation) || 0) + (Number(charges.freight) || 0) + (Number(charges.insurance) || 0) + (Number(charges.other) || 0);
            const chargesGst = chargesTaxable * 0.18;

            const finalSubTotal = subTotalTaxable + subTotalGst + chargesTaxable + chargesGst;
            q1.subTotal = subTotalTaxable + chargesTaxable;
            q1.gstTotal = subTotalGst + chargesGst;
            q1.grandTotal = Math.round(finalSubTotal);
            q1.roundOff = Math.round(finalSubTotal * 100) / 100 - finalSubTotal;

            await q1.save();
            console.log(`Updated Quotation Q1 -> grandTotal: ${q1.grandTotal}, subTotal: ${q1.subTotal}, gstTotal: ${q1.gstTotal}`);
        }

        // 2. Update Purchase Order 1
        const po1 = await PurchaseOrder.findById('6a33dc4db5752bcae0fc85c3');
        if (!po1) {
            console.log('PO 1 not found!');
        } else {
            console.log(`Before update PO1 (${po1.poNumber}): totalValue = ${po1.totalValue}`);
            let poSubTotal = 0;

            po1.products.forEach(p => {
                if (p.unitPrice === 12155 || p.productNo === '39910') {
                    console.log(`Updating PO product ${p.productNo} (${p.name}) unit price from ${p.unitPrice} to 12000`);
                    p.unitPrice = 12000;
                }
                const taxable = p.quantity * p.unitPrice;
                const gst = taxable * ((p.gstRate || 18) / 100);
                p.total = taxable + gst;
                poSubTotal += p.total;
            });

            const installation = Number(po1.installationCharges) || 0;
            const freight = Number(po1.freightCartage) || 0;
            const chargesTaxable = installation + freight;
            const chargesGst = chargesTaxable * 0.18;

            po1.totalValue = Math.round(poSubTotal + chargesTaxable + chargesGst);
            await po1.save();
            console.log(`Updated PO1 (${po1.poNumber}) -> totalValue: ${po1.totalValue}`);
        }

        // =========================================================================
        // TASK 2: Q-2627-KG-728 Move Into Quotation
        // =========================================================================
        console.log('\n--- EXECUTING TASK 2: Q-2627-KG-728 Move Into Quotation ---');

        // 1. Update Quotation 2
        const q2 = await Quotation.findById('6a6711496e114d0788ea7af7');
        if (!q2) {
            console.log('Quotation 2 not found!');
        } else {
            console.log(`Before update Q2 -> quotationNumber: ${q2.quotationNumber}, poNumber: "${q2.poNumber}", status: ${q2.status}`);
            
            q2.quotationNumber = "Q-2627-KG-728";
            q2.status = "Sent";
            q2.poNumber = "";
            q2.poDate = null;
            q2.poComment = "";
            q2.isConvertedToPO = false;

            await q2.save();
            console.log(`Updated Q2 -> quotationNumber: ${q2.quotationNumber}, status: ${q2.status}, isConvertedToPO: ${q2.isConvertedToPO}`);
        }

        // 2. Delete PO 2
        const poDeleteResult = await PurchaseOrder.deleteOne({ _id: '6a69a9688b3103d0754e20fb' });
        console.log(`Deleted ${poDeleteResult.deletedCount} Purchase Order(s) for Q-2627-KG-728.`);

        // 3. Update Lead 2
        if (q2 && q2.lead) {
            const lead2 = await Lead.findById(q2.lead);
            if (lead2) {
                console.log(`Lead ${lead2.leadNumber} (${lead2.name}) before status: ${lead2.status}`);
                lead2.status = "Quotation Submitted";
                await lead2.save();
                console.log(`Lead ${lead2.leadNumber} updated status to: ${lead2.status}`);
            }
        }

        console.log('\nSUCCESS: Both tasks completed successfully!');

    } catch (e) {
        console.error('Error executing tasks:', e);
    } finally {
        await mongoose.connection.close();
    }
}

main();
