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
        enum: ["Pending", "Approved", "Received", "Sent", "Processed", "Completed", "Partially Processed", "Partially Received", "Partially Fulfilled"],
        default: "Pending"
    },
    type: {
        type: String,
        enum: ["inward", "outward"],
        default: "inward"
    },
    isMovedToInvoice: {
        type: Boolean,
        default: false
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
        },
        invoicedQuantity: {
            type: Number,
            default: 0
        },
        currentInvoiceQty: {
            type: Number,
            default: 0
        }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    invoiceHistory: [{
        invoiceNo: String,
        date: Date,
        totalValue: Number,
        products: [{
            productNo: String,
            name: String,
            brand: String,
            quantity: Number,
            unitPrice: Number,
            total: Number
        }],
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
