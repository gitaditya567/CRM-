const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Tour = require("../models/Tour");
const Expense = require("../models/Expense");
const User = require("../models/User");

// ---------- helpers ----------
const isAdmin = (req) => ["admin", "superadmin"].includes(String(req.user?.role || "").toLowerCase());
const isId = (v) => mongoose.Types.ObjectId.isValid(v);
const SPENT_STATUSES = ["Approved", "Paid"];

// Admin sees everyone (optionally one staff); others only themselves
const scopeFilter = (req, staffParam) => {
    if (isAdmin(req)) return staffParam && isId(staffParam) ? { staff: new mongoose.Types.ObjectId(staffParam) } : {};
    return { staff: new mongoose.Types.ObjectId(req.user._id) };
};

// Expenses are private: everyone (any role) sees only their own rows in the Expenses tab
const ownFilter = (req) => ({ staff: new mongoose.Types.ObjectId(req.user._id) });

// Tours a user can see: tours they are assigned to (members), or older single-staff tours
const tourScope = (req, staffParam) => {
    const id = isAdmin(req) ? (staffParam && isId(staffParam) ? staffParam : null) : req.user._id;
    if (!id) return {};
    const oid = new mongoose.Types.ObjectId(id);
    return { $or: [{ members: oid }, { staff: oid }] };
};

// Claims for an event can be submitted until 15 days after it ends (inclusive, India time).
// After that an admin extends the event's end date to reopen the window.
const CLAIM_WINDOW_DAYS = 15;
const IST_MS = 330 * 60000;
const claimLastDate = (tour) => {
    if (!tour?.endDate) return null;
    const e = new Date(new Date(tour.endDate).getTime() + IST_MS); // calendar date in India
    return new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate() + CLAIM_WINDOW_DAYS));
};
const isClaimWindowOpen = (tour) => {
    const last = claimLastDate(tour);
    return !last || Date.now() < last.getTime() + 86400000 - IST_MS; // until midnight IST after the last day
};
const assertClaimWindow = (tour) => {
    if (isClaimWindowOpen(tour)) return;
    const last = claimLastDate(tour).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
    throw new Error(`Claim submission for event ${tour.tourNumber} closed on ${last} (${CLAIM_WINDOW_DAYS} days after the event ended). Ask an admin to extend the event's end date, then submit again.`);
};
// Check the window for a tour id (no-op when there is no tour)
const checkClaimWindow = async (tourId) => {
    if (!tourId || !isId(tourId)) return;
    const tour = await Tour.findById(tourId).select("tourNumber endDate").lean();
    if (tour) assertClaimWindow(tour);
};

// Older tours have only `staff` — expose a consistent members list (+ the claim window)
const normalizeTour = (t) => {
    const members = t.members?.length ? t.members : [t.staff];
    const memberNames = t.memberNames?.length ? t.memberNames : [t.staffName];
    return { ...t, members, memberNames, claimLastDate: claimLastDate(t), claimOpen: isClaimWindowOpen(t) };
};
const isTourMember = (tour, userId) =>
    (tour.members?.length ? tour.members : [tour.staff]).some(m => String(m) === String(userId));

// Resolve & validate assigned users (admin only) — keeps the given order
const resolveMembers = async (ids) => {
    const list = [...new Set((Array.isArray(ids) ? ids : [ids]).filter(isId).map(String))];
    if (!list.length) throw new Error("Assign at least one staff member to the tour");
    const users = await User.find({ _id: { $in: list } }).select("name").lean();
    const byId = new Map(users.map(u => [String(u._id), u]));
    const ordered = list.map(id => byId.get(id)).filter(Boolean);
    if (!ordered.length) throw new Error("Selected staff not found");
    return ordered;
};

// Drafts are private: admins never see another user's drafts
const hideOthersDrafts = (req) => (isAdmin(req)
    ? { $or: [{ status: { $ne: "Draft" } }, { staff: new mongoose.Types.ObjectId(req.user._id) }] }
    : {});

const dateRange = (from, to) => {
    const r = {};
    if (from) { const d = new Date(from); if (!isNaN(d)) r.$gte = d; }
    if (to) { const d = new Date(to); if (!isNaN(d)) { d.setHours(23, 59, 59, 999); r.$lte = d; } }
    return Object.keys(r).length ? r : null;
};

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Next running number per month: TR-2610-001 / EXP-2610-0001
const nextNumber = async (Model, field, prefix, pad) => {
    const now = new Date();
    const ym = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const base = `${prefix}-${ym}-`;
    const last = await Model.findOne({ [field]: new RegExp(`^${base}`) }).sort({ [field]: -1 }).select(field).lean();
    const n = last ? parseInt(String(last[field]).slice(base.length), 10) + 1 : 1;
    return `${base}${String(n).padStart(pad, "0")}`;
};

