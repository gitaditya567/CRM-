const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            default: "global_ui_settings"
        },
        sidebar: {
            showDashboard: { type: Boolean, default: true },
            showLeads: { type: Boolean, default: true },
            showClients: { type: Boolean, default: true },
            showAddProduct: { type: Boolean, default: true },
            showSearch: { type: Boolean, default: true },
            showHistory: { type: Boolean, default: true },
            showUpload: { type: Boolean, default: true },
            showStaff: { type: Boolean, default: true },
        },
        dashboard: {
            showStats: { type: Boolean, default: true },
            showCharts: { type: Boolean, default: true },
            showRecentActivity: { type: Boolean, default: true },
        },
        productColumns: {
            brand: { type: Boolean, default: true },
            description: { type: Boolean, default: true },
            productNo: { type: Boolean, default: true },
            priceUSD: { type: Boolean, default: true },
            retailPriceINR: { type: Boolean, default: true },
            dealerPriceINR: { type: Boolean, default: true },
            quantity: { type: Boolean, default: true },
        },
        features: {
            enableExport: { type: Boolean, default: true },
            enableBulkDelete: { type: Boolean, default: true },
            enableEdit: { type: Boolean, default: true },
            loginAccessCode: { type: String, default: "" }
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Setting", settingSchema);
