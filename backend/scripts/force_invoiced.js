const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const PurchaseOrder = require("../models/PurchaseOrder");

async function forceInvoiced() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");

        const pos = await PurchaseOrder.find({ type: "inward", isMovedToInvoice: true });
        console.log(`Found ${pos.length} inward POs moved to invoice.`);

        let updatedCount = 0;

        for (const po of pos) {
            const activeProducts = po.products.filter(p => p.selected !== false);
            if (activeProducts.length === 0) continue;

            const totalInvoiced = activeProducts.reduce((sum, p) => sum + (p.invoicedQuantity || 0), 0);
            if (totalInvoiced === 0) continue; // It's "Pending", user only asked for "Partially Invoiced"

            const allBilled = activeProducts.every(p => (p.invoicedQuantity || 0) >= p.quantity);

            if (!allBilled) {
                // It is Partially Invoiced
                let changed = false;
                po.products.forEach(p => {
                    if (p.selected !== false && (p.invoicedQuantity || 0) < p.quantity) {
                        p.invoicedQuantity = p.quantity;
                        changed = true;
                    }
                });

                if (changed) {
                    // Update status in DB as well to match
                    po.status = "Invoiced";
                    await po.save();
                    console.log(`Updated PO ${po.poNumber} to Invoiced.`);
                    updatedCount++;
                }
            }
        }

        console.log(`Successfully updated ${updatedCount} POs from Partially Invoiced to Invoiced.`);
    } catch (error) {
        console.error("Error:", error);
    } finally {
        mongoose.disconnect();
    }
}

forceInvoiced();
