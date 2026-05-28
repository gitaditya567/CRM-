const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    description: {
        type: String,
        default: "",
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
    }],
    priceType: {
        type: String,
        enum: ['retailer', 'dealer', 'default'],
        default: 'default'
    }
}, { timestamps: true });

module.exports = mongoose.model("Group", groupSchema);
