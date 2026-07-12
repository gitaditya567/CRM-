const Shipper = require("../models/Shipper");

// Get all shippers
exports.getShippers = async (req, res) => {
    try {
        const shippers = await Shipper.find().sort({ createdAt: -1 });
        res.json(shippers);
    } catch (error) {
        console.error("Error fetching shippers:", error);
        res.status(500).json({ message: "Server Error fetching shippers" });
    }
};

// Create a new shipper
exports.createShipper = async (req, res) => {
    try {
        const { billingName, address, gstin, consigneeName } = req.body;

        if (!billingName || !address) {
            return res.status(400).json({ message: "Billing Name and Address are required" });
        }

        const newShipper = new Shipper({
            billingName,
            address,
            gstin,
            consigneeName
        });

        await newShipper.save();
        res.status(201).json(newShipper);
    } catch (error) {
        console.error("Error creating shipper:", error);
        res.status(500).json({ message: "Server Error creating shipper" });
    }
};
