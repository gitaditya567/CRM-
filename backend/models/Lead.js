const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema({
    leadNumber: {
        type: String,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
    },
    phone: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["New", "Contacted", "Qualified", "Quotation Submitted", "Lost", "Won"],
        default: "New",
    },
    source: {
        type: String,
        default: "Direct",
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
        default: null,
    },
    leadType: {
        type: String,
        default: "General",
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    notes: {
        type: String,
        default: "",
    },
    remarks: [{
        text: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    followUps: [{
        date: {
            type: Date,
            required: true
        },
        remark: {
            type: String,
            required: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    }
}, { timestamps: true });

leadSchema.index({ createdAt: -1 });
leadSchema.index({ assignedTo: 1, status: 1 });
leadSchema.index({ createdBy: 1, createdAt: -1 });
leadSchema.index({ source: 1, createdAt: -1 });
leadSchema.index({ assignedTo: 1, createdAt: -1 });
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ name: 'text', phone: 'text', leadNumber: 'text', source: 'text' });
leadSchema.index({ name: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ email: 1 });

module.exports = mongoose.model("Lead", leadSchema);
