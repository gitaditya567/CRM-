const Group = require("../models/Group");

// GET /api/groups
exports.getGroups = async (req, res) => {
    try {
        let query = {};
        const filters = [];

        // 1. Permission/Visibility Filter
        if (req.user) {
            const userRole = req.user.role?.toLowerCase();
            if (userRole !== 'admin' && userRole !== 'superadmin') {
                filters.push({
                    $or: [
                        { isSecret: { $ne: true }, isVisible: true },
                        { allowedUsers: req.user._id }
                    ]
                });
            }
        } else {
            filters.push({ isSecret: false, isVisible: true });
        }

        // 2. Search Filter
        const search = req.query.search;
        if (search) {
            filters.push({
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } }
                ]
            });
        }

        if (filters.length > 0) {
            query = filters.length === 1 ? filters[0] : { $and: filters };
        }

        console.log("Group Query:", JSON.stringify(query));
        const groups = await Group.find(query).sort({ name: 1 }).lean();
        console.log(`Found ${groups.length} groups.`);
        res.json(groups);
    } catch (err) {
        console.error("Get Groups Error:", err);
        res.status(500).json({ message: "Failed to fetch groups" });
    }
};

// POST /api/groups
exports.createGroup = async (req, res) => {
    try {
        const { name, description, isVisible, isSecret, allowedUsers, priceType } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Group name is required" });
        }

        const newGroup = new Group({
            name,
            description,
            isVisible: isVisible !== undefined ? isVisible : true,
            isSecret: isSecret !== undefined ? isSecret : false,
            allowedUsers: allowedUsers || [],
            priceType: priceType || 'default'
        });

        // If creator is not admin and group is secret, add them to allowedUsers automatically
        if (req.user && req.user.role !== 'admin' && isSecret && !newGroup.allowedUsers.includes(req.user._id)) {
            newGroup.allowedUsers.push(req.user._id);
        }
        await newGroup.save();
        res.status(201).json(newGroup);
    } catch (err) {
        console.error("Create Group Error:", err);
        res.status(500).json({ message: "Failed to create group" });
    }
};

// DELETE /api/groups/:id
exports.deleteGroup = async (req, res) => {
    try {
        await Group.findByIdAndDelete(req.params.id);
        res.json({ message: "Group deleted" });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete group" });
    }
};

// PUT /api/groups/:id
exports.updateGroup = async (req, res) => {
    try {
        const { name, isVisible, isSecret, allowedUsers, priceType } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Group name is required" });
        }

        const updatedGroup = await Group.findByIdAndUpdate(
            req.params.id,
            { name, isVisible, isSecret, allowedUsers, priceType },
            { new: true }
        );

        if (!updatedGroup) {
            return res.status(404).json({ message: "Group not found" });
        }

        res.json(updatedGroup);
    } catch (err) {
        console.error("Update Group Error:", err);
        res.status(500).json({ message: "Failed to update group" });
    }
};