// One expense number per claim (however many rows it has); its rows are EXP-2610-0006/1, /2, /3 ...
// Returns a function that hands out the next row number of that claim.
const claimRowNumbers = async (claimNumber) => {
    const rows = claimNumber
        ? await Expense.find({ claimNumber, expenseNumber: /\// }).select("expenseNumber").lean()
        : [];
    const base = rows.length
        ? rows[0].expenseNumber.split("/")[0]
        : await nextNumber(Expense, "expenseNumber", "EXP", 4); // "EXP-2610-0006/3" counts as 6
    let n = rows.reduce((max, r) => Math.max(max, parseInt(r.expenseNumber.split("/")[1], 10) || 0), 0);
    return () => `${base}/${++n}`;
};

// Resolve which staff a record belongs to (admins may pick anyone)
const resolveStaff = async (req, staffId) => {
    if (isAdmin(req) && staffId && isId(staffId)) {
        const u = await User.findById(staffId).select("name").lean();
        if (u) return { _id: u._id, name: u.name };
    }
    return { _id: req.user._id, name: req.user.name };
};

const removeFiles = (attachments = []) => {
    attachments.forEach(a => {
        if (!a?.url || !a.url.startsWith("/uploads/expenses/")) return;
        const file = path.join(__dirname, "..", a.url);
        fs.unlink(file, () => {});
    });
};

const filesToAttachments = (files = []) => files.map(f => ({
    url: `/uploads/expenses/${f.filename}`,
    name: f.originalname,
    size: f.size,
    mimeType: f.mimetype
}));

const isOwner = (req, exp) => String(exp.staff) === String(req.user._id);

// Only the owner edits / deletes, and only while the claim is a draft or was rejected
const canEditExpense = (req, exp) => isOwner(req, exp) && ["Draft", "Rejected"].includes(exp.status);

// ---------- meta ----------
// GET /api/expenses/meta
exports.getMeta = async (req, res) => {
    try {
        const admin = isAdmin(req);
        const staff = admin
            ? await User.find({}).select("name role").sort({ name: 1 }).lean()
            : [{ _id: req.user._id, name: req.user.name, role: req.user.role }];
        res.json({
            isAdmin: admin,
            categories: Expense.CATEGORIES,
            paymentModes: Expense.PAYMENT_MODES,
            statuses: Expense.STATUSES,
            tourStatuses: ["Planned", "Ongoing", "Completed", "Cancelled"],
            staff
        });
    } catch (err) {
        console.error("Expense meta error:", err);
        res.status(500).json({ message: "Failed to load expense settings" });
    }
};

// ---------- summary / dashboard ----------
// GET /api/expenses/summary?from&to&staff
exports.getSummary = async (req, res) => {
    try {
        const match = { ...scopeFilter(req, req.query.staff), ...hideOthersDrafts(req) };
        const range = dateRange(req.query.from, req.query.to);
        if (range) match.date = range;

        const [byStatus, byCategory, byStaff] = await Promise.all([
            Expense.aggregate([{ $match: match }, { $group: { _id: "$status", amount: { $sum: "$amount" }, count: { $sum: 1 } } }]),
            Expense.aggregate([{ $match: { ...match, status: { $in: SPENT_STATUSES } } }, { $group: { _id: "$category", amount: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { amount: -1 } }]),
            Expense.aggregate([{ $match: { ...match, status: { $in: SPENT_STATUSES } } }, { $group: { _id: "$staff", name: { $first: "$staffName" }, amount: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { amount: -1 } }, { $limit: 10 }])
        ]);

        // Last 6 months trend (approved + paid) — independent of the date filter
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1);
        sixMonthsAgo.setHours(0, 0, 0, 0);
        const trendRaw = await Expense.aggregate([
            { $match: { ...scopeFilter(req, req.query.staff), status: { $in: SPENT_STATUSES }, date: { $gte: sixMonthsAgo } } },
            { $group: { _id: { y: { $year: "$date" }, m: { $month: "$date" } }, amount: { $sum: "$amount" } } }
        ]);
        const byMonth = [];
        for (let i = 0; i < 6; i++) {
            const d = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1);
            const hit = trendRaw.find(t => t._id.y === d.getFullYear() && t._id.m === d.getMonth() + 1);
            byMonth.push({ month: d.toLocaleString("en-GB", { month: "short", year: "2-digit" }), amount: hit ? hit.amount : 0 });
        }

        const status = Object.fromEntries(Expense.STATUSES.map(s => {
            const hit = byStatus.find(b => b._id === s);
            return [s, { amount: hit?.amount || 0, count: hit?.count || 0 }];
        }));

        // Claims waiting for a decision (any date) — badge on the Claims tab
        const pendingClaims = (await Expense.distinct("claimNumber", { ...scopeFilter(req, req.query.staff), status: "Submitted", claimNumber: { $ne: "" } })).length;

        const tourMatch = { ...tourScope(req, req.query.staff) };
        const [activeTours, advances] = await Promise.all([
            Tour.countDocuments({ ...tourMatch, status: { $in: ["Planned", "Ongoing"] } }),
            Tour.aggregate([{ $match: { ...tourMatch, settled: false, status: { $ne: "Cancelled" } } }, { $group: { _id: null, amount: { $sum: "$advanceAmount" } } }])
        ]);

        res.json({
            spent: status.Approved.amount + status.Paid.amount,
            drafts: status.Draft,
            pendingApproval: status.Submitted,
            pendingClaims,
            approvedUnpaid: status.Approved,
            paid: status.Paid,
            rejected: status.Rejected,
            activeTours,
            openAdvances: advances[0]?.amount || 0,
            byCategory: byCategory.map(c => ({ category: c._id, amount: c.amount, count: c.count })),
            byStaff: byStaff.map(s => ({ staffId: s._id, name: s.name || "—", amount: s.amount, count: s.count })),
            byMonth
        });
    } catch (err) {
        console.error("Expense summary error:", err);
        res.status(500).json({ message: "Failed to load expense summary" });
    }
};

// ---------- tours ----------
const tourTotals = async (tourIds) => {
    const rows = await Expense.aggregate([
        { $match: { tour: { $in: tourIds.map(id => new mongoose.Types.ObjectId(id)) }, status: { $ne: "Draft" } } },
        { $group: { _id: { tour: "$tour", status: "$status" }, amount: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]);
    const map = {};
    rows.forEach(r => {
        const id = String(r._id.tour);
        map[id] = map[id] || { spent: 0, pending: 0, rejected: 0, count: 0 };
        if (SPENT_STATUSES.includes(r._id.status)) map[id].spent += r.amount;
        else if (r._id.status === "Submitted") map[id].pending += r.amount;
        else if (r._id.status === "Rejected") map[id].rejected += r.amount;
        map[id].count += r.count;
    });
    return map;
};

const withTotals = (tour, totals) => {
    const t = totals[String(tour._id)] || { spent: 0, pending: 0, rejected: 0, count: 0 };
    // balance > 0 → staff returns money; < 0 → company pays staff
    return { ...tour, ...t, balance: (tour.advanceAmount || 0) - t.spent };
};

// GET /api/expenses/tours?status&staff&search&from&to
exports.listTours = async (req, res) => {
    try {
        const and = [];
        const scope = tourScope(req, req.query.staff);
        if (scope.$or) and.push(scope);
        const filter = {};
        if (req.query.status && req.query.status !== "All") filter.status = req.query.status;
        const range = dateRange(req.query.from, req.query.to);
        if (range) filter.startDate = range;
        if (req.query.search) {
            const rx = new RegExp(escapeRegex(req.query.search), "i");
            and.push({ $or: [{ title: rx }, { tourNumber: rx }, { toCities: rx }, { fromCity: rx }, { purpose: rx }, { staffName: rx }, { memberNames: rx }] });
        }
        if (and.length) filter.$and = and;
        const tours = await Tour.find(filter).sort({ startDate: -1 }).limit(500).lean();
        const totals = await tourTotals(tours.map(t => t._id));
        res.json(tours.map(t => withTotals(normalizeTour(t), totals)));
    } catch (err) {
        console.error("List tours error:", err);
        res.status(500).json({ message: "Failed to load tours" });
    }
};

// GET /api/expenses/tours/:id
exports.getTour = async (req, res) => {
    try {
        if (!isId(req.params.id)) return res.status(400).json({ message: "Invalid tour" });
        const tour = await Tour.findOne({ _id: req.params.id, ...tourScope(req) }).lean();
        if (!tour) return res.status(404).json({ message: "Tour not found" });
        // Rows are private — everyone sees only their own (admins get per-member totals below)
        const expenses = await Expense.find({ tour: tour._id, ...ownFilter(req) }).sort({ date: 1 }).lean();
        const totals = await tourTotals([tour._id]);

        // Per-member breakdown (approved + paid = spent, submitted = pending)
        const t = normalizeTour(tour);
        const perMember = await Expense.aggregate([
            { $match: { tour: tour._id, status: { $ne: "Draft" } } },
            { $group: { _id: { staff: "$staff", status: "$status" }, amount: { $sum: "$amount" } } }
        ]);
        const memberTotals = t.members.map((m, i) => {
            const rows = perMember.filter(r => String(r._id.staff) === String(m));
            return {
                staff: m,
                name: t.memberNames[i] || "",
                spent: rows.filter(r => SPENT_STATUSES.includes(r._id.status)).reduce((s, r) => s + r.amount, 0),
                pending: rows.filter(r => r._id.status === "Submitted").reduce((s, r) => s + r.amount, 0)
            };
        });
        res.json({ tour: withTotals(t, totals), expenses, memberTotals: isAdmin(req) ? memberTotals : memberTotals.filter(mt => String(mt.staff) === String(req.user._id)) });
    } catch (err) {
        console.error("Get tour error:", err);
        res.status(500).json({ message: "Failed to load tour" });
    }
};

const pickTourFields = (b) => {
    const out = {};
    ["title", "purpose", "fromCity", "toCities", "advanceMode", "notes"].forEach(k => {
        if (b[k] !== undefined) out[k] = String(b[k]).trim();
    });
    ["startDate", "endDate", "advanceDate"].forEach(k => {
        if (b[k] !== undefined) out[k] = b[k] ? new Date(b[k]) : null;
    });
    if (b.advanceAmount !== undefined) out.advanceAmount = Math.max(0, Number(b.advanceAmount) || 0);
    if (b.approvedBudget !== undefined) out.approvedBudget = Math.round(Math.max(0, Number(b.approvedBudget) || 0) * 100) / 100;
    if (b.status !== undefined) out.status = b.status;
    return out;
};

// POST /api/expenses/tours
exports.createTour = async (req, res) => {
    try {
        const fields = pickTourFields(req.body);
        if (!fields.title || !fields.startDate || !fields.endDate) {
            return res.status(400).json({ message: "Tour title, start date and end date are required" });
        }
        if (fields.endDate < fields.startDate) return res.status(400).json({ message: "End date cannot be before start date" });
        // Only admins record advances given
        if (!isAdmin(req)) { delete fields.advanceAmount; delete fields.advanceDate; delete fields.advanceMode; }

        let members;
        try {
            members = await resolveMembers(req.body.members ?? req.body.staff);
        } catch (e) {
            return res.status(400).json({ message: e.message });
        }
        const tour = await Tour.create({
            ...fields,
            tourNumber: await nextNumber(Tour, "tourNumber", "TR", 3),
            members: members.map(u => u._id),
            memberNames: members.map(u => u.name),
            staff: members[0]._id,
            staffName: members[0].name,
            createdBy: req.user._id
        });
        res.status(201).json(normalizeTour(tour.toObject()));
    } catch (err) {
        console.error("Create tour error:", err);
        res.status(500).json({ message: err.message || "Failed to create tour" });
    }
};

// PUT /api/expenses/tours/:id
exports.updateTour = async (req, res) => {
    try {
        const tour = await Tour.findOne({ _id: req.params.id, ...tourScope(req) });
        if (!tour) return res.status(404).json({ message: "Tour not found" });
        const admin = isAdmin(req);
        if (!admin && tour.settled) return res.status(403).json({ message: "Settled tours can only be changed by an admin" });

        const fields = pickTourFields(req.body);
        if (!admin) { delete fields.advanceAmount; delete fields.advanceDate; delete fields.advanceMode; }

        // Re-assign members (admin). A member who already has expenses on this tour cannot be removed.
        if (admin && (req.body.members !== undefined || req.body.staff)) {
            let members;
            try {
                members = await resolveMembers(req.body.members ?? req.body.staff);
            } catch (e) {
                return res.status(400).json({ message: e.message });
            }
            const keep = new Set(members.map(u => String(u._id)));
            const current = tour.members?.length ? tour.members : [tour.staff];
            const removed = current.filter(m => !keep.has(String(m)));
            if (removed.length) {
                const withExpenses = await Expense.distinct("staffName", { tour: tour._id, staff: { $in: removed } });
                if (withExpenses.length) {
                    return res.status(400).json({ message: `Cannot remove ${withExpenses.join(", ")} — they already have expenses on this tour` });
                }
            }
            tour.members = members.map(u => u._id);
            tour.memberNames = members.map(u => u.name);
            tour.staff = members[0]._id;
            tour.staffName = members[0].name;
        }
        if (admin && typeof req.body.settled === "boolean") {
            tour.settled = req.body.settled;
            tour.settledAt = req.body.settled ? new Date() : null;
        }
        Object.assign(tour, fields);
        if (tour.endDate < tour.startDate) return res.status(400).json({ message: "End date cannot be before start date" });
        await tour.save();
        res.json(normalizeTour(tour.toObject()));
    } catch (err) {
        console.error("Update tour error:", err);
        res.status(500).json({ message: err.message || "Failed to update tour" });
    }
};

// DELETE /api/expenses/tours/:id   (only when it has no expenses)
exports.deleteTour = async (req, res) => {
    try {
        const tour = await Tour.findOne({ _id: req.params.id, ...tourScope(req) });
        if (!tour) return res.status(404).json({ message: "Tour not found" });
        if (!isAdmin(req) && tour.status !== "Planned") return res.status(403).json({ message: "Only planned tours can be deleted" });
        if (await Expense.exists({ tour: tour._id })) {
            return res.status(400).json({ message: "This tour has expenses. Delete or move them first." });
        }
        await tour.deleteOne();
        res.json({ message: "Tour deleted" });
    } catch (err) {
        console.error("Delete tour error:", err);
        res.status(500).json({ message: "Failed to delete tour" });
    }
};

// ---------- expenses ----------
const buildExpenseFilter = (req) => {
    const q = req.query;
    const filter = { ...ownFilter(req) };
    if (q.status && q.status !== "All") filter.status = q.status;
    if (q.category && q.category !== "All") filter.category = q.category;
    if (q.tour === "none") filter.tour = null;
    else if (q.tour && isId(q.tour)) filter.tour = new mongoose.Types.ObjectId(q.tour);
    const range = dateRange(q.from, q.to);
    if (range) filter.date = range;
    const and = [];
    if (q.search) {
        const rx = new RegExp(escapeRegex(q.search), "i");
        and.push({ $or: [{ description: rx }, { place: rx }, { expenseNumber: rx }, { claimNumber: rx }, { billNo: rx }, { staffName: rx }, { category: rx }] });
    }
    if (and.length) filter.$and = and;
    return filter;
};

// GET /api/expenses?status&category&staff&tour&from&to&search&page&limit
exports.listExpenses = async (req, res) => {
    try {
        const filter = buildExpenseFilter(req);
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(5000, Math.max(1, parseInt(req.query.limit) || 25));
        const [items, total, sum] = await Promise.all([
            Expense.find(filter).sort({ date: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit)
                .populate("tour", "tourNumber title").lean(),
            Expense.countDocuments(filter),
            Expense.aggregate([{ $match: filter }, { $group: { _id: null, amount: { $sum: "$amount" } } }])
        ]);
        res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)), totalAmount: sum[0]?.amount || 0 });
    } catch (err) {
        console.error("List expenses error:", err);
        res.status(500).json({ message: "Failed to load expenses" });
    }
};

const validateExpenseBody = async (req, body, staffId) => {
    const out = {};
    if (body.date !== undefined) {
        const d = new Date(body.date);
        if (isNaN(d)) throw new Error("Valid expense date is required");
        out.date = d;
    }
    // Optional date range (multi-day expense such as a hotel stay)
    if (body.endDate !== undefined) {
        if (!body.endDate) out.endDate = null;
        else {
            const e = new Date(body.endDate);
            if (isNaN(e)) throw new Error("Invalid 'to' date");
            const start = out.date || (body._currentDate ? new Date(body._currentDate) : null);
            if (start && e < start) throw new Error("'To' date cannot be before 'From' date");
            out.endDate = start && e.getTime() === start.getTime() ? null : e;
        }
    }
    if (body.category !== undefined) {
        if (!Expense.CATEGORIES.includes(body.category)) throw new Error("Invalid category");
        out.category = body.category;
    }
    if (body.amount !== undefined) {
        const a = Number(body.amount);
        if (!(a > 0)) throw new Error("Amount must be greater than 0");
        out.amount = Math.round(a * 100) / 100;
    }
    if (body.paymentMode !== undefined) {
        if (!Expense.PAYMENT_MODES.includes(body.paymentMode)) throw new Error("Invalid payment mode");
        out.paymentMode = body.paymentMode;
    }
    ["description", "billNo", "place"].forEach(k => { if (body[k] !== undefined) out[k] = String(body[k]).trim(); });
    if (body.tour !== undefined) {
        if (!body.tour || body.tour === "none") out.tour = null;
        else {
            if (!isId(body.tour)) throw new Error("Invalid tour");
            const tour = await Tour.findById(body.tour).select("staff members").lean();
            if (!tour) throw new Error("Tour not found");
            if (!isTourMember(tour, staffId)) throw new Error("This staff member is not assigned to the selected tour");
            out.tour = tour._id;
        }
    }
    return out;
};

// POST /api/expenses   (multipart: bills[])
exports.createExpense = async (req, res) => {
    try {
        const staff = await resolveStaff(req, req.body.staff);
        const fields = await validateExpenseBody(req, req.body, staff._id);
        if (!fields.date || !fields.category || !fields.amount) {
            removeFiles(filesToAttachments(req.files));
            return res.status(400).json({ message: "Date, category and amount are required" });
        }
        const by = req.user.name || "User";
        // saveAs=draft keeps it private to the creator; anything else submits for approval
        // (a draft always belongs to its creator — admins can't park drafts on someone else)
        const status = req.body.saveAs === "draft" && String(staff._id) === String(req.user._id) ? "Draft" : "Submitted";
        if (status === "Submitted") await checkClaimWindow(fields.tour);
        const exp = await Expense.create({
            ...fields,
            claimNumber: await nextNumber(Expense, "claimNumber", "CLM", 3), // every expense belongs to a claim
            expenseNumber: (await claimRowNumbers(""))(),
            staff: staff._id,
            staffName: staff.name,
            attachments: filesToAttachments(req.files),
            status,
            statusHistory: [{ status, by, at: new Date() }],
            createdBy: req.user._id
        });
        res.status(201).json(exp);
    } catch (err) {
        removeFiles(filesToAttachments(req.files));
        console.error("Create expense error:", err.message);
        res.status(400).json({ message: err.message || "Failed to save expense" });
    }
};

// PUT /api/expenses/:id   (multipart: bills[], removeAttachments JSON array of urls)
exports.updateExpense = async (req, res) => {
    try {
        const exp = await Expense.findOne({ _id: req.params.id, ...ownFilter(req) });
        if (!exp) { removeFiles(filesToAttachments(req.files)); return res.status(404).json({ message: "Expense not found" }); }
        if (!canEditExpense(req, exp)) {
            removeFiles(filesToAttachments(req.files));
            return res.status(403).json({ message: `This expense is ${exp.status.toLowerCase()} and cannot be edited` });
        }

        const fields = await validateExpenseBody(req, { ...req.body, _currentDate: exp.date }, exp.staff);
        Object.assign(exp, fields);
        if (exp.endDate && exp.endDate < exp.date) throw new Error("'To' date cannot be before 'From' date");

        let remove = [];
        try { remove = JSON.parse(req.body.removeAttachments || "[]"); } catch { remove = []; }
        if (remove.length) {
            removeFiles(exp.attachments.filter(a => remove.includes(a.url)));
            exp.attachments = exp.attachments.filter(a => !remove.includes(a.url));
        }
        exp.attachments.push(...filesToAttachments(req.files));

        // Owner chooses: keep as draft, or submit (re-submit after rejection)
        const by = req.user.name || "User";
        if (isOwner(req, exp) && ["Draft", "Rejected"].includes(exp.status)) {
            if (req.body.saveAs === "draft" && exp.status !== "Draft") {
                exp.status = "Draft";
                exp.statusHistory.push({ status: "Draft", by, at: new Date(), note: "Moved back to draft" });
            } else if (req.body.saveAs !== "draft") {
                await checkClaimWindow(exp.tour);
                const wasRejected = exp.status === "Rejected";
                exp.status = "Submitted";
                exp.rejectionReason = "";
                exp.statusHistory.push({ status: "Submitted", by, at: new Date(), note: wasRejected ? "Edited & re-submitted" : undefined });
            }
        }
        await exp.save();
        res.json(exp);
    } catch (err) {
        removeFiles(filesToAttachments(req.files));
        console.error("Update expense error:", err.message);
        res.status(400).json({ message: err.message || "Failed to update expense" });
    }
};

// DELETE /api/expenses/:id
exports.deleteExpense = async (req, res) => {
    try {
        const exp = await Expense.findOne({ _id: req.params.id, ...ownFilter(req) });
        if (!exp) return res.status(404).json({ message: "Expense not found" });
        if (!canEditExpense(req, exp)) return res.status(403).json({ message: `This expense is ${exp.status.toLowerCase()} and cannot be deleted` });
        removeFiles(exp.attachments);
        await exp.deleteOne();
        res.json({ message: "Expense deleted" });
    } catch (err) {
        console.error("Delete expense error:", err);
        res.status(500).json({ message: "Failed to delete expense" });
    }
};

// POST /api/expenses/:id/submit   (owner submits a draft — a row inside a claim submits the whole claim)
exports.submitDraft = async (req, res) => {
    try {
        const exp = await Expense.findOne({ _id: req.params.id, staff: req.user._id });
        if (!exp) return res.status(404).json({ message: "Expense not found" });
        if (exp.status !== "Draft") return res.status(400).json({ message: "Only drafts can be submitted" });
        if (exp.claimNumber) {
            req.params.claimNumber = exp.claimNumber;
            return exports.submitClaim(req, res);
        }
        await checkClaimWindow(exp.tour);
        exp.status = "Submitted";
        exp.statusHistory.push({ status: "Submitted", by: req.user.name || "User", at: new Date() });
        await exp.save();
        res.json(exp);
    } catch (err) {
        console.error("Submit draft error:", err.message);
        res.status(400).json({ message: err.message || "Failed to submit expense" });
    }
};

// ---------- claims (many expense rows entered & submitted together) ----------
const MAX_CLAIM_ROWS = 50;
const MAX_BILLS_PER_ROW = 5;

// Uploaded files arrive as fieldname "bills_<rowKey>"
const filesForRow = (files = [], key) => files.filter(f => f.fieldname === `bills_${key}`);

// GET /api/expenses/claims?status=Draft   → the user's own claims grouped (default: drafts)
exports.listMyClaims = async (req, res) => {
    try {
        const status = req.query.status || "Draft";
        const rows = await Expense.aggregate([
            { $match: { staff: new mongoose.Types.ObjectId(req.user._id), claimNumber: { $ne: "" }, status } },
            { $group: {
                _id: "$claimNumber",
                count: { $sum: 1 },
                amount: { $sum: "$amount" },
                from: { $min: "$date" },
                to: { $max: { $ifNull: ["$endDate", "$date"] } },
                updatedAt: { $max: "$updatedAt" }
            } },
            { $sort: { updatedAt: -1 } }
        ]);
        res.json(rows.map(r => ({ claimNumber: r._id, count: r.count, amount: r.amount, from: r.from, to: r.to, updatedAt: r.updatedAt })));
    } catch (err) {
        console.error("List claims error:", err);
        res.status(500).json({ message: "Failed to load claims" });
    }
};

// GET /api/expenses/claims/:claimNumber
exports.getClaim = async (req, res) => {
    try {
        const items = await Expense.find({ claimNumber: req.params.claimNumber, ...scopeFilter(req), ...hideOthersDrafts(req) })
            .sort({ date: 1, createdAt: 1 }).populate("tour", "tourNumber title").lean();
        if (!items.length) return res.status(404).json({ message: "Claim not found" });
        res.json({ claimNumber: req.params.claimNumber, staff: items[0].staff, staffName: items[0].staffName, items });
    } catch (err) {
        console.error("Get claim error:", err);
        res.status(500).json({ message: "Failed to load claim" });
    }
};

// POST /api/expenses/claims                 → new claim
// PUT  /api/expenses/claims/:claimNumber    → update a claim's editable (Draft / Rejected) rows
// multipart: rows = JSON [{ key, _id?, date, endDate?, category, place, description, amount, paymentMode, billNo, removeAttachments? }],
//            tour?, staff? (admin, new claims only), saveAs = draft | submit, files bills_<key>
exports.saveClaim = async (req, res) => {
    const uploaded = req.files || [];
    const cleanupUploads = () => removeFiles(filesToAttachments(uploaded));
    try {
        let rows;
        try { rows = JSON.parse(req.body.rows || "[]"); } catch { rows = null; }
        if (!Array.isArray(rows) || rows.length === 0) { cleanupUploads(); return res.status(400).json({ message: "Add at least one expense row" }); }
        if (rows.length > MAX_CLAIM_ROWS) { cleanupUploads(); return res.status(400).json({ message: `A claim can have at most ${MAX_CLAIM_ROWS} rows` }); }

        const claimNumber = req.params.claimNumber || "";
        let existing = [];
        let staff;
        if (claimNumber) {
            existing = await Expense.find({ claimNumber, ...scopeFilter(req) });
            if (!existing.length) { cleanupUploads(); return res.status(404).json({ message: "Claim not found" }); }
            if (String(existing[0].staff) !== String(req.user._id)) { cleanupUploads(); return res.status(403).json({ message: "Only the claim owner can edit it" }); }
            // A claim is decided as a whole — once submitted it is locked until it is rejected
            if (existing.some(e => !["Draft", "Rejected"].includes(e.status))) {
                cleanupUploads();
                return res.status(400).json({ message: "This claim is submitted / approved and can no longer be edited" });
            }
            staff = { _id: existing[0].staff, name: existing[0].staffName };
        } else {
            staff = await resolveStaff(req, req.body.staff);
        }

        const ownClaim = String(staff._id) === String(req.user._id);
        const status = req.body.saveAs === "draft" && ownClaim ? "Draft" : "Submitted";
        const by = req.user.name || "User";
        const editable = new Map(existing.map(e => [String(e._id), e]));
        if (status === "Submitted") await checkClaimWindow(req.body.tour);

        // 1) Validate every row first — nothing is written if any row is wrong
        const prepared = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i] || {};
            const n = i + 1;
            const doc = row._id ? editable.get(String(row._id)) : null;
            if (row._id && !doc) {
                // Locked row (submitted / approved / paid) — left untouched
                if (existing.some(e => String(e._id) === String(row._id))) continue;
                throw new Error(`Row ${n}: expense not found in this claim`);
            }
            let fields;
            try {
                fields = await validateExpenseBody(req, {
                    date: row.date, endDate: row.endDate || "", category: row.category, amount: row.amount,
                    paymentMode: row.paymentMode || "Cash", place: row.place || "", description: row.description || "",
                    billNo: row.billNo || "", tour: req.body.tour || "none"
                }, staff._id);
            } catch (e) {
                throw new Error(`Row ${n}: ${e.message}`);
            }
            if (!fields.date || !fields.category || !fields.amount) throw new Error(`Row ${n}: date, category and amount are required`);
            const newFiles = filesForRow(uploaded, row.key);
            const remove = Array.isArray(row.removeAttachments) ? row.removeAttachments : [];
            const keptCount = doc ? doc.attachments.filter(a => !remove.includes(a.url)).length : 0;
            if (keptCount + newFiles.length > MAX_BILLS_PER_ROW) throw new Error(`Row ${n}: up to ${MAX_BILLS_PER_ROW} bills per row`);
            prepared.push({ doc, fields, newFiles, remove });
        }

        // 2) Rows removed from the table (only Draft / Rejected ones can be removed)
        const keepIds = new Set(prepared.filter(p => p.doc).map(p => String(p.doc._id)));
        for (const [id, doc] of editable) {
            if (!keepIds.has(id)) { removeFiles(doc.attachments); await doc.deleteOne(); }
        }

        // 3) Write rows
        const number = claimNumber || await nextNumber(Expense, "claimNumber", "CLM", 3);
        const nextRowNumber = await claimRowNumbers(claimNumber);
        for (const p of prepared) {
            const attachments = filesToAttachments(p.newFiles);
            if (p.doc) {
                const doc = p.doc;
                Object.assign(doc, p.fields);
                if (p.remove.length) {
                    removeFiles(doc.attachments.filter(a => p.remove.includes(a.url)));
                    doc.attachments = doc.attachments.filter(a => !p.remove.includes(a.url));
                }
                doc.attachments.push(...attachments);
                if (doc.status !== status) {
                    const wasRejected = doc.status === "Rejected";
                    doc.status = status;
                    if (status === "Submitted") doc.rejectionReason = "";
                    doc.statusHistory.push({ status, by, at: new Date(), note: wasRejected && status === "Submitted" ? "Edited & re-submitted" : undefined });
                }
                await doc.save();
            } else {
                await Expense.create({
                    ...p.fields,
                    claimNumber: number,
                    expenseNumber: nextRowNumber(),
                    staff: staff._id,
                    staffName: staff.name,
                    attachments,
                    status,
                    statusHistory: [{ status, by, at: new Date() }],
                    createdBy: req.user._id
                });
            }
        }

        const items = await Expense.find({ claimNumber: number }).sort({ date: 1, createdAt: 1 }).lean();
        res.status(claimNumber ? 200 : 201).json({ claimNumber: number, status, items });
    } catch (err) {
        cleanupUploads();
        console.error("Save claim error:", err.message);
        res.status(400).json({ message: err.message || "Failed to save claim" });
    }
};

