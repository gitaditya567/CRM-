const Lead = require("../models/Lead");
const Quotation = require("../models/Quotation");
const { clearCachePrefix } = require("../utils/cache");

// Helper to check if a follow-up is today or in the past (due/overdue)
const isFollowUpDue = (followUps) => {
    if (!followUps || followUps.length === 0) return false;
    const sorted = [...followUps].sort((a, b) => new Date(a.date) - new Date(b.date));
    const latest = sorted[sorted.length - 1];
    return new Date(latest.date) <= new Date();
};

// GET /api/ai/briefing
exports.getDailyBriefing = async (req, res) => {
    try {
        let filter = {};
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

        // Fetch active leads (excluding Won/Lost)
        const leads = await Lead.find({
            ...filter,
            status: { $nin: ["Won", "Lost"] }
        })
        .populate("assignedTo", "name")
        .populate("group", "name")
        .lean();

        const today = new Date();
        today.setHours(23, 59, 59, 999);

        const briefing = {
            todayFollowUps: [],
            newLeads: [],
            overdueLeads: []
        };

        leads.forEach(lead => {
            if (!lead.followUps || lead.followUps.length === 0) {
                if (lead.status === "New") {
                    briefing.newLeads.push({
                        id: lead._id,
                        leadNumber: lead.leadNumber,
                        name: lead.name,
                        phone: lead.phone,
                        status: lead.status,
                        createdAt: lead.createdAt
                    });
                }
            } else {
                const sorted = [...lead.followUps].sort((a, b) => new Date(a.date) - new Date(b.date));
                const latest = sorted[sorted.length - 1];
                const followUpDate = new Date(latest.date);

                const item = {
                    id: lead._id,
                    leadNumber: lead.leadNumber,
                    name: lead.name,
                    phone: lead.phone,
                    status: lead.status,
                    scheduledDate: latest.date,
                    lastRemark: latest.remark
                };

                if (followUpDate <= new Date()) {
                    // Check if it's scheduled for today specifically
                    const isToday = followUpDate.toDateString() === new Date().toDateString();
                    if (isToday) {
                        briefing.todayFollowUps.push(item);
                    } else {
                        briefing.overdueLeads.push(item);
                    }
                }
            }
        });

        // Also fetch quotations that have overdue follow-ups
        let quoteFilter = {};
        if (req.user && req.user.role?.toLowerCase() !== "admin" && req.user.role?.toLowerCase() !== "superadmin") {
            // Match quotations created by user or linked to user's leads
            const leadIds = leads.map(l => l._id);
            quoteFilter = {
                $or: [
                    { createdBy: req.user._id },
                    { lead: { $in: leadIds } }
                ]
            };
        }

        const quotations = await Quotation.find({
            ...quoteFilter,
            quotationNumber: { $not: /^PI/i } // Exclude PIs which represent Won status
        })
        .populate("lead")
        .lean();

        const quoteFollowUps = [];
        quotations.forEach(q => {
            if (q.followUps && q.followUps.length > 0) {
                const sorted = [...q.followUps].sort((a, b) => new Date(a.date) - new Date(b.date));
                const latest = sorted[sorted.length - 1];
                const followUpDate = new Date(latest.date);

                // Only include if lead status is not Won/Lost
                const isLeadWonOrLost = q.lead && (q.lead.status === "Won" || q.lead.status === "Lost");

                if (!isLeadWonOrLost && followUpDate <= new Date()) {
                    quoteFollowUps.push({
                        id: q._id,
                        quotationNumber: q.quotationNumber,
                        clientName: q.billTo?.name || q.lead?.name || "Proposal Client",
                        leadName: q.lead?.name || "Direct",
                        status: q.status,
                        scheduledDate: latest.date,
                        lastRemark: latest.remark,
                        type: "quotation"
                    });
                }
            }
        });

        res.json({
            summary: {
                totalActionRequired: briefing.todayFollowUps.length + briefing.newLeads.length + briefing.overdueLeads.length + quoteFollowUps.length,
                todayFollowUpsCount: briefing.todayFollowUps.length,
                newLeadsCount: briefing.newLeads.length,
                overdueLeadsCount: briefing.overdueLeads.length,
                quotationFollowUpsCount: quoteFollowUps.length
            },
            agenda: {
                todayFollowUps: briefing.todayFollowUps,
                newLeads: briefing.newLeads,
                overdueLeads: briefing.overdueLeads,
                quotations: quoteFollowUps
            }
        });
    } catch (err) {
        console.error("Get Daily Briefing Error:", err);
        res.status(500).json({ message: "Failed to load daily briefing" });
    }
};

