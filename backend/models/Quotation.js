const mongoose = require("mongoose");

const quotationSchema = new mongoose.Schema({
    quotationNumber: {
        type: String,
        unique: true,
        required: true
    },
    lead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lead",
        required: true
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product"
        },
        productNo: String, // Snapshot
        name: String, // Snapshot
        description: String, // Snapshot
        brand: String, // Snapshot
        hsnCode: String,
        uom: String,
        quantity: {
            type: Number,
            default: 1
        },
        unitPrice: {
            type: Number,
            default: 0
        },
        gstRate: {
            type: Number,
            default: 18
        },
        gstAmount: {
            type: Number,
            default: 0
        },
        taxableAmount: {
            type: Number,
            default: 0
        },
        total: {
            type: Number,
            default: 0
        }
    }],
    additionalCharges: {
        installation: { type: Number, default: 0 },
        freight: { type: Number, default: 0 },
        insurance: { type: Number, default: 0 },
        other: { type: Number, default: 0 }
    },
    subTotal: { type: Number, default: 0 },
    gstTotal: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    terms: {
        deliveryLeadTime: { type: String, default: "Ex-Stock items are subject to prior sales against subject to Force Majeure Clause." },
        payment: { type: String, default: "100% advance along with Purchase Order." },
        warranty: { type: String, default: "12 months from the date of TeamInspire Invoice for Equipments. (Onsite/OffSite). No warranty on spare parts. Consumables, Wear and tear items, including rubber parts and bulbs, are not covered under warranty." },
        deliveryTerms: { type: String, default: "Ex-warehouse, Delhi is subject to prior sales and Force Majeure Clause." },
        validity: { type: String, default: "30 Days from the date of PI." },
        remark: { type: String, default: "" }
    },
    termDetails: {
        paymentPercent: { type: String, default: "100" },
        warrantyMonths: { type: String, default: "12" },
        warrantyType: { type: String, default: "Onsite" },
        validityDays: { type: String, default: "30" }
    },

    // Snapshots for immutability
    billTo: {
        name: String,
        address: String,
        gstin: String
    },
    shipTo: {
        name: String,
        address: String,
        gstin: String
    },

    status: {
        type: String,
        enum: ["Draft", "Sent", "Accepted", "Rejected"],
        default: "Draft"
    },
    validUntil: {
        type: Date
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    revisionNo: {
        type: Number,
        default: 0
    },
    poNumber: {
        type: String,
        default: ""
    },
    poDate: {
        type: Date,
        default: null
    },
    poComment: {
        type: String,
        default: ""
    }
}, { timestamps: true });
quotationSchema.index({ createdAt: -1 });
quotationSchema.index({ lead: 1, createdAt: -1 });
quotationSchema.index({ createdBy: 1, createdAt: -1 });
quotationSchema.index({ status: 1 });

// Auto-generate Quotation Number
quotationSchema.pre("validate", async function (next) {
    if (!this.quotationNumber) {
        const currentYear = new Date().getFullYear();
        const latestQuote = await mongoose.model("Quotation").findOne({
            quotationNumber: new RegExp(`^QT-${currentYear}-`)
        }).sort({ createdAt: -1 }).select("quotationNumber").lean();

        let nextNum = 1001;
        if (latestQuote && latestQuote.quotationNumber) {
            const parts = latestQuote.quotationNumber.split("-");
            const lastSeq = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastSeq) && lastSeq >= 1000) {
                nextNum = lastSeq + 1;
            }
        }
        this.quotationNumber = `QT-${currentYear}-${nextNum}`;
    }
    next();
});

module.exports = mongoose.model("Quotation", quotationSchema);
