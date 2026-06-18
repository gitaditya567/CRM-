require("dotenv").config();
const mongoose = require("mongoose");
const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");

async function syncConvertedPIs() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Connected to database.");

        // Find all POs that have a PI reference
        const posWithPi = await PurchaseOrder.find({ pi: { $ne: null } }).select("pi").lean();
        
        const piIds = posWithPi.map(po => po.pi);
        
        console.log(`Found ${piIds.length} Purchase Orders with associated PIs.`);

        if (piIds.length > 0) {
            const result = await Quotation.updateMany(
                { _id: { $in: piIds } },
                { $set: { isConvertedToPO: true } }
            );
            console.log(`Updated ${result.modifiedCount} Quotations (PIs) to isConvertedToPO = true.`);
        }

        console.log("Sync complete.");
        process.exit(0);
    } catch (err) {
        console.error("Error syncing PIs:", err);
        process.exit(1);
    }
}

syncConvertedPIs();
