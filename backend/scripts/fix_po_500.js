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
            let updated = false;
            po.products.forEach(p => {
                // If it is 40751DQ04, reset its invoicedQuantity to 0
                if (p.productNo === '40751DQ04') {
                    console.log(`Resetting invoicedQuantity for ${p.productNo} from ${p.invoicedQuantity} to 0`);
                    p.invoicedQuantity = 0;
                    p.currentInvoiceQty = 1;
                    updated = true;
                }
            });
            
            // Recalculate status based on the fix
            const activeProducts = po.products.filter(p => p.selected !== false);
            const totalQty = activeProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
            const totalInvoiced = activeProducts.reduce((sum, p) => sum + (p.invoicedQuantity || 0), 0);

            let newStatus = po.status;
            if (totalInvoiced === 0) {
                newStatus = "Pending";
            } else {
                const allBilled = activeProducts.every(p => (p.invoicedQuantity || 0) >= p.quantity);
                newStatus = allBilled ? "Invoiced" : "Partially Invoiced";
            }
            
            if (po.status !== newStatus) {
                console.log(`Updating status from ${po.status} to ${newStatus}`);
                po.status = newStatus;
                updated = true;
            }

            if (updated) {
                await po.save();
                console.log("PurchaseOrder Q-2627-AD-500 fixed successfully.");
            } else {
                console.log("No changes needed.");
            }
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
