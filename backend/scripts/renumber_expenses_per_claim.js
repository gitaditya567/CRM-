// One expense number per claim: rows of a claim become EXP-YYMM-####/1, /2, ...
// Usage (from backend/):  node scripts/renumber_expenses_per_claim.js          → preview only
//                         node scripts/renumber_expenses_per_claim.js --apply  → backup + renumber in a transaction
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Expense = require("../models/Expense");

(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const rows = await Expense.find({}).select("expenseNumber claimNumber date createdAt").sort({ createdAt: 1, _id: 1 }).lean();

    // Claims (or loose rows) in creation order, numbered per month of their first row's number
    const groups = new Map();
    rows.forEach(r => {
        const key = r.claimNumber || `single:${r._id}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(r);
    });
    const counters = {};
    const plan = [];
    for (const items of groups.values()) {
        const ym = (items[0].expenseNumber.match(/^EXP-(\d{4})-/) || [])[1] || "0000";
        counters[ym] = (counters[ym] || 0) + 1;
        const base = `EXP-${ym}-${String(counters[ym]).padStart(4, "0")}`;
        items.sort((a, b) => new Date(a.date) - new Date(b.date) || new Date(a.createdAt) - new Date(b.createdAt));
        items.forEach((r, i) => plan.push({ _id: r._id, claimNumber: r.claimNumber, from: r.expenseNumber, to: `${base}/${i + 1}` }));
    }
    plan.forEach(p => console.log(`${p.claimNumber.padEnd(13)} ${p.from.padEnd(18)} → ${p.to}`));
    const changes = plan.filter(p => p.from !== p.to);
    console.log(`${changes.length} of ${plan.length} row(s) to renumber`);

    if (process.argv.includes("--apply") && changes.length) {
        const backup = path.join(__dirname, `backup_expense_numbers_${Date.now()}.json`);
        fs.writeFileSync(backup, JSON.stringify(rows, null, 2));
        console.log("backup:", backup);
        const session = await mongoose.startSession();
        await session.withTransaction(async () => {
            for (const p of changes) await Expense.updateOne({ _id: p._id }, { $set: { expenseNumber: p.to } }, { session });
        });
        await session.endSession();
        console.log("renumbered");
    }
    await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
