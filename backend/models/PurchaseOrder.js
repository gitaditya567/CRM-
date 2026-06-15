const mongoose = require("mongoose");

const purchaseOrderSchema = new mongoose.Schema({
    poNumber: {
        type: String,
        unique: true,
        required: true
    },
    pi: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quotation",
        default: null
    },
    vendorName: {
        type: String,
        required: true
    },
    leadNumber: {
        type: String,
        default: ""
    },
    date: {
        type: Date,
        default: Date.now
    },
    totalValue: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["Pending", "Approved", "Received", "Sent", "Invoiced"],
        default: "Pending"
    },
    type: {
        type: String,
        enum: ["inward", "outward"],
        default: "inward"
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product"
        },
        productNo: String,
        name: String,
        brand: String,
        hsnCode: String,
        quantity: Number,
        unitPrice: Number,
        gstRate: Number,
        total: Number,
        selected: {
            type: Boolean,
            default: true
        }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
