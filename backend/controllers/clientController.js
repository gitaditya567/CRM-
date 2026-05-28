const Client = require("../models/Client");
const Group = require("../models/Group");
const Lead = require("../models/Lead");
const { clearCachePrefix } = require("../utils/cache");

// Create a new client
exports.createClient = async (req, res) => {
    try {
        const {
            group,
            clientName,
            legalEntityName,
            billingAddress,
            gstVatNo,
            contactPerson1,
            contactPerson2,
            isDispatchAddressSame,
            dispatchAddress,
            isVisible,
            isSecret,
            allowedUsers
        } = req.body;

        // Basic validation
        // Verify group exists if provided
        let prefix = "GEN";
        if (group) {
            const existingGroup = await Group.findById(group);
            if (!existingGroup) {
                return res.status(404).json({ message: "Selected group not found" });
            }
            // Use first 3 chars of group name or "GRP" if name is short/weird, ensuring uppercase
            prefix = existingGroup.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() || "GRP";
        }

        // Generate Unique Client ID
        // Find last client with this prefix to determine sequence
        // We look for IDs matching PREFIX-XXX
        const lastClient = await Client.findOne({
            clientId: { $regex: new RegExp(`^${prefix}-\\d+$`) }
        }).sort({ clientId: -1 }); // Sorting by clientId ensures we get the highest sequence number

        let sequence = 1;
        if (lastClient && lastClient.clientId) {
            const parts = lastClient.clientId.split('-');
            if (parts.length === 2 && !isNaN(parts[1])) {
                sequence = parseInt(parts[1], 10) + 1;
            }
        }

        const clientId = `${prefix}-${String(sequence).padStart(3, '0')}`;

        const newClient = new Client({
            group,
            clientName,
            legalEntityName,
            clientId,
            billingAddress,
            gstVatNo,
            contactPerson1,
            contactPerson2,
            isDispatchAddressSame,
            dispatchAddress: isDispatchAddressSame ? billingAddress : dispatchAddress,
            isVisible: isVisible !== undefined ? isVisible : true,
            isSecret: isSecret !== undefined ? isSecret : false,
            allowedUsers: allowedUsers || []
        });

        const savedClient = await newClient.save();

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("clientAdded", savedClient);
        }

        clearCachePrefix("dashboard_");
        res.status(201).json(savedClient);
    } catch (error) {
        console.error("Error creating client:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all clients
exports.getClients = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const group = req.query.group;
        const skip = (page - 1) * limit;

        let query = {};
        const filters = [];

        // 1. Group Filter (supports ID or Name)
        if (group) {
            // Check if group is an ID or Name
            if (group.match(/^[0-9a-fA-F]{24}$/)) {
                filters.push({ group });
            } else {
                // If it's a name, we'll need to find the group ID first or use aggregation
                const foundGroup = await Group.findOne({ name: group });
                if (foundGroup) filters.push({ group: foundGroup._id });
            }
        }

        // 1b. Allotment Filter
        const allotment = req.query.allotment;
        if (allotment === "allotted") {
            filters.push({ group: { $exists: true, $ne: null } });
        } else if (allotment === "unallotted") {
            filters.push({ $or: [ { group: { $exists: false } }, { group: null } ] });
        }

        // 2. Search Filter
        const search = req.query.search;
        if (search) {
            filters.push({
                $or: [
                    { clientName: { $regex: search, $options: "i" } },
                    { legalEntityName: { $regex: search, $options: "i" } },
                    { clientId: { $regex: search, $options: "i" } },
                    { "billingAddress.city": { $regex: search, $options: "i" } },
                    { "billingAddress.state": { $regex: search, $options: "i" } }
                ]
            });
        }

        // 3. Permission/Visibility Filter
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

        if (filters.length > 0) {
            query = filters.length === 1 ? filters[0] : { $and: filters };
        }

        let totalClients;
        if (Object.keys(query).length === 0) {
            totalClients = await Client.estimatedDocumentCount();
        } else {
            totalClients = await Client.countDocuments(query);
        }
        const clients = await Client.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("group", "name priceType")
            .lean();

        res.status(200).json({
            clients,
            pagination: {
                totalClients,
                totalPages: Math.ceil(totalClients / limit),
                currentPage: page,
                limit
            }
        });
    } catch (error) {
        console.error("Error fetching clients:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get specific client
exports.getClientById = async (req, res) => {
    try {
        const client = await Client.findById(req.params.id).populate("group", "name");
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        res.status(200).json(client);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update client
exports.updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const currentClient = await Client.findById(id);

        if (!currentClient) {
            return res.status(404).json({ message: "Client not found" });
        }

        // Logic to generate Client ID if missing and group is provided/exists
        const newGroup = req.body.group || currentClient.group;

        let clientIdUpdate = {};

        if (!currentClient.clientId && newGroup) {
            // Generate New Client ID
            const existingGroup = await Group.findById(newGroup);
            if (existingGroup) {
                const prefix = existingGroup.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() || "GRP";

                const lastClient = await Client.findOne({
                    clientId: { $regex: new RegExp(`^${prefix}-\\d+$`) }
                }).sort({ clientId: -1 });

                let sequence = 1;
                if (lastClient && lastClient.clientId) {
                    const parts = lastClient.clientId.split('-');
                    if (parts.length === 2 && !isNaN(parts[1])) {
                        sequence = parseInt(parts[1], 10) + 1;
                    }
                }
                clientIdUpdate.clientId = `${prefix}-${String(sequence).padStart(3, '0')}`;
            }
        }

        const updatedClient = await Client.findByIdAndUpdate(
            id,
            { ...req.body, ...clientIdUpdate },
            { new: true, runValidators: true }
        ).populate("group", "name priceType");

        // MASTER DATA SYNC: Update all associated leads if client name changed
        if (req.body.clientName && req.body.clientName !== currentClient.clientName) {
            try {
                const leadUpdateResult = await Lead.updateMany(
                    { 
                        name: currentClient.clientName,
                        group: currentClient.group 
                    },
                    { $set: { name: req.body.clientName } }
                );
                console.log(`Master Data Sync: Updated ${leadUpdateResult.modifiedCount} leads due to client name change.`);
            } catch (leadUpdateError) {
                console.error("Master Data Sync Error (Leads):", leadUpdateError);
            }
        }

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("clientUpdated", updatedClient);
            // Also notify leads update
            io.emit("leadUpdated", { message: "Master data synced" });
        }

        clearCachePrefix("dashboard_");
        res.status(200).json(updatedClient);
    } catch (error) {
        console.error("Update Client Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete client
exports.deleteClient = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[DEBUG] Attempting to delete client with ID: ${id}`);
        
        if (!id) {
            return res.status(400).json({ message: "Client ID is required" });
        }

        const deletedClient = await Client.findByIdAndDelete(id);
        
        if (!deletedClient) {
            console.log(`[DEBUG] Client not found with ID: ${id}`);
            return res.status(404).json({ message: "Client not found" });
        }

        console.log(`[DEBUG] Successfully deleted client: ${deletedClient.clientName}`);

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("clientDeleted", id);
        }

        clearCachePrefix("dashboard_");
        res.status(200).json({ message: "Client deleted successfully" });
    } catch (error) {
        console.error("Delete Client Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
