const Product = require("../models/Product");
const Lead = require("../models/Lead");
const Client = require("../models/Client");
const Quotation = require("../models/Quotation");
const User = require("../models/User");
const mongoose = require("mongoose");
const { getCache, setCache } = require("../utils/cache");

// Helper to get filters based on user role and potential staff query
const getDashboardFilters = async (user, queryStaff = null) => {
    const userRole = user.role?.toLowerCase();
    const isAdmin = userRole === "admin" || userRole === "superadmin";
    
    let leadFilter = {};
    if (isAdmin && queryStaff && queryStaff !== "all") {
        try {
            if (mongoose.Types.ObjectId.isValid(queryStaff)) {
                leadFilter = { assignedTo: new mongoose.Types.ObjectId(queryStaff) };
            } else {
                leadFilter = { source: queryStaff };
            }
        } catch (e) {
            leadFilter = { source: queryStaff };
        }
    } else if (!isAdmin) {
        if (userRole === "sales" || userRole === "services") {
            leadFilter = {
                $or: [
                    { assignedTo: user._id },
                    { source: user.name }
                ]
            };
        } else {
            leadFilter = {
                $or: [
                    { assignedTo: user._id },
                    { source: user.name },
                    { assignedTo: null }
                ]
            };
        }
    }

    const clientFilter = isAdmin ? {} : {
        $or: [
            { isSecret: { $ne: true }, isVisible: true },
            { allowedUsers: user._id }
        ]
    };

    return { isAdmin, leadFilter, clientFilter, userRole };
};

// @desc    Get dashboard summary (Counts & Leaderboard)
// @route   GET /api/dashboard/summary
const getDashboardSummary = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const queryStaff = req.query.staff || "";

        const cacheKey = `dashboard_summary_${userId}_${queryStaff}`;
        const cachedData = getCache(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        const { isAdmin, leadFilter, clientFilter, userRole } = await getDashboardFilters(req.user, queryStaff);

        let quotationFilter = {};
        if (isAdmin) {
            if (queryStaff && queryStaff !== "all") {
                if (mongoose.Types.ObjectId.isValid(queryStaff)) {
                    quotationFilter = { createdBy: new mongoose.Types.ObjectId(queryStaff) };
                } else {
                    const userLeads = await Lead.find(leadFilter).select("_id").limit(1000).lean();
                    const leadIds = userLeads.map(l => l._id);
                    quotationFilter = { lead: { $in: leadIds } };
                }
            }
        } else {
            const userLeads = await Lead.find(leadFilter).select("_id").limit(1000).lean();
            const leadIds = userLeads.map(l => l._id);
            quotationFilter = (userRole === "sales" || userRole === "services" || userRole === "staff")
                ? { $or: [{ createdBy: req.user._id }, { lead: { $in: leadIds } }] }
                : { lead: { $in: leadIds } };
        }

        // Core queries
        const coreTasks = [
            Product.estimatedDocumentCount(),
            Lead.countDocuments(leadFilter),
            Client.countDocuments(clientFilter),
            User.estimatedDocumentCount(),
            Lead.aggregate([
                { $match: leadFilter },
                { $group: { 
                    _id: "$status", 
                    count: { $sum: 1 },
                    myCount: { $sum: { $cond: [{ $eq: ["$source", req.user.name] }, 1, 0] } },
                    assignedCount: { $sum: { $cond: [{ $eq: ["$assignedTo", req.user._id] }, 1, 0] } }
                } }
            ])
        ];

        // Add admin-only tasks
        if (isAdmin) {
            coreTasks.push(Quotation.countDocuments(quotationFilter));
            coreTasks.push(Quotation.countDocuments({ ...quotationFilter, createdBy: userId }));
        }

        const results = await Promise.all(coreTasks);
        
        const [
            productCount,
            leadCount,
            clientCount,
            userCount,
            leadStatusStats
        ] = results;

        let quotationCount = 0;
        let editedQuotes = 0;

        if (isAdmin) {
            quotationCount = results[5] || 0;
            editedQuotes = results[6] || 0;
        } else {
            // Optimization: Combine quotation counts for non-admins
            const userLeadIds = await Lead.find(leadFilter).distinct("_id");
            const [qTotal, qEdited] = await Promise.all([
                Quotation.countDocuments({
                    $or: [
                        { createdBy: userId },
                        { lead: { $in: userLeadIds } }
                    ]
                }),
                Quotation.countDocuments({ createdBy: userId })
            ]);
            quotationCount = qTotal;
            editedQuotes = qEdited;
        }

        // Map status stats
        const statusMap = {};
        let myLeads = 0;
        let assignedLeads = 0;
        
        leadStatusStats.forEach(item => {
            if (item._id) statusMap[item._id] = item.count;
            myLeads += (item.myCount || 0);
            assignedLeads += (item.assignedCount || 0);
        });

        // Staff Performance Leaderboard for all roles
        const staffPerformance = await Lead.aggregate([
            { $match: { assignedTo: { $ne: null } } },
            { $group: {
                _id: "$assignedTo",
                leadsCount: { $sum: 1 },
                wonLeads: { $sum: { $cond: [{ $eq: ["$status", "Won"] }, 1, 0] } },
                qualifiedLeads: { $sum: { $cond: [{ $eq: ["$status", "Qualified"] }, 1, 0] } }
            }},
            { $sort: { wonLeads: -1, qualifiedLeads: -1 } },
            { $limit: 5 },
            { $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user"
            }},
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            { $project: {
                name: { $ifNull: ["$user.name", "Unknown Staff"] },
                role: { $ifNull: ["$user.role", "Staff"] },
                leadsCount: 1,
                wonLeads: 1,
                qualifiedLeads: 1
            }}
        ]);

        const responseData = {
            products: productCount,
            leads: leadCount,
            clients: clientCount,
            quotations: quotationCount,
            users: userCount,
            myLeads,
            assignedLeads,
            qualifiedLeads: statusMap["Qualified"] || 0,
            submittedQuotes: statusMap["Quotation Submitted"] || 0,
            wonQuotes: statusMap["Won"] || 0,
            lostQuotes: statusMap["Lost"] || 0,
            editedQuotes,
            staffPerformance
        };

        setCache(cacheKey, responseData, 60000); // Cache for 60 seconds
        res.json(responseData);
    } catch (error) {
        console.error("Summary Error:", error);
        res.status(500).json({ message: "Error fetching summary" });
    }
};