// ---------- claim status & PDF ----------
// A claim is approved / rejected as a whole (no partial approval), so its rows share one status:
//   Draft → Pending Approval → Approved / Rejected → Paid
const deriveClaimStatus = (c) => {
    const decided = c.approved + c.paid;
    if (c.draft === c.count) return "Draft";
    if (c.submitted > 0 || c.draft > 0) return "Pending Approval";
    if (decided === 0) return "Rejected";
    if (c.paid === decided) return "Paid";
    return "Approved";
};

const countBy = (status) => ({ $sum: { $cond: [{ $eq: ["$status", status] }, 1, 0] } });
const sumBy = (statuses) => ({ $sum: { $cond: [{ $in: ["$status", statuses] }, "$amount", 0] } });

// GET /api/expenses/claim-list?staff&status&search   → claims with derived status (admin: all, staff: own)
exports.listClaims = async (req, res) => {
    try {
        const match = { ...scopeFilter(req, req.query.staff), ...hideOthersDrafts(req), claimNumber: { $ne: "" } };
        if (req.query.search) {
            const rx = new RegExp(escapeRegex(req.query.search), "i");
            match.$and = [...(match.$and || []), { $or: [{ claimNumber: rx }, { staffName: rx }, { place: rx }, { description: rx }] }];
        }
        const groups = await Expense.aggregate([
            { $match: match },
            { $group: {
                _id: "$claimNumber",
                staff: { $first: "$staff" }, staffName: { $first: "$staffName" }, tour: { $max: "$tour" },
                count: { $sum: 1 },
                draft: countBy("Draft"), submitted: countBy("Submitted"), approved: countBy("Approved"),
                paid: countBy("Paid"), rejected: countBy("Rejected"),
                claimed: { $sum: { $cond: [{ $ne: ["$status", "Draft"] }, "$amount", 0] } },
                draftAmount: sumBy(["Draft"]), pendingAmount: sumBy(["Submitted"]),
                approvedAmount: sumBy(["Approved", "Paid"]), paidAmount: sumBy(["Paid"]), rejectedAmount: sumBy(["Rejected"]),
                from: { $min: "$date" }, to: { $max: { $ifNull: ["$endDate", "$date"] } },
                updatedAt: { $max: "$updatedAt" }
            } },
            { $sort: { updatedAt: -1 } },
            { $limit: 500 }
        ]);
        const tourIds = [...new Set(groups.map(g => g.tour).filter(Boolean).map(String))];
        const tours = await Tour.find({ _id: { $in: tourIds } }).select("tourNumber title").lean();
        const tourMap = new Map(tours.map(t => [String(t._id), t]));
        let claims = groups.map(g => {
            const status = deriveClaimStatus(g);
            return {
                claimNumber: g._id, staff: g.staff, staffName: g.staffName, status,
                pdfReady: status !== "Draft", // PDF once submitted — watermark & colours follow the status
                tour: g.tour ? tourMap.get(String(g.tour)) || null : null,
                count: g.count,
                counts: { draft: g.draft, submitted: g.submitted, approved: g.approved, paid: g.paid, rejected: g.rejected },
                amounts: { claimed: g.claimed, draft: g.draftAmount, pending: g.pendingAmount, approved: g.approvedAmount, paid: g.paidAmount, rejected: g.rejectedAmount },
                from: g.from, to: g.to, updatedAt: g.updatedAt
            };
        });
        if (req.query.status && req.query.status !== "All") claims = claims.filter(c => c.status === req.query.status);
        res.json(claims);
    } catch (err) {
        console.error("List claims error:", err);
        res.status(500).json({ message: "Failed to load claims" });
    }
};

