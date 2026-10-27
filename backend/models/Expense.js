const mongoose = require("mongoose");

const EXPENSE_CATEGORIES = [
    "Travel", "Hotel / Stay", "Food", "Local Conveyance", "Fuel",
    "Courier", "Client Entertainment", "Phone / Internet", "Miscellaneous"
];
const PAYMENT_MODES = ["Cash", "UPI", "Card", "Company Card", "Bank Transfer"];
const EXPENSE_STATUSES = ["Draft", "Submitted", "Approved", "Rejected", "Paid"];

// 🧾 Travel & Expenses — one expense claim.
// Flow: Draft (private to the staff member) → Submitted → Approved / Rejected → Paid
const expenseSchema = new mongoose.Schema({
    expenseNumber: { type: String, required: true, unique: true }, // EXP-YYMM-####
    claimNumber: { type: String, default: "", index: true },       // CLM-YYMM-### — rows entered & submitted together
    staff: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    staffName: { type: String, default: "" },
    tour: { type: mongoose.Schema.Types.ObjectId, ref: "Tour", default: null, index: true },
    date: { type: Date, required: true, index: true },   // expense date, or start of a date range
    endDate: { type: Date, default: null },               // optional end of range (e.g. hotel stay)
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    place: { type: String, default: "" },                 // where the money was spent (city / shop / station)
    description: { type: String, default: "" },
    amount: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, enum: PAYMENT_MODES, default: "Cash" },
    billNo: { type: String, default: "" },
    attachments: [{
        url: String,
        name: String,
        size: Number,
        mimeType: String
    }],
    status: { type: String, enum: EXPENSE_STATUSES, default: "Submitted", index: true },
    rejectionReason: { type: String, default: "" },
    approvedBy: { type: String, default: "" },
    approvedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    paidBy: { type: String, default: "" },
    statusHistory: [{
        status: String,
        by: String,
        at: { type: Date, default: Date.now },
        note: String
    }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

expenseSchema.index({ staff: 1, date: -1 });

const Expense = mongoose.model("Expense", expenseSchema);
Expense.CATEGORIES = EXPENSE_CATEGORIES;
Expense.PAYMENT_MODES = PAYMENT_MODES;
Expense.STATUSES = EXPENSE_STATUSES;

module.exports = Expense;