// @desc    Get dashboard charts
// @route   GET /api/dashboard/charts
const getDashboardCharts = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const queryStaff = req.query.staff || "";

        const cacheKey = `dashboard_charts_${userId}_${queryStaff}`;
        const cachedData = getCache(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        const { isAdmin, leadFilter, userRole } = await getDashboardFilters(req.user, queryStaff);
        
        let quotationFilter = {};
        if (isAdmin) {
            if (queryStaff && queryStaff !== "all") {
                if (mongoose.Types.ObjectId.isValid(queryStaff)) {
                    quotationFilter = { createdBy: new mongoose.Types.ObjectId(queryStaff) };
                } else {
                    const userLeads = await Lead.find(leadFilter).select("_id").limit(1000).lean();
                    const leadIds = userLeads.map(l => l._id);
                    quotationFilter = { lead: { $in: leadIds } };
                }
            }
        } else {
            const userLeads = await Lead.find(leadFilter).select("_id").limit(1000).lean();
            const leadIds = userLeads.map(l => l._id);
            quotationFilter = (userRole === "sales" || userRole === "services" || userRole === "staff")
                ? { $or: [{ createdBy: req.user._id }, { lead: { $in: leadIds } }] }
                : { lead: { $in: leadIds } };
        }

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const [leadsOverTime, quotationStats] = await Promise.all([
            Lead.aggregate([
                { $match: { createdAt: { $gte: sixMonthsAgo }, ...leadFilter } },
                { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
                { $sort: { "_id": 1 } }
            ]),
            Quotation.aggregate([
                { $match: quotationFilter },
                { $group: { _id: "$status", value: { $sum: 1 }, totalAmount: { $sum: "$grandTotal" } } }
            ])
        ]);

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const formattedLeadsChart = leadsOverTime.map(item => ({
            name: months[item._id - 1],
            leads: item.count
        }));

        const formattedSalesChart = quotationStats.map(item => ({
            name: item._id || "Draft",
            value: item.value,
            amount: item.totalAmount
        }));

        const responseData = {
            leadsOverTime: formattedLeadsChart,
            salesData: formattedSalesChart
        };
        setCache(cacheKey, responseData, 60000); // Cache for 60 seconds
        res.json(responseData);
    } catch (error) {
        console.error("Charts Error:", error);
        res.status(500).json({ message: "Error fetching charts" });
    }
};

// @desc    Get dashboard activity
// @route   GET /api/dashboard/activity
const getDashboardActivity = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const queryStaff = req.query.staff || "";

        const cacheKey = `dashboard_activity_${userId}_${queryStaff}`;
        const cachedData = getCache(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        const { isAdmin, leadFilter, userRole } = await getDashboardFilters(req.user, queryStaff);
        
        let quotationFilter = {};
        if (isAdmin) {
            if (queryStaff && queryStaff !== "all") {
                if (mongoose.Types.ObjectId.isValid(queryStaff)) {
                    quotationFilter = { createdBy: new mongoose.Types.ObjectId(queryStaff) };
                } else {
                    const userLeads = await Lead.find(leadFilter).select("_id").limit(1000).lean();
                    const leadIds = userLeads.map(l => l._id);
                    quotationFilter = { lead: { $in: leadIds } };
                }
            }
        } else {
            const userLeads = await Lead.find(leadFilter).select("_id").limit(1000).lean();
            const leadIds = userLeads.map(l => l._id);
            quotationFilter = (userRole === "sales" || userRole === "services" || userRole === "staff")
                ? { $or: [{ createdBy: req.user._id }, { lead: { $in: leadIds } }] }
                : { lead: { $in: leadIds } };
        }

        const [recentLeads, recentQuotations] = await Promise.all([
            Lead.find(leadFilter).sort({ createdAt: -1 }).limit(5).select("name status createdAt").lean(),
            Quotation.find(quotationFilter).sort({ createdAt: -1 }).limit(5).populate("lead", "name").select("quotationNumber grandTotal createdAt").lean()
        ]);

        const responseData = {
            leads: recentLeads,
            quotations: recentQuotations
        };
        setCache(cacheKey, responseData, 10000); // Cache for 10 seconds
        res.json(responseData);
    } catch (error) {
        console.error("Activity Error:", error);
        res.status(500).json({ message: "Error fetching activity" });
    }
};

