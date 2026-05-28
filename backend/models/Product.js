const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Spare Part", "Equipment"],
    default: "Spare Part",
  },
  productNo: {
    type: String,
    required: true,
  },
  name: {
    type: String, // 'Part Name' or 'Equipment Name'
    required: true,
  },
  description: {
    type: String, // 'Description' (mainly for Equipment, or old Part Description)
    default: "",
  },
  brand: {
    type: String,
    default: "",
  },
  hsnCode: {
    type: String,
    default: "",
  },
  uom: {
    type: String,
    default: "PCS",
  },
  gstRate: {
    type: Number,
    default: 18,
  },
  currency: {
    type: String,
    default: "USD",
  },
  priceUSD: {
    type: Number,
    default: 0,
  },
  dealerPriceINR: {
    type: Number,
    default: 0,
  },
  retailPriceINR: {
    type: Number,
    default: 0,
  },
  quantity: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

productSchema.index({ brand: 1, productNo: 1 }, { unique: true });
productSchema.index({ productNo: 1 }); // Fast lookups
productSchema.index({ name: 1 }); // Fast sorting/searching by name
productSchema.index({ brand: 1 }); // Fast brand filtering
productSchema.index({ createdAt: -1 }); // Fast recent items sorting
productSchema.index({ name: 'text', productNo: 'text', brand: 'text', description: 'text' });

module.exports = mongoose.model("Product", productSchema);
