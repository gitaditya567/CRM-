require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Quotation = require('../models/Quotation');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        const q = await Quotation.findOne({ poNumber: "Q-2627-AD-260" });
        if (!q) {
            console.log("Could not find quotation Q-2627-AD-260");
            return;
        }

        console.log(`Found Quotation: ${q.quotationNumber}, PO: ${q.poNumber}`);
        
        let subTotalTaxable = 0;
        let subTotalGst = 0;
        let itemUpdated = false;

        // Iterate through products to find part code 600018S and update quantity
        q.products.forEach(p => {
            if (p.productNo === '600018S') {
                console.log(`Updating quantity for ${p.productNo} (${p.name}) from ${p.quantity} to 2.`);
                p.quantity = 2;
                itemUpdated = true;
            }

            // Recalculate line items
            p.taxableAmount = p.quantity * p.unitPrice;
            p.gstAmount = p.taxableAmount * (p.gstRate / 100);
            p.total = p.taxableAmount + p.gstAmount;

            subTotalTaxable += p.taxableAmount;
            subTotalGst += p.gstAmount;
        });

        if (!itemUpdated) {
            console.log("Item 600018S not found in the quotation.");
            return;
        }

        // Additional Charges
        const charges = q.additionalCharges || { installation: 0, freight: 0, insurance: 0, other: 0 };
        const installation = Number(charges.installation) || 0;
        const freight = Number(charges.freight) || 0;
        const insurance = Number(charges.insurance) || 0;
        const other = Number(charges.other) || 0;

        const chargesTaxable = installation + freight + insurance + other;
        const chargesGst = chargesTaxable * 0.18;

        const finalSubTotal = subTotalTaxable + subTotalGst + chargesTaxable + chargesGst;
        const roundOff = Math.round(finalSubTotal) - finalSubTotal;
        const grandTotal = Math.round(finalSubTotal);

        q.subTotal = subTotalTaxable + chargesTaxable;
        q.gstTotal = subTotalGst + chargesGst;
        q.roundOff = roundOff;
        q.grandTotal = grandTotal;

        await q.save();
        console.log("Quotation updated successfully.");
        console.log(`New Grand Total: ${q.grandTotal}`);

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.connection.close();
    }
}

main();
