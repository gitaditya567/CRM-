const mongoose = require("mongoose");

// 📨 One document per Email / WhatsApp send attempt for a PO dispatch.
// Email:    queued → sent | failed            (SMTP accepted / rejected)
// WhatsApp: queued → sent → delivered → read  | failed   (updated by Meta webhook)
const communicationLogSchema = new mongoose.Schema({
    po: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", index: true },
    poNumber: { type: String, default: "" },
    dispatchId: { type: mongoose.Schema.Types.ObjectId, default: null },
    channel: { type: String, enum: ["email", "whatsapp"], required: true },
    recipient: { type: String, required: true },
    cc: { type: String, default: "" },
    subject: { type: String, default: "" },
    body: { type: String, default: "" },               // email HTML or WhatsApp text
    templateName: { type: String, default: "" },        // WhatsApp template (if template mode)
    templateParams: [{ type: String }],
    status: {
        type: String,
        enum: ["queued", "sent", "delivered", "read", "failed"],
        default: "queued"
    },
    providerMessageId: { type: String, default: "", index: true },
    error: { type: String, default: "" },
    statusHistory: [{
        status: String,
        at: { type: Date, default: Date.now },
        error: String
    }],
    retryOf: { type: mongoose.Schema.Types.ObjectId, ref: "CommunicationLog", default: null },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    sentByName: { type: String, default: "" }
}, { timestamps: true });

communicationLogSchema.index({ po: 1, channel: 1, createdAt: -1 });

module.exports = mongoose.model("CommunicationLog", communicationLogSchema);
