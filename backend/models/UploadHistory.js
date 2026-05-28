const mongoose = require("mongoose");

const uploadHistorySchema = new mongoose.Schema(
    {
        fileName: {
            type: String,
            required: true,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ["success", "failed"],
            default: "success",
        },
        fileSize: String,
        recordCount: Number,
    },
    { timestamps: true }
);

module.exports = mongoose.model("UploadHistory", uploadHistorySchema);
