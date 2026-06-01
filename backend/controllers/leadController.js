const Lead = require("../models/Lead");
const Client = require("../models/Client");
const { clearCachePrefix } = require("../utils/cache");

// GET /api/leads
exports.getLeads = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        let filter = {};
        const { filterType } = req.query;

        if (req.user && req.user.role?.toLowerCase() !== "admin" && req.user.role?.toLowerCase() !== "superadmin") {
            const userRole = req.user.role?.toLowerCase();
            if (userRole === "sales" || userRole === "services") {
                filter = {
                    $or: [
                        { assignedTo: req.user._id },
                        { createdBy: req.user._id },
                        { source: req.user.name }
                    ]
                };
            } else {
                filter = {
                    $or: [
                        { assignedTo: req.user._id },
                        { source: req.user.name },
                        { assignedTo: null }
                    ]
                };
            }
        }

        // Apply specific filters
        if (filterType === "created") {
            if (filter.$or) {
                filter = { $and: [filter, { createdBy: req.user._id }] };
            } else {
                filter.createdBy = req.user._id;
            }
        } else if (filterType === "assigned") {
            if (filter.$or) {
                filter = { $and: [filter, { assignedTo: req.user._id }] };
            } else {
                filter.assignedTo = req.user._id;
            }
        } else if (filterType === "assignedByMe") {
            if (filter.$or) {
                filter = { $and: [filter, { assignedBy: req.user._id }] };
            } else {
                filter.assignedBy = req.user._id;
            }
        } else if (filterType === "my_leads") {
            const myLeadsCondition = {
                $or: [
                    { createdBy: req.user._id },
                    { assignedTo: req.user._id }
                ]
            };
            if (filter.$or) {
                filter = { $and: [filter, myLeadsCondition] };
            } else {
                // If filter is currently empty or just has other fields, we can use $or
                // But better to use $and if it's not empty, or just assign $or directly if it is.
                if (Object.keys(filter).length > 0) {
                     filter = { $and: [filter, myLeadsCondition] };
                } else {
                     filter = myLeadsCondition;
                }
            }
        }

        if (req.query.staff) {
            const staffCondition = {
                $or: [
                    { assignedTo: req.query.staff },
                    { createdBy: req.query.staff }
                ]
            };
            if (Object.keys(filter).length > 0) {
                filter = { $and: [filter, staffCondition] };
            } else {
                filter = staffCondition;
            }
        }

        if (req.query.status) {
            filter.status = req.query.status;
        }

        if (req.query.startDate || req.query.endDate) {
            filter.createdAt = {};
            if (req.query.startDate) {
                filter.createdAt.$gte = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                const end = new Date(req.query.endDate);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        if (req.query.search) {
            const escapedSearch = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const searchFilter = {
                $or: [
                    { name: { $regex: escapedSearch, $options: "i" } },
                    { email: { $regex: escapedSearch, $options: "i" } },
                    { phone: { $regex: escapedSearch, $options: "i" } },
                    { leadNumber: { $regex: escapedSearch, $options: "i" } },
                    { source: { $regex: escapedSearch, $options: "i" } }
                ]
            };
            // Merge with existing filters
            if (Object.keys(filter).length > 0) {
                filter = { $and: [filter, searchFilter] };
            } else {
                filter = searchFilter;
            }
        }

        if (req.query.excludeQuoted === "true") {
            const Quotation = require("../models/Quotation");
            const quotedLeadIds = await Quotation.distinct("lead");
            const excludeFilter = { _id: { $nin: quotedLeadIds } };
            if (Object.keys(filter).length > 0) {
                filter = { $and: [filter, excludeFilter] };
            } else {
                filter = excludeFilter;
            }
        }

        let totalLeads;
        if (Object.keys(filter).length === 0) {
            totalLeads = await Lead.estimatedDocumentCount();
        } else {
            totalLeads = await Lead.countDocuments(filter);
        }
        const leads = await Lead.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select("-remarks")
            .populate("group", "name priceType")
            .populate("assignedTo", "name")
            .populate("createdBy", "name role")
            .populate("assignedBy", "name role")
            .lean();

        const Quotation = require("../models/Quotation");
        const piLeads = await Quotation.find({ quotationNumber: /^PI/i }).distinct("lead");
        const piLeadIdsSet = new Set(piLeads.map(id => id.toString()));

        const leadsWithPI = leads.map(lead => ({
            ...lead,
            hasPI: piLeadIdsSet.has(lead._id.toString())
        }));

        res.json({
            leads: leadsWithPI,
            pagination: {
                totalLeads,
                totalPages: Math.ceil(totalLeads / limit),
                currentPage: page,
                limit
            }
        });
    } catch (err) {
        console.error("Get Leads Error:", err);
        res.status(500).json({ message: "Failed to fetch leads" });
    }
};

