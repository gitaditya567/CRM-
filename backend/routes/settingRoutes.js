const express = require("express");
const router = express.Router();
const Setting = require("../models/Setting");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// GET GLOBAL UI SETTINGS
router.get("/ui", async (req, res) => {
    try {
        let settings = await Setting.findOne({ key: "global_ui_settings" });
        if (!settings) {
            // Create defaults if not exists
            settings = await Setting.create({ key: "global_ui_settings" });
        }
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: "Error fetching settings" });
    }
});

// UPDATE GLOBAL UI SETTINGS (Admin Only)
router.put("/ui", protect, adminOnly, async (req, res) => {
    try {
        const settings = await Setting.findOneAndUpdate(
            { key: "global_ui_settings" },
            { $set: req.body },
            { new: true, upsert: true }
        );
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: "Error updating settings" });
    }
});

module.exports = router;
