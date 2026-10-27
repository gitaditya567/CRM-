const mongoose = require("mongoose");

// ✈️ Travel & Expenses — a staff tour / trip. Expenses can be linked to it; advance is settled against it.
const tourSchema = new mongoose.Schema({
    tourNumber: { type: String, required: true, unique: true }, // TR-YYMM-###
    // Assigned users — each can add expenses against this tour. `staff` = first member (kept for older tours)
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
    memberNames: [{ type: String }],
    staff: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    staffName: { type: String, default: "" },
    title: { type: String, required: true },       // e.g. "Hyderabad dealer visit"
    purpose: { type: String, default: "" },
    fromCity: { type: String, default: "" },
    toCities: { type: String, default: "" },        // comma separated destinations
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ["Planned", "Ongoing", "Completed", "Cancelled"],
        default: "Planned"
    },
    approvedBudget: { type: Number, default: 0 },   // budget sanctioned for the event (0 = not set)
    advanceAmount: { type: Number, default: 0 },
    advanceDate: { type: Date, default: null },
    advanceMode: { type: String, default: "" },
    notes: { type: String, default: "" },
    settled: { type: Boolean, default: false },     // advance vs. spent balance closed
    settledAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

tourSchema.index({ startDate: -1 });

module.exports = mongoose.model("Tour", tourSchema);