// Local Regex Rule-Based Parser
const parseFeedbackLocally = (feedback) => {
    const text = feedback.toLowerCase();
    let status = "Contacted";
    let daysToAdd = 3; // Default 3 days

    // Status logic
    if (text.includes("won") || text.includes("bought") || text.includes("deal closed") || text.includes("ordered") || text.includes("pi created")) {
        status = "Won";
    } else if (text.includes("lost") || text.includes("not interested") || text.includes("rejected") || text.includes("no need")) {
        status = "Lost";
    } else if (text.includes("quotation") || text.includes("send price") || text.includes("send offer") || text.includes("interested")) {
        status = "Qualified";
    }

    // Follow-up delay logic
    if (text.includes("tomorrow")) {
        daysToAdd = 1;
    } else if (text.includes("next week") || text.includes("after 7 days") || text.includes("7 days")) {
        daysToAdd = 7;
    } else if (text.includes("next monday")) {
        const today = new Date();
        const day = today.getDay();
        daysToAdd = (8 - day) % 7 || 7;
    } else if (text.includes("after 2 days") || text.includes("2 days")) {
        daysToAdd = 2;
    } else if (text.includes("after 5 days") || text.includes("5 days")) {
        daysToAdd = 5;
    }

    const nextFollowUpDate = new Date();
    nextFollowUpDate.setDate(nextFollowUpDate.getDate() + daysToAdd);
    nextFollowUpDate.setHours(11, 0, 0, 0); // Default to 11:00 AM

    // Summarize
    let summary = feedback.trim();
    if (summary.length > 80) {
        summary = summary.substring(0, 77) + "...";
    }

    return {
        summary,
        status,
        nextFollowUpDate: nextFollowUpDate.toISOString(),
        isAI: false
    };
};

const isAuthorizedForLead = (lead, user) => {
    if (!user) return false;
    const role = user.role?.toLowerCase();
    if (role === "admin" || role === "superadmin") return true;

    const isCreator = lead.createdBy && lead.createdBy.toString() === user._id.toString();
    const isAssigned = lead.assignedTo && lead.assignedTo.toString() === user._id.toString();
    const isSource = lead.source && lead.source === user.name;

    if (role === "sales" || role === "services") {
        return !!(isCreator || isAssigned || isSource);
    } else {
        const isUnassigned = !lead.assignedTo;
        return !!(isAssigned || isSource || isUnassigned);
    }
};

const isAuthorizedForQuotation = async (quotation, user) => {
    if (!user) return false;
    const role = user.role?.toLowerCase();
    if (role === "admin" || role === "superadmin") return true;

    const isCreator = quotation.createdBy && quotation.createdBy.toString() === user._id.toString();
    if (isCreator) return true;

    const leadId = quotation.lead?._id || quotation.lead;
    if (leadId) {
        const lead = await Lead.findById(leadId);
        if (lead) {
            return isAuthorizedForLead(lead, user);
        }
    }
    return false;
};

