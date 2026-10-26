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

const canEditExpense = (req, exp) => {
    if (exp.status === "Draft") return isOwner(req, exp);
    if (isAdmin(req)) return exp.status !== "Paid";
    return isOwner(req, exp) && ["Submitted", "Rejected"].includes(exp.status);
};

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

        // Last 6 months trend (approved + paid) â€” independent of the date filter
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

        const tourMatch = { ...scopeFilter(req, req.query.staff) };
        const [activeTours, advances] = await Promise.all([
            Tour.countDocuments({ ...tourMatch, status: { $in: ["Planned", "Ongoing"] } }),
            Tour.aggregate([{ $match: { ...tourMatch, settled: false, status: { $ne: "Cancelled" } } }, { $group: { _id: null, amount: { $sum: "$advanceAmount" } } }])
        ]);

        res.json({
            spent: status.Approved.amount + status.Paid.amount,
            drafts: status.Draft,
            pendingApproval: status.Submitted,
            approvedUnpaid: status.Approved,
            paid: status.Paid,
            rejected: status.Rejected,
            activeTours,
            openAdvances: advances[0]?.amount || 0,
            byCategory: byCategory.map(c => ({ category: c._id, amount: c.amount, count: c.count })),
            byStaff: byStaff.map(s => ({ staffId: s._id, name: s.name || "â€”", amount: s.amount, count: s.count })),
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
    // balance > 0 â†’ staff returns money; < 0 â†’ company pays staff
    return { ...tour, ...t, balance: (tour.advanceAmount || 0) - t.spent };
};

// GET /api/expenses/tours?status&staff&search&from&to
exports.listTours = async (req, res) => {
    try {
        const filter = { ...scopeFilter(req, req.query.staff) };
        if (req.query.status && req.query.status !== "All") filter.status = req.query.status;
        const range = dateRange(req.query.from, req.query.to);
        if (range) filter.startDate = range;
        if (req.query.search) {
            const rx = new RegExp(escapeRegex(req.query.search), "i");
            filter.$or = [{ title: rx }, { tourNumber: rx }, { toCities: rx }, { fromCity: rx }, { purpose: rx }, { staffName: rx }];
        }
        const tours = await Tour.find(filter).sort({ startDate: -1 }).limit(500).lean();
        const totals = await tourTotals(tours.map(t => t._id));
        res.json(tours.map(t => withTotals(t, totals)));
    } catch (err) {
        console.error("List tours error:", err);
        res.status(500).json({ message: "Failed to load tours" });
    }
};

// GET /api/expenses/tours/:id
exports.getTour = async (req, res) => {
    try {
        if (!isId(req.params.id)) return res.status(400).json({ message: "Invalid tour" });
        const tour = await Tour.findOne({ _id: req.params.id, ...scopeFilter(req) }).lean();
        if (!tour) return res.status(404).json({ message: "Tour not found" });
        const expenses = await Expense.find({ tour: tour._id, ...hideOthersDrafts(req) }).sort({ date: 1 }).lean();
        const totals = await tourTotals([tour._id]);
        res.json({ tour: withTotals(tour, totals), expenses });
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

        const staff = await resolveStaff(req, req.body.staff);
        const tour = await Tour.create({
            ...fields,
            tourNumber: await nextNumber(Tour, "tourNumber", "TR", 3),
            staff: staff._id,
            staffName: staff.name,
            createdBy: req.user._id
        });
        res.status(201).json(tour);
    } catch (err) {
        console.error("Create tour error:", err);
        res.status(500).json({ message: err.message || "Failed to create tour" });
    }
};

// PUT /api/expenses/tours/:id
exports.updateTour = async (req, res) => {
    try {
        const tour = await Tour.findOne({ _id: req.params.id, ...scopeFilter(req) });
        if (!tour) return res.status(404).json({ message: "Tour not found" });
        const admin = isAdmin(req);
        if (!admin && tour.settled) return res.status(403).json({ message: "Settled tours can only be changed by an admin" });

        const fields = pickTourFields(req.body);
        if (!admin) { delete fields.advanceAmount; delete fields.advanceDate; delete fields.advanceMode; }
        if (admin && req.body.staff && isId(req.body.staff) && String(req.body.staff) !== String(tour.staff)) {
            const hasExpenses = await Expense.exists({ tour: tour._id });
            if (hasExpenses) return res.status(400).json({ message: "Cannot change staff of a tour that already has expenses" });
            const staff = await resolveStaff(req, req.body.staff);
            tour.staff = staff._id;
            tour.staffName = staff.name;
        }
        if (admin && typeof req.body.settled === "boolean") {
            tour.settled = req.body.settled;
            tour.settledAt = req.body.settled ? new Date() : null;
        }
        Object.assign(tour, fields);
        if (tour.endDate < tour.startDate) return res.status(400).json({ message: "End date cannot be before start date" });
        await tour.save();
        res.json(tour);
    } catch (err) {
        console.error("Update tour error:", err);
        res.status(500).json({ message: err.message || "Failed to update tour" });
    }
};

// DELETE /api/expenses/tours/:id   (only when it has no expenses)
exports.deleteTour = async (req, res) => {
    try {
        const tour = await Tour.findOne({ _id: req.params.id, ...scopeFilter(req) });
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
    const filter = { ...scopeFilter(req, q.staff) };
    if (q.status && q.status !== "All") filter.status = q.status;
    if (q.category && q.category !== "All") filter.category = q.category;
    if (q.tour === "none") filter.tour = null;
    else if (q.tour && isId(q.tour)) filter.tour = new mongoose.Types.ObjectId(q.tour);
    const range = dateRange(q.from, q.to);
    if (range) filter.date = range;
    const and = [];
    const drafts = hideOthersDrafts(req);
    if (drafts.$or) and.push(drafts);
    if (q.search) {
        const rx = new RegExp(escapeRegex(q.search), "i");
        and.push({ $or: [{ description: rx }, { expenseNumber: rx }, { billNo: rx }, { staffName: rx }, { category: rx }] });
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
    ["description", "billNo"].forEach(k => { if (body[k] !== undefined) out[k] = String(body[k]).trim(); });
    if (body.tour !== undefined) {
        if (!body.tour || body.tour === "none") out.tour = null;
        else {
            if (!isId(body.tour)) throw new Error("Invalid tour");
            const tour = await Tour.findById(body.tour).select("staff").lean();
            if (!tour) throw new Error("Tour not found");
            if (String(tour.staff) !== String(staffId)) throw new Error("Tour belongs to a different staff member");
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
        // (a draft always belongs to its creator â€” admins can't park drafts on someone else)
        const status = req.body.saveAs === "draft" && String(staff._id) === String(req.user._id) ? "Draft" : "Submitted";
        const exp = await Expense.create({
            ...fields,
            expenseNumber: await nextNumber(Expense, "expenseNumber", "EXP", 4),
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
        const exp = await Expense.findOne({ _id: req.params.id, ...scopeFilter(req) });
        if (!exp) { removeFiles(filesToAttachments(req.files)); return res.status(404).json({ message: "Expense not found" }); }
        if (!canEditExpense(req, exp)) {
            removeFiles(filesToAttachments(req.files));
            return res.status(403).json({ message: `This expense is ${exp.status.toLowerCase()} and cannot be edited` });
        }

        let staffId = exp.staff;
        if (isAdmin(req) && req.body.staff && isId(req.body.staff) && String(req.body.staff) !== String(exp.staff)) {
            const staff = await resolveStaff(req, req.body.staff);
            exp.staff = staff._id;
            exp.staffName = staff.name;
            staffId = staff._id;
            if (req.body.tour === undefined) exp.tour = null; // old tour belonged to the previous staff
        }
        const fields = await validateExpenseBody(req, { ...req.body, _currentDate: exp.date }, staffId);
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
        const exp = await Expense.findOne({ _id: req.params.id, ...scopeFilter(req) });
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

// POST /api/expenses/:id/submit   (owner submits a draft for approval)
exports.submitDraft = async (req, res) => {
    try {
        const exp = await Expense.findOne({ _id: req.params.id, staff: req.user._id });
        if (!exp) return res.status(404).json({ message: "Expense not found" });
        if (exp.status !== "Draft") return res.status(400).json({ message: "Only drafts can be submitted" });
        exp.status = "Submitted";
        exp.statusHistory.push({ status: "Submitted", by: req.user.name || "User", at: new Date() });
        await exp.save();
        res.json(exp);
    } catch (err) {
        console.error("Submit draft error:", err);
        res.status(500).json({ message: "Failed to submit expense" });
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
        throw new Error(`Cannot change ${exp.expenseNumber} from ${exp.status} to ${status}`);
    }
    if (status === "Rejected" && !String(reason || "").trim()) throw new Error("Rejection reason is required");
    exp.status = status;
    exp.rejectionReason = status === "Rejected" ? String(reason).trim() : "";
    if (status === "Approved") { exp.approvedBy = by; exp.approvedAt = new Date(); exp.paidAt = null; exp.paidBy = ""; }
    if (status === "Paid") { exp.paidBy = by; exp.paidAt = new Date(); }
    if (status === "Submitted") { exp.approvedBy = ""; exp.approvedAt = null; }
    exp.statusHistory.push({ status, by, at: new Date(), note: status === "Rejected" ? exp.rejectionReason : (reason || undefined) });
};

// PATCH /api/expenses/:id/status   { status, reason }   (admin)
exports.updateStatus = async (req, res) => {
    try {
        const exp = await Expense.findById(req.params.id);
        if (!exp) return res.status(404).json({ message: "Expense not found" });
        applyStatus(exp, req.body.status, req.body.reason, req.user.name || "Admin");
        await exp.save();
        res.json(exp);
    } catch (err) {
        res.status(400).json({ message: err.message || "Failed to update status" });
    }
};

// POST /api/expenses/bulk-status   { ids: [], status, reason }   (admin)
exports.bulkStatus = async (req, res) => {
    try {
        const ids = (req.body.ids || []).filter(isId);
        if (!ids.length) return res.status(400).json({ message: "No expenses selected" });
        const exps = await Expense.find({ _id: { $in: ids } });
        const results = { updated: 0, skipped: [] };
        for (const exp of exps) {
            try {
                applyStatus(exp, req.body.status, req.body.reason, req.user.name || "Admin");
                await exp.save();
                results.updated++;
            } catch (e) {
                results.skipped.push(`${exp.expenseNumber}: ${e.message}`);
            }
        }
        res.json(results);
    } catch (err) {
        res.status(500).json({ message: "Bulk update failed" });
    }
};