// Legacy support
const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const queryStaff = req.query.staff || "";

        const cacheKey = `dashboard_stats_${userId}_${queryStaff}`;
        const cachedData = getCache(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        const { isAdmin, leadFilter, clientFilter, userRole } = await getDashboardFilters(req.user, queryStaff);
        
        let quotationFilter = {};
        if (isAdmin) {
            if (queryStaff && queryStaff !== "all") {
                if (mongoose.Types.ObjectId.isValid(queryStaff)) {
                    quotationFilter = { createdBy: new mongoose.Types.ObjectId(queryStaff) };
                } else {
                    const userLeads = await Lead.find(leadFilter).select("_id").limit(1000).lean();
                    const leadIds = userLeads.map(l => l._id);
                    quotationFilter = { lead: { $in: leadIds } };
                }
            }
        } else {
            const userLeads = await Lead.find(leadFilter).select("_id").limit(1000).lean();
            const leadIds = userLeads.map(l => l._id);
            quotationFilter = (userRole === "sales" || userRole === "services" || userRole === "staff")
                ? { $or: [{ createdBy: req.user._id }, { lead: { $in: leadIds } }] }
                : { lead: { $in: leadIds } };
        }

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const [
            totalCounts,
            leadStats,
            quoteStats,
            recentActivity,
            leadsOverTime,
            quotationCharts
        ] = await Promise.all([
            Promise.all([
                Product.countDocuments(),
                Lead.countDocuments(leadFilter),
                Client.countDocuments(clientFilter),
                Quotation.countDocuments(quotationFilter),
                User.countDocuments()
            ]),
            Lead.aggregate([
                { $match: leadFilter },
                { $group: {
                    _id: null,
                    myLeads: { $sum: { $cond: [{ $eq: ["$source", req.user.name] }, 1, 0] } },
                    assignedLeads: { $sum: { $cond: [{ $eq: ["$assignedTo", req.user._id] }, 1, 0] } },
                    qualified: { $sum: { $cond: [{ $eq: ["$status", "Qualified"] }, 1, 0] } },
                    submitted: { $sum: { $cond: [{ $eq: ["$status", "Quotation Submitted"] }, 1, 0] } },
                    won: { $sum: { $cond: [{ $eq: ["$status", "Won"] }, 1, 0] } },
                    lost: { $sum: { $cond: [{ $eq: ["$status", "Lost"] }, 1, 0] } }
                }}
            ]),
            Quotation.countDocuments({ createdBy: req.user._id }),
            Promise.all([
                Lead.find(leadFilter).sort({ createdAt: -1 }).limit(5).select("name status createdAt").lean(),
                Quotation.find(quotationFilter).sort({ createdAt: -1 }).limit(5).populate("lead", "name").select("quotationNumber grandTotal createdAt").lean()
            ]),
            Lead.aggregate([
                { $match: { createdAt: { $gte: sixMonthsAgo }, ...leadFilter } },
                { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
                { $sort: { "_id": 1 } }
            ]),
            Quotation.aggregate([
                { $match: quotationFilter },
                { $group: { _id: "$status", value: { $sum: 1 }, totalAmount: { $sum: "$grandTotal" } } }
            ])
        ]);

        const lStat = leadStats[0] || { myLeads: 0, assignedLeads: 0, qualified: 0, submitted: 0, won: 0, lost: 0 };
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const responseData = {
            counts: {
                products: totalCounts[0],
                leads: totalCounts[1],
                clients: totalCounts[2],
                quotations: totalCounts[3],
                users: totalCounts[4],
                myLeads: lStat.myLeads,
                assignedLeads: lStat.assignedLeads,
                qualifiedLeads: lStat.qualified,
                submittedQuotes: lStat.submitted,
                wonQuotes: lStat.won,
                lostQuotes: lStat.lost,
                editedQuotes: quoteStats
            },
            recentActivity: {
                leads: recentActivity[0],
                quotations: recentActivity[1]
            },
            charts: {
                leadsOverTime: leadsOverTime.map(item => ({ name: months[item._id - 1], leads: item.count })),
                salesData: quotationCharts.map(item => ({ name: item._id || "Draft", value: item.value, amount: item.totalAmount }))
            }
        };
        setCache(cacheKey, responseData, 60000); // Cache for 60 seconds
        res.json(responseData);
    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).json({ message: "Error fetching stats" });
    }
};

module.exports = { 
  getDashboardStats, 
  getDashboardSummary, 
  getDashboardCharts, 
  getDashboardActivity 
};
