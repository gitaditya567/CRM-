const mongoose = require("mongoose");

const stockLedgerSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true,
  },
  productNo: {
    type: String,
    required: true,
    index: true,
  },
  brand: {
    type: String,
    default: "",
  },
  entryType: {
    type: String,
    enum: ["IN", "OUT", "INITIAL", "ADJUSTMENT"],
    default: "IN",
  },
  piNo: {
    type: String,
    default: "",
  },
  invoiceNo: {
    type: String,
    default: "",
  },
  date: {
    type: Date,
    default: Date.now,
  },
  quantity: {
    type: Number,
    required: true,
  },
  unitPrice: {
    type: Number,
    default: 0,
  },
  balanceAfter: {
    type: Number,
    default: 0,
  },
  supplier: {
    type: String,
    default: "",
  },
  remarks: {
    type: String,
    default: "",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  }
}, { timestamps: true });

stockLedgerSchema.index({ product: 1, date: -1 });
stockLedgerSchema.index({ productNo: 1, date: -1 });

module.exports = mongoose.model("StockLedger", stockLedgerSchema);
