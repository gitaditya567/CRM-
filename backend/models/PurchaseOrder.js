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
        default: ""
    },
    shipper: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shipper",
        default: null
    },
    deliveryLeadTime: {
        type: String,
        default: ""
    },
    paymentTerms: {
        type: String,
        default: ""
    },
    installationCharges: {
        type: Number,
        default: 0
    },
    freightCartage: {
        type: Number,
        default: 0
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
        enum: ["Pending", "Approved", "Received", "Sent", "Processed", "Completed", "Partially Processed", "Partially Received", "Partially Fulfilled", "Partially Pending", "Partial Pending", "Partially Invoiced", "Invoiced", "Dispatched", "Partially Dispatched"],
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
    terms: {
        deliveryLeadTime: { type: String, default: "" },
        payment: { type: String, default: "" },
        warranty: { type: String, default: "" },
        deliveryTerms: { type: String, default: "" },
        validity: { type: String, default: "" },
        remark: { type: String, default: "" }
    },
    termDetails: {
        paymentOption: { type: String, default: "" },
        warrantyMonths: { type: String, default: "" },
        warrantyType: { type: String, default: "" },
        validityDays: { type: String, default: "" }
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
        },
        dispatchedQuantity: {
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
    }],
    dispatchHistory: [{
        courierName: String,
        trackingNo: String,
        transportMode: {
            type: String,
            default: "Road"
        },
        dispatchDate: Date,
        products: [{
            productNo: String,
            name: String,
            brand: String,
            quantity: Number
        }],
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
