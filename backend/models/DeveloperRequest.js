const mongoose = require("mongoose");

const developerRequestSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ["Bug", "Feature Request", "UI Change", "Other"],
        default: "Feature Request"
    },
    priority: {
        type: String,
        enum: ["Low", "Medium", "High", "Critical"],
        default: "Medium"
    },
    status: {
        type: String,
        enum: ["Pending", "In Progress", "Completed", "Rejected"],
        default: "Pending"
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    developerRemarks: {
        type: String,
        default: ""
    }
}, { timestamps: true });

module.exports = mongoose.model("DeveloperRequest", developerRequestSchema);