// GET /api/expenses/claims/:claimNumber/pdf   → claim PDF in its current status (owner or admin)
// Watermark / colours follow the claim status: APPROVED, PAID, PARTIALLY APPROVED, PENDING APPROVAL, REJECTED, DRAFT
exports.claimPdf = async (req, res) => {
    try {
        const { buildClaimPdfWithBills } = require("../utils/expenseClaimPdf");
        const items = await Expense.find({ claimNumber: req.params.claimNumber, ...scopeFilter(req), ...hideOthersDrafts(req) })
            .sort({ date: 1, createdAt: 1 }).lean();
        if (!items.length) return res.status(404).json({ message: "Claim not found" });

        const c = items.reduce((acc, x) => { acc[x.status.toLowerCase()]++; return acc; },
            { draft: 0, submitted: 0, approved: 0, paid: 0, rejected: 0, count: items.length });
        const status = deriveClaimStatus(c);

        // Latest rejection (who / when) from the rows' history
        const lastRejection = items.flatMap(x => (x.statusHistory || []).filter(h => h.status === "Rejected"))
            .sort((a, b) => new Date(b.at) - new Date(a.at))[0];

        const decided = items.filter(x => SPENT_STATUSES.includes(x.status));
        const latest = decided.reduce((a, x) => (!a || new Date(x.approvedAt || 0) > new Date(a.approvedAt || 0) ? x : a), null);
        const submittedAt = items.flatMap(x => (x.statusHistory || []).filter(h => h.status === "Submitted").map(h => new Date(h.at)))
            .sort((a, b) => a - b)[0] || items[0].createdAt;
        const tourId = items.find(x => x.tour)?.tour;
        const [tour, user] = await Promise.all([
            tourId ? Tour.findById(tourId).select("tourNumber title startDate endDate").lean() : null,
            User.findById(items[0].staff).select("role").lean()
        ]);

        const byCat = {};
        decided.forEach(x => {
            byCat[x.category] = byCat[x.category] || { amount: 0, count: 0 };
            byCat[x.category].amount += x.amount;
            byCat[x.category].count += 1;
        });
        const sum = (arr) => Math.round(arr.reduce((s, x) => s + x.amount, 0) * 100) / 100;

        const claim = {
            claimNumber: req.params.claimNumber,
            status,
            rejectedBy: lastRejection?.by || "",
            rejectedAt: lastRejection?.at || null,
            staffName: items[0].staffName,
            staffRole: user?.role || "",
            tour,
            items,
            periodFrom: items.reduce((m, x) => (new Date(x.date) < m ? new Date(x.date) : m), new Date(items[0].date)),
            periodTo: items.reduce((m, x) => { const d = new Date(x.endDate || x.date); return d > m ? d : m; }, new Date(items[0].endDate || items[0].date)),
            submittedAt,
            approvedBy: latest?.approvedBy || "",
            approvedAt: latest?.approvedAt || null,
            paidAt: c.paid > 0 && c.paid === c.approved + c.paid ? items.reduce((m, x) => (x.paidAt && (!m || new Date(x.paidAt) > m) ? new Date(x.paidAt) : m), null) : null,
            totals: {
                claimed: sum(items),
                rejected: sum(items.filter(x => x.status === "Rejected")),
                approved: sum(decided),
                pending: sum(items.filter(x => ["Submitted", "Draft"].includes(x.status))),
                paid: sum(items.filter(x => x.status === "Paid")),
                byCategory: Object.entries(byCat).map(([category, v]) => ({ category, amount: Math.round(v.amount * 100) / 100, count: v.count })).sort((a, b) => b.amount - a.amount)
            }
        };

        // Bills attached after the claim as Annexure A-1, A-2, ...
        //   final approval → bills of approved / paid rows · rejected claim → all bills · pending / draft → all but rejected rows
        const finalApproval = ["Approved", "Paid"].includes(status);
        const includeBillsOf = (x) => (finalApproval ? SPENT_STATUSES.includes(x.status)
            : status === "Rejected" ? true
            : x.status !== "Rejected");
        const kindOf = (f) => {
            const ext = path.extname(f.url || f.name || "").toLowerCase();
            if (f.mimeType === "application/pdf" || ext === ".pdf") return "pdf";
            if (f.mimeType === "image/png" || ext === ".png") return "png";
            if (["image/jpeg", "image/jpg"].includes(f.mimeType) || [".jpg", ".jpeg"].includes(ext)) return "jpg";
            return ext.replace(".", "") || "file";
        };
        const uploadsRoot = path.join(__dirname, "..");
        const billsDir = path.resolve(uploadsRoot, "uploads", "expenses") + path.sep;
        let n = 0;
        claim.annexures = items.flatMap((x, i) => includeBillsOf(x)
            ? (x.attachments || [])
                .filter(f => f.url && path.resolve(path.join(uploadsRoot, f.url)).startsWith(billsDir))
                .map(f => ({
                    label: `A-${++n}`,
                    row: i + 1,
                    date: x.endDate ? `${new Date(x.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" })} - ${new Date(x.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}`
                        : new Date(x.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }),
                    category: x.category,
                    amount: x.amount,
                    name: f.name || path.basename(f.url),
                    path: path.join(uploadsRoot, f.url),
                    kind: kindOf(f)
                }))
            : []);

        const pdf = await buildClaimPdfWithBills(claim);
        const safeName = `${claim.claimNumber}_${claim.staffName}`.replace(/[^\w.-]+/g, "_");
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Content-Disposition", `attachment; filename="Expense_Claim_${safeName}.pdf"`);
        res.setHeader("Content-Length", pdf.length);
        res.end(pdf);
    } catch (err) {
        console.error("Claim PDF error:", err);
        if (!res.headersSent) res.status(500).json({ message: "Failed to generate claim PDF" });
    }
};