// POST /api/leads
exports.createLead = async (req, res) => {
    try {
        const { name, email, phone, status, source, notes, leadType, assignedTo, isTemporaryClient } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ message: "Name and Phone are required" });
        }

        // Determine Source (Creator Name)
        let creatorName = "Direct";
        if (req.user) {
            let user = req.user;
            // Fetch detailed user info if not present (e.g. from a light token payload)
            if (!user.role || !user.name) {
                const User = require("../models/User");
                user = await User.findById(req.user.id || req.user._id);
            }

            if (user) {
                if (user.role === "admin") {
                    creatorName = "Administrator";
                } else {
                    creatorName = user.name;
                }
            }
        }

        // Generate Lead Number: L-YYMMDD-USER-001
        const date = new Date();
        const yy = String(date.getFullYear()).slice(-2);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const dateStr = `${yy}${mm}${dd}`;

        let initials = "SYS";
        if (req.user) {
            let uName = req.user.name || "User";
            // Get initials: e.g. "John Doe" -> "JD"
            const parts = uName.split(' ').filter(p => p.length > 0);
            if (parts.length >= 2) {
                initials = (parts[0][0] + parts[1][0]).toUpperCase();
            } else if (parts.length === 1) {
                initials = parts[0].substring(0, 2).toUpperCase();
            }
        }

        // Handle Temporary Client Creation
        if (isTemporaryClient) {
            // Check if client already exists with this name (optional but good to avoid duplicates)
            // But user might want to force create. Let's create one.

            const newClient = new Client({
                clientName: name, // From Lead Name
                legalEntityName: name, // Default to same
                // clientId, // Skip ID generation for temporary clients
                group: null, // No group
                billingAddress: {
                    addressLine1: "Pending Update",
                    addressLine2: "",
                    city: "Pending",
                    distt: "Pending",
                    state: "Pending",
                    zipCode: "000000",
                    country: "India"
                }, // Placeholders
                gstVatNo: "Pending",
                contactPerson1: {
                    name: name,
                    designation: "Owner/Contact",
                    phone: phone,
                    email: email || "pending@update.com"
                },
                isDispatchAddressSame: true,
                dispatchAddress: {
                    addressLine1: "Pending Update",
                    addressLine2: "",
                    city: "Pending",
                    distt: "Pending",
                    state: "Pending",
                    zipCode: "000000",
                    country: "India"
                }
            });

            await newClient.save();
        }

        // Find last lead created today to increment sequence
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        // Count leads created today to determine sequence
        // Note: Using countDocuments might have race conditions in high concurrency but sufficient for now.
        // Better approach: findOne sorted by createdAt desc for today only.
        const lastLead = await Lead.findOne({
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        }).sort({ createdAt: -1 });

        let seq = 1;
        if (lastLead && lastLead.leadNumber) {
            const parts = lastLead.leadNumber.split('-');
            const lastSeq = parseInt(parts.at(-1)); // Expecting L-DATE-USER-SEQ
            if (!isNaN(lastSeq)) seq = lastSeq + 1;
        }

        const leadNumber = `L-${dateStr}-${initials}-${String(seq).padStart(3, '0')}`;

        const newLead = new Lead({
            leadNumber,
            name,
            email,
            phone,
            status: status || "New",
            source: creatorName,
            createdBy: req.user?._id || null, // Track creator explicitly
            group: req.body.group || null,
            leadType: leadType || "General",
            assignedTo: assignedTo || null,
            assignedBy: assignedTo ? req.user?._id : null,
            notes: notes || "", // Keep for backward compatibility
            remarks: notes ? [{ text: notes }] : []
        });

        await newLead.save();

        // Emit socket event with populated fields for real-time notifications/UI updates
        const io = req.app.get("io");
        if (io) {
            const populatedLead = await Lead.findById(newLead._id)
                .populate("assignedTo", "name")
                .populate("createdBy", "name")
                .populate("group", "name");
            io.emit("leadAdded", populatedLead);
        }

        clearCachePrefix("dashboard_");
        res.status(201).json(newLead);
    } catch (err) {
        console.error("Create Lead Error:", err);
        // Handle duplicate key error if sequence collision happens (retry logic could be added)
        if (err.code === 11000 && err.keyPattern && err.keyPattern.leadNumber) {
            return res.status(500).json({ message: "Failed to generate unique Lead ID, please try again." });
        }
        res.status(500).json({ message: "Failed to create lead" });
    }
};

