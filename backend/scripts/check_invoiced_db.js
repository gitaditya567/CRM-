const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });

const PurchaseOrder = require("../models/PurchaseOrder");

async function verifyInvoicedValues() {
    try {
        const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
        await mongoose.connect(mongoUri);
        console.log("Connected to Mongo");

        const pos = await PurchaseOrder.find({}).lean();
        console.log(`Total POs in DB: ${pos.length}`);

        let totalPOValue = 0;
        let totalInvoicedValue = 0;

        pos.forEach((po, index) => {
            const poVal = po.totalValue || 0;
            let invVal = 0;
            if (po.invoiceHistory && po.invoiceHistory.length > 0) {
                invVal = po.invoiceHistory.reduce((sum, inv) => sum + (inv.totalValue || 0), 0);
            } else if (po.products && po.products.length > 0) {
                invVal = po.products.reduce((sum, p) => sum + ((p.invoicedQuantity || 0) * (p.unitPrice || 0)), 0);
            }

            totalPOValue += poVal;
            totalInvoicedValue += invVal;

            if (invVal > 0) {
                console.log(`PO #${po.poNumber || index}: PO Value = ₹${poVal}, Invoiced Value = ₹${invVal}`);
            }
        });

        console.log("-----------------------------------------");
        console.log(`Total PO Value Sum: ₹${totalPOValue} (Cr: ${(totalPOValue / 10000000).toFixed(4)})`);
        console.log(`Total Invoiced Value Sum: ₹${totalInvoicedValue} (Cr: ${(totalInvoicedValue / 10000000).toFixed(4)})`);
        console.log("-----------------------------------------");

        await mongoose.disconnect();
    } catch (err) {
        console.error("Error:", err);
    }
}

verifyInvoicedValues();