// POST /api/expenses/claims/:claimNumber/submit   → submit every draft row of the user's claim
exports.submitClaim = async (req, res) => {
    try {
        const drafts = await Expense.find({ claimNumber: req.params.claimNumber, staff: req.user._id, status: "Draft" });
        if (!drafts.length) return res.status(400).json({ message: "No draft rows to submit in this claim" });
        await checkClaimWindow(drafts.find(d => d.tour)?.tour);
        const by = req.user.name || "User";
        for (const d of drafts) {
            d.status = "Submitted";
            d.statusHistory.push({ status: "Submitted", by, at: new Date() });
            await d.save();
        }
        res.json({ claimNumber: req.params.claimNumber, submitted: drafts.length, amount: drafts.reduce((s, d) => s + d.amount, 0) });
    } catch (err) {
        console.error("Submit claim error:", err.message);
        res.status(400).json({ message: err.message || "Failed to submit claim" });
    }
};

// Allowed admin transitions
const TRANSITIONS = {
    Submitted: ["Approved", "Rejected"],
    Rejected: ["Approved", "Submitted"],
    Approved: ["Paid", "Rejected", "Submitted"],
    Paid: ["Approved"]
};

const applyStatus = (exp, status, reason, by) => {
    if (!(TRANSITIONS[exp.status] || []).includes(status)) {
        throw new Error(`This claim is ${exp.status === "Submitted" ? "pending" : exp.status.toLowerCase()} — it cannot be marked ${status.toLowerCase()}`);
    }
    if (status === "Rejected" && !String(reason || "").trim()) throw new Error("Rejection reason is required");
    exp.status = status;
    exp.rejectionReason = status === "Rejected" ? String(reason).trim() : "";
    if (status === "Approved") { exp.approvedBy = by; exp.approvedAt = new Date(); exp.paidAt = null; exp.paidBy = ""; }
    if (status === "Paid") { exp.paidBy = by; exp.paidAt = new Date(); }
    if (status === "Submitted") { exp.approvedBy = ""; exp.approvedAt = null; }
    exp.statusHistory.push({ status, by, at: new Date(), note: status === "Rejected" ? exp.rejectionReason : (reason || undefined) });
};

// POST /api/expenses/claims/:claimNumber/status   { status: Approved | Rejected | Paid, reason }   (admin)
// The whole claim is decided at once — every submitted row gets the same status
exports.setClaimStatus = async (req, res) => {
    try {
        const { status, reason } = req.body;
        if (!["Approved", "Rejected", "Paid"].includes(status)) return res.status(400).json({ message: "Invalid status" });
        const items = await Expense.find({ claimNumber: req.params.claimNumber, status: { $ne: "Draft" } });
        if (!items.length) return res.status(404).json({ message: "Claim not found" });
        const by = req.user.name || "Admin";
        items.forEach(exp => applyStatus(exp, status, reason, by)); // validates every row before anything is saved
        await Promise.all(items.map(exp => exp.save()));
        res.json({ claimNumber: req.params.claimNumber, status, count: items.length, amount: items.reduce((sum, x) => sum + x.amount, 0) });
    } catch (err) {
        res.status(400).json({ message: err.message || "Failed to update claim" });
    }
};
