const mongoose = require("mongoose");

const shipperSchema = new mongoose.Schema({
    billingName: {
        type: String,
        required: true,
        trim: true
    },
    consigneeName: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    gstin: {
        type: String,
        trim: true
    }
}, { timestamps: true });

module.exports = mongoose.model("Shipper", shipperSchema);
