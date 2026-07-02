const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const PurchaseOrder = require("../models/PurchaseOrder");

async function updatePOStatuses() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to database.");

        // Find all inward POs in the invoice flow
        const pos = await PurchaseOrder.find({
            type: "inward",
            isMovedToInvoice: true
        });

        console.log(`Found ${pos.length} Inward Purchase Orders in the invoice flow.`);

        let updatedCount = 0;
        let summary = { Pending: 0, "Partially Invoiced": 0, Invoiced: 0 };

        for (const po of pos) {
            const activeProducts = po.products.filter(p => p.selected !== false);
            let targetStatus = "Pending";

            if (activeProducts.length > 0) {
                const totalInvoiced = activeProducts.reduce((sum, p) => sum + (p.invoicedQuantity || 0), 0);
                if (totalInvoiced === 0) {
                    targetStatus = "Pending";
                } else {
                    const allBilled = activeProducts.every(p => (p.invoicedQuantity || 0) >= p.quantity);
                    targetStatus = allBilled ? "Invoiced" : "Partially Invoiced";
                }
            }

            if (po.status !== targetStatus) {
                console.log(`PO: ${po.poNumber} | Current Status: ${po.status} -> Target Status: ${targetStatus}`);
                po.status = targetStatus;
                await po.save();
                updatedCount++;
                summary[targetStatus]++;
            }
        }

        console.log(`\nSync Complete:`);
        console.log(`- Total POs checked: ${pos.length}`);
        console.log(`- Total POs updated: ${updatedCount}`);
        console.log(`- New statuses breakdown:`, summary);

        mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error("Error updating PO statuses:", err);
        process.exit(1);
    }
}

updatePOStatuses();