// PUT /api/leads/:id
exports.updateLead = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes, ...otherUpdates } = req.body;

        const updateOps = { $set: otherUpdates };

        if (notes && notes.trim() !== "") {
            updateOps.$push = { remarks: { text: notes } };
        }

        const currentLead = await Lead.findById(id).populate("assignedBy", "role").populate("createdBy", "role");
        if (!currentLead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        // Assignment Track: If assignedTo is being updated, track who did it
        if (otherUpdates.assignedTo && String(otherUpdates.assignedTo) !== String(currentLead.assignedTo)) {
            updateOps.$set.assignedBy = req.user._id;
        }

        // Admin Lead Rule: If lead was created or assigned by an admin, anyone can edit.
        const isAdminLead = (currentLead.createdBy && currentLead.createdBy.role === "admin") || 
                           (currentLead.assignedBy && currentLead.assignedBy.role === "admin");

        if (!isAdminLead) {
            // Ownership Check: Admin, Superadmin, Creator, OR Assigned User can update
            const userRole = req.user.role?.toLowerCase();
            const isCreator = currentLead.createdBy && String(currentLead.createdBy._id || currentLead.createdBy) === String(req.user._id);
            const isAssigned = currentLead.assignedTo && String(currentLead.assignedTo._id || currentLead.assignedTo) === String(req.user._id);

            if (userRole !== "admin" && userRole !== "superadmin" && !isCreator && !isAssigned) {
                return res.status(403).json({ message: "Forbidden: You can only update leads you created or are assigned to" });
            }
        }

        // Restrict status flow: If current status is NOT "New", prevent moving back to "New"
        if (otherUpdates.status === "New" && currentLead.status !== "New") {
            return res.status(400).json({ message: "Lead cannot be moved back to New status" });
        }

        const lead = await Lead.findByIdAndUpdate(id, updateOps, { new: true }).populate("group").populate("createdBy", "name");

        let leadObj = lead;
        if (lead) {
            const Quotation = require("../models/Quotation");
            const hasPI = await Quotation.exists({ lead: lead._id, quotationNumber: /^PI/i });
            leadObj = lead.toObject ? lead.toObject() : lead;
            leadObj.hasPI = !!hasPI;
        }

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("leadUpdated", leadObj);
        }

        clearCachePrefix("dashboard_");
        res.json(leadObj);
    } catch (err) {
        console.error("Update Lead Error:", err);
        res.status(500).json({ message: "Failed to update lead" });
    }
};

// DELETE /api/leads/:id
exports.deleteLead = async (req, res) => {
    try {
        const { id } = req.params;
        const currentLead = await Lead.findById(id).populate("assignedBy", "role").populate("createdBy", "role");
        if (!currentLead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        // Ownership Check: Only Admin or Creator can delete
        // Special Rule: Superadmin can't delete if assigned by Admin
        const userRole = req.user.role?.toLowerCase();
        const isSuperAdmin = userRole === "superadmin";
        const isAdmin = userRole === "admin";
        const isAssignedByAdmin = currentLead.assignedBy && (currentLead.assignedBy.role?.toLowerCase() === "admin" || currentLead.assignedBy.role?.toLowerCase() === "superadmin"); 
        // Note: The user said "assigned by admin", assuming "admin" role.
        
        if (isSuperAdmin && isAssignedByAdmin) {
            return res.status(403).json({ message: "Forbidden: Superadmin cannot delete leads assigned by an Administrator" });
        }

        if (userRole !== "admin" && 
            userRole !== "superadmin" &&
            currentLead.createdBy && 
            String(currentLead.createdBy._id || currentLead.createdBy) !== String(req.user._id)) {
            return res.status(403).json({ message: "Forbidden: You can only delete leads you created" });
        }

        await Lead.findByIdAndDelete(id);

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("leadDeleted", id);
        }

        clearCachePrefix("dashboard_");
        res.json({ message: "Lead deleted successfully" });
    } catch (err) {
        console.error("Delete Lead Error:", err);
        res.status(500).json({ message: "Failed to delete lead" });
    }
};

// POST /api/leads/bulk-delete
exports.deleteMultipleLeads = async (req, res) => {
    try {
        const { ids } = req.body; // Expecting an array of IDs

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "No IDs provided for deletion" });
        }

        let filter = { _id: { $in: ids } };
        
        // Ownership Check for Bulk Delete
        const userRole = req.user.role?.toLowerCase();
        if (userRole !== "admin" && userRole !== "superadmin") {
            filter.createdBy = req.user._id;
        }

        // Special Rule for Superadmin: Filter out leads assigned by Admin
        if (userRole === "superadmin") {
            const adminUsers = await require("../models/User").find({ role: /admin/i }).select("_id");
            const adminIds = adminUsers.map(u => u._id);
            filter.assignedBy = { $nin: adminIds };
        }

        await Lead.deleteMany(filter);

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("leadsBulkDeleted", ids);
        }

        clearCachePrefix("dashboard_");
        res.json({ message: "Leads deleted successfully" });
    } catch (err) {
        console.error("Bulk Delete Leads Error:", err);
        res.status(500).json({ message: "Failed to delete leads" });
    }
};

// GET /api/leads/:id
exports.getLeadById = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await Lead.findById(id)
            .populate("group")
            .populate("assignedTo", "name")
            .populate("createdBy", "name role")
            .populate("assignedBy", "name role")
            .lean();
        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }
        const Quotation = require("../models/Quotation");
        const hasPI = await Quotation.exists({ lead: lead._id, quotationNumber: /^PI/i });
        lead.hasPI = !!hasPI;
        res.json(lead);
    } catch (err) {
        console.error("Get Lead By ID Error:", err);
        res.status(500).json({ message: "Failed to fetch lead details" });
    }
};
