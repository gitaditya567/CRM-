const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
        required: false,
    },
    clientName: {
        type: String,
        required: true,
    },
    legalEntityName: {
        type: String,
        required: true,
    },
    clientId: {
        type: String,
        unique: true,
        sparse: true
    },
    // Billing Address
    billingAddress: {
        addressLine1: { type: String, required: true },
        addressLine2: { type: String },
        city: { type: String, required: true },
        distt: { type: String, required: true }, // "Distt" from image
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, required: true },
    },
    gstVatNo: {
        type: String,
        required: true,
    },
    // Contact Person 1
    contactPerson1: {
        name: { type: String, required: true },
        designation: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String, required: true },
    },
    // Contact Person 2
    contactPerson2: {
        name: { type: String },
        designation: { type: String },
        phone: { type: String },
        email: { type: String },
    },
    // Dispatching Address
    isDispatchAddressSame: {
        type: Boolean,
        default: false,
    },
    dispatchAddress: {
        addressLine1: { type: String },
        addressLine2: { type: String },
        city: { type: String },
        distt: { type: String },
        state: { type: String },
        zipCode: { type: String },
        country: { type: String },
    },

    isVisible: {
        type: Boolean,
        default: true
    },
    isSecret: {
        type: Boolean,
        default: false
    },
    allowedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
}, { timestamps: true });

clientSchema.index({ createdAt: -1 });
clientSchema.index({ group: 1 });
clientSchema.index({ clientName: 1 });
clientSchema.index({ legalEntityName: 1 });
clientSchema.index({ isSecret: 1, isVisible: 1 });
clientSchema.index({ allowedUsers: 1 });

module.exports = mongoose.model("Client", clientSchema);