// POST /api/ai/process-call
exports.processCallFeedback = async (req, res) => {
    try {
        const { itemId, type, feedback } = req.body;

        if (!itemId || !feedback) {
            return res.status(400).json({ message: "ItemId and feedback are required" });
        }

        let lead;
        let quotation;

        if (type === "quotation") {
            quotation = await Quotation.findById(itemId);
            if (!quotation) {
                return res.status(404).json({ message: "Quotation not found" });
            }
            const isAuth = await isAuthorizedForQuotation(quotation, req.user);
            if (!isAuth) {
                return res.status(403).json({ message: "Forbidden: You are not authorized to update this quotation" });
            }
        } else {
            lead = await Lead.findById(itemId);
            if (!lead) {
                return res.status(404).json({ message: "Lead not found" });
            }
            const isAuth = isAuthorizedForLead(lead, req.user);
            if (!isAuth) {
                return res.status(403).json({ message: "Forbidden: You are not authorized to update this lead" });
            }
        }

        let aiResult;
        const geminiKey = process.env.GEMINI_API_KEY;

        if (geminiKey) {
            try {
                // Call Gemini API
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
                const prompt = `
You are an AI Sales CRM Assistant. The user has just completed a follow-up call/action for a client/lead and provided the following feedback:
"${feedback}"

Analyze this feedback and extract:
1. "summary": A professional, concise summary of what was discussed/outcome of the call (maximum 20 words).
2. "status": The updated lead status. Must be exactly one of: "New", "Contacted", "Qualified", "Quotation Submitted", "Won", "Lost".
   - If the deal is successful, closed, or they paid/placed order -> "Won"
   - If they are not interested, hung up, rejected, or asked to delete -> "Lost"
   - If they asked for a quotation or pricing -> "Qualified"
   - Else -> "Contacted"
3. "nextFollowUpDate": Calculate the next follow-up date/time relative to today: ${new Date().toString()}.
   - If they say "tomorrow" -> set for tomorrow.
   - If they say "next week", "next monday", etc. -> calculate that date.
   - If no next follow-up is mentioned, set it for exactly 3 days from now.
   - Format it as a valid ISO Date String.

Return the response strictly as a JSON object with keys: "summary", "status", and "nextFollowUpDate". Do not include markdown code block formatting or backticks. Just return raw JSON.
`;

                const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                const data = await response.json();
                const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
                
                // Clean markdown code blocks if Gemini returns them
                const cleanJson = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
                aiResult = JSON.parse(cleanJson);
                aiResult.isAI = true;
            } catch (geminiError) {
                console.error("Gemini API call failed, falling back to local parsing:", geminiError);
                aiResult = parseFeedbackLocally(feedback);
            }
        } else {
            aiResult = parseFeedbackLocally(feedback);
        }

        // Apply changes to database
        const followUpEntry = {
            date: new Date(aiResult.nextFollowUpDate),
            remark: aiResult.summary,
            createdBy: req.user?._id || null
        };

        let updatedItem;
        let leadId;

        if (type === "quotation") {
            quotation.followUps.push(followUpEntry);
            await quotation.save();
            
            // Also update the lead status if appropriate
            leadId = quotation.lead;
            if (leadId && (aiResult.status === "Won" || aiResult.status === "Lost")) {
                await Lead.findByIdAndUpdate(leadId, { status: aiResult.status });
            }

            updatedItem = await Quotation.findById(itemId)
                .populate("lead")
                .populate("createdBy", "name")
                .populate("followUps.createdBy", "name");
        } else {
            // Lead follow-up
            leadId = itemId;
            lead.followUps.push(followUpEntry);
            lead.status = aiResult.status;
            await lead.save();

            updatedItem = await Lead.findById(itemId)
                .populate("group")
                .populate("assignedTo", "name")
                .populate("createdBy", "name")
                .populate("followUps.createdBy", "name");
        }

        // Emit Socket event to update UI in real-time
        const io = req.app.get("io");
        if (io) {
            if (type === "quotation") {
                io.emit("quotationUpdated", updatedItem);
                if (leadId) {
                    const freshLead = await Lead.findById(leadId).populate("group");
                    io.emit("leadUpdated", freshLead);
                }
            } else {
                io.emit("leadUpdated", updatedItem);
            }
        }

        clearCachePrefix("dashboard_");

        res.json({
            message: "Follow-up processed successfully",
            aiParsed: {
                summary: aiResult.summary,
                status: aiResult.status,
                nextFollowUpDate: aiResult.nextFollowUpDate,
                isAI: aiResult.isAI
            },
            updatedItem
        });
    } catch (err) {
        console.error("Process Call Feedback Error:", err);
        res.status(500).json({ message: "Failed to process call feedback" });
    }
};
