const mongoose = require("mongoose");
const dotenv = require("dotenv");
const PurchaseOrder = require("../models/PurchaseOrder");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const deletePO = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const result = await PurchaseOrder.deleteOne({ poNumber: "DUMMY06" });
        if (result.deletedCount > 0) {
            console.log("Successfully deleted Purchase Order DUMMY06");
        } else {
            console.log("Purchase Order DUMMY06 not found");
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
};

deletePO();
