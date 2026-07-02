const DeveloperRequest = require("../models/DeveloperRequest");

// GET /api/developer-requests
exports.getRequests = async (req, res) => {
    try {
        const requests = await DeveloperRequest.find()
            .populate("submittedBy", "name email")
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        console.error("Get Developer Requests Error:", err);
        res.status(500).json({ message: "Failed to fetch developer requests" });
    }
};

// POST /api/developer-requests
exports.createRequest = async (req, res) => {
    try {
        const { title, description, category, priority } = req.body;
        if (!title || !description) {
            return res.status(400).json({ message: "Title and description are required" });
        }

        const newRequest = new DeveloperRequest({
            title,
            description,
            category,
            priority,
            submittedBy: req.user._id
        });

        const savedRequest = await newRequest.save();
        
        // Populate submittedBy before sending response
        const populatedRequest = await savedRequest.populate("submittedBy", "name email");

        // Emit socket event if setup
        const io = req.app.get("io");
        if (io) {
            io.emit("developerRequestAdded", populatedRequest);
        }

        res.status(201).json(populatedRequest);
    } catch (err) {
        console.error("Create Developer Request Error:", err);
        res.status(500).json({ message: "Failed to create developer request" });
    }
};

// PUT /api/developer-requests/:id
exports.updateRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, category, priority, status, developerRemarks } = req.body;

        const request = await DeveloperRequest.findById(id);
        if (!request) {
            return res.status(404).json({ message: "Developer request not found" });
        }

        let updates = {};
        if (title) updates.title = title;
        if (description) updates.description = description;
        if (category) updates.category = category;
        if (priority) updates.priority = priority;
        if (status) updates.status = status;
        if (typeof developerRemarks !== "undefined") updates.developerRemarks = developerRemarks;

        const updatedRequest = await DeveloperRequest.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true }
        ).populate("submittedBy", "name email");

        const io = req.app.get("io");
        if (io) {
            io.emit("developerRequestUpdated", updatedRequest);
        }

        res.json(updatedRequest);
    } catch (err) {
        console.error("Update Developer Request Error:", err);
        res.status(500).json({ message: "Failed to update developer request" });
    }
};

// DELETE /api/developer-requests/:id
exports.deleteRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await DeveloperRequest.findByIdAndDelete(id);
        if (!request) {
            return res.status(404).json({ message: "Developer request not found" });
        }

        const io = req.app.get("io");
        if (io) {
            io.emit("developerRequestDeleted", id);
        }

        res.json({ message: "Developer request deleted successfully" });
    } catch (err) {
        console.error("Delete Developer Request Error:", err);
        res.status(500).json({ message: "Failed to delete developer request" });
    }
};
