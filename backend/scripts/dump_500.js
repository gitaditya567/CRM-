require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        const po = await PurchaseOrder.findOne({ poNumber: "Q-2627-AD-500" });
        if (po) {
            console.log(`PO: ${po.poNumber}`);
            console.log(`isMovedToInvoice: ${po.isMovedToInvoice}`);
            console.log("Products:");
            po.products.forEach(p => {
                console.log(` - ${p.productNo}: Qty ${p.quantity}, invoicedQuantity ${p.invoicedQuantity}, currentInvoiceQty ${p.currentInvoiceQty}, dispatchedQuantity ${p.dispatchedQuantity}, selected: ${p.selected}`);
            });
            console.log("Invoice History:");
            po.invoiceHistory.forEach(inv => {
                console.log(` - Invoice ${inv.invoiceNo}:`);
                inv.products.forEach(p => {
                    console.log(`    * ${p.productNo}: Qty ${p.quantity}`);
                });
            });
        } else {
            console.log("PO not found");
        }
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.connection.close();
    }
}
main();
