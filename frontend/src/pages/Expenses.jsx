import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    Wallet, Plane, Receipt, Plus, X, Search, Download, Edit2, Trash2, Eye, CheckCircle2, XCircle,
    IndianRupee, Clock, Paperclip, RefreshCw, MapPin, Calendar, User, BadgeCheck, Ban, ChevronLeft, ChevronRight,
    Save, Send, FileText
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import API, { API_BASE_URL } from "../api/api";
import toast from "react-hot-toast";

// ---------- shared helpers ----------
const CHART_COLOR = "#0d9488"; // validated for light & dark surfaces (single-series charts)
const FILE_BASE = API_BASE_URL.replace(/\/api$/, "");
const inr = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-");
const toInputDate = (d) => (d ? new Date(d).toISOString().split("T")[0] : "");
const todayStr = () => new Date().toISOString().split("T")[0];
const MY_ID = () => localStorage.getItem("userId") || "";
// "21 Oct 2026" or "21 Oct – 23 Oct 2026" for a multi-day expense
const fmtExpenseDate = (x) => {
    if (!x.endDate) return fmtDate(x.date);
    const s = new Date(x.date), e = new Date(x.endDate);
    const sameYear = s.getFullYear() === e.getFullYear();
    const start = s.toLocaleDateString("en-GB", { day: "2-digit", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
    return `${start} – ${fmtDate(e)}`;
};
const dayCount = (x) => (x.endDate ? Math.round((new Date(x.endDate) - new Date(x.date)) / 86400000) + 1 : 1);

const STATUS_STYLES = {
    Draft: { cls: "bg-gray-100 text-gray-600 border-gray-300 border-dashed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600", icon: FileText },
    Submitted: { cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800", icon: Clock },
    Approved: { cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800", icon: CheckCircle2 },
    Rejected: { cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800", icon: XCircle },
    Paid: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800", icon: BadgeCheck },
    Planned: { cls: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600", icon: Calendar },
    Ongoing: { cls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800", icon: Plane },
    Completed: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800", icon: CheckCircle2 },
    Cancelled: { cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800", icon: Ban },
};

const StatusChip = ({ status }) => {
    const s = STATUS_STYLES[status] || STATUS_STYLES.Planned;
    const Icon = s.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${s.cls}`}>
            <Icon size={11} /> {status}
        </span>
    );
};

// Date range presets (Indian financial year Apr–Mar)
const rangeFor = (preset) => {
    const now = new Date();
    const iso = (d) => d.toISOString().split("T")[0];
    if (preset === "this_month") return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
    if (preset === "last_month") return { from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) };
    if (preset === "this_fy") {
        const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        return { from: iso(new Date(fyStart, 3, 1)), to: iso(now) };
    }
    return { from: "", to: "" }; // all time / custom
};

const inputCls = "w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500";
const labelCls = "block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1";
const btnPrimary = "flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition cursor-pointer";
const btnGhost = "px-4 py-2.5 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition cursor-pointer";
const iconBtn = "p-2 rounded-xl transition hover:scale-110 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100";

// Pass onSubmit to make the panel itself the <form> (keeps native validation inside the portal)
const Modal = ({ title, subtitle, icon: Icon, onClose, children, footer, wide, onSubmit }) => {
    const Panel = onSubmit ? "form" : "div";
    return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onMouseDown={onClose}>
        <Panel
            onSubmit={onSubmit}
            className={`w-full ${wide ? "max-w-4xl" : "max-w-2xl"} max-h-[92vh] flex flex-col bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden`}
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
        >
            <div className="px-6 py-5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    {Icon && <Icon size={22} className="shrink-0" />}
                    <div className="min-w-0">
                        <h3 className="text-lg font-black uppercase tracking-wider truncate">{title}</h3>
                        {subtitle && <p className="text-xs text-teal-50 font-medium truncate">{subtitle}</p>}
                    </div>
                </div>
                <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 cursor-pointer shrink-0" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">{children}</div>
            {footer && <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2 shrink-0">{footer}</div>}
        </Panel>
    </div>,
    document.body
    );
};

// ---------- Stat tile ----------
const StatTile = ({ label, value, hint, icon: Icon, tone = "text-teal-600 dark:text-teal-400" }) => (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">{label}</p>
            <Icon size={18} className={tone} />
        </div>
        <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{value}</p>
        {hint && <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">{hint}</p>}
    </div>
);

const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-lg text-xs">
            <p className="font-black text-gray-800 dark:text-white">{label || p.name || p.category || p.month}</p>
            <p className="font-semibold text-gray-600 dark:text-gray-300">{inr(payload[0].value)}{p.count !== undefined ? ` · ${p.count} entr${p.count === 1 ? "y" : "ies"}` : ""}</p>
        </div>
    );
};

const ChartCard = ({ title, children, empty }) => (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-black text-gray-800 dark:text-white mb-3">{title}</h3>
        {empty ? <p className="py-12 text-center text-xs font-bold uppercase tracking-widest text-gray-400">No approved expenses yet</p> : children}
    </div>
);

// One-series horizontal bar chart (categories / staff) — single hue, thin bars, value tooltip
const HBarChart = ({ data, dataKey, nameKey }) => (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
            <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(v >= 1000 ? 0 : 1)}k`} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey={nameKey} width={120} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(13,148,136,0.08)" }} />
            <Bar dataKey={dataKey} fill={CHART_COLOR} barSize={14} radius={[0, 4, 4, 0]} />
        </BarChart>
    </ResponsiveContainer>
);

// ================= Expense form =================
const ExpenseFormModal = ({ meta, expense, tours, defaultTour, onClose, onSaved }) => {
    const isEdit = !!expense;
    const [form, setForm] = useState(() => ({
        staff: expense?.staff || defaultTour?.staff || "",
        tour: expense?.tour?._id || expense?.tour || defaultTour?._id || "",
        date: toInputDate(expense?.date) || todayStr(),
        endDate: toInputDate(expense?.endDate),
        category: expense?.category || meta.categories[0],
        amount: expense?.amount ?? "",
        paymentMode: expense?.paymentMode || "Cash",
        billNo: expense?.billNo || "",
        description: expense?.description || "",
    }));
    const [newFiles, setNewFiles] = useState([]);
    const [removed, setRemoved] = useState([]);
    const [saving, setSaving] = useState(null); // "draft" | "submit" while saving
    const [isRange, setIsRange] = useState(!!expense?.endDate);

    const staffId = form.staff || defaultTour?.staff || "";
    // Drafts are private to their owner: offered when the expense is (or will be) the user's own
    const ownExpense = !meta.isAdmin || String(form.staff) === String(MY_ID());
    const canDraft = ownExpense && (!isEdit || ["Draft", "Rejected"].includes(expense.status));
    const submitLabel = !isEdit ? "Submit" : (["Draft", "Rejected"].includes(expense.status) && ownExpense ? "Submit" : "Save Changes");
    const staffTours = useMemo(
        () => tours.filter(t => !meta.isAdmin || !staffId || String(t.staff) === String(staffId)),
        [tours, staffId, meta.isAdmin]
    );
    const keptAttachments = (expense?.attachments || []).filter(a => !removed.includes(a.url));

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        // Which footer button submitted the form: "draft" or "submit"
        const mode = e.nativeEvent?.submitter?.value === "draft" ? "draft" : "submit";
        if (!(Number(form.amount) > 0)) return toast.error("Enter an amount greater than 0");
        if (isRange && form.endDate && form.endDate < form.date) return toast.error("'To' date cannot be before 'From' date");
        if (keptAttachments.length + newFiles.length > 5) return toast.error("You can attach up to 5 bills");
        setSaving(mode);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => { if (k !== "staff" || meta.isAdmin) fd.append(k, v ?? ""); });
            if (!form.tour) fd.set("tour", "none");
            fd.set("endDate", isRange ? form.endDate : "");
            fd.append("saveAs", mode);
            newFiles.forEach(f => fd.append("bills", f));
            if (removed.length) fd.append("removeAttachments", JSON.stringify(removed));
            if (isEdit) await API.put(`/expenses/${expense._id}`, fd);
            else await API.post("/expenses", fd);
            toast.success(mode === "draft" ? "Saved as draft — submit it when ready" : (isEdit && submitLabel === "Save Changes" ? "Expense updated" : "Expense submitted for approval"));
            onSaved();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save expense");
        } finally {
            setSaving(null);
        }
    };

    return (
            <Modal
                title={isEdit ? `Edit ${expense.expenseNumber}` : "Add Expense"}
                subtitle={isEdit && expense.status === "Rejected" ? `Rejected: ${expense.rejectionReason} — fix it and submit again` : (isEdit && expense.status === "Draft" ? "Draft — only you can see it until you submit" : "Record a spend with its bill")}
                icon={Receipt}
                onClose={onClose}
                onSubmit={submit}
                footer={<>
                    <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
                    {canDraft && (
                        <button type="submit" value="draft" disabled={!!saving}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/20 disabled:opacity-60 cursor-pointer">
                            {saving === "draft" ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                            {saving === "draft" ? "Saving..." : "Save as Draft"}
                        </button>
                    )}
                    <button type="submit" value="submit" className={btnPrimary} disabled={!!saving}>
                        {saving === "submit" ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                        {saving === "submit" ? "Saving..." : submitLabel}
                    </button>
                </>}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {meta.isAdmin && (
                        <div>
                            <label className={labelCls}>Staff *</label>
                            <select className={inputCls} value={form.staff} onChange={e => setForm(f => ({ ...f, staff: e.target.value, tour: "" }))} required>
                                <option value="">Select staff</option>
                                {meta.staff.map(s => <option key={s._id} value={s._id}>{s.name} ({s.role})</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className={labelCls}>Tour / Trip</label>
                        <select className={inputCls} value={form.tour} onChange={e => set("tour", e.target.value)}>
                            <option value="">No tour (office / local expense)</option>
                            {staffTours.map(t => <option key={t._id} value={t._id}>{t.tourNumber} · {t.title}</option>)}
                        </select>
                    </div>
                    <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-1">
                            <label className={labelCls + " mb-0"}>{isRange ? "Date Range *" : "Date *"}</label>
                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-teal-700 dark:text-teal-300 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={isRange}
                                    onChange={e => {
                                        setIsRange(e.target.checked);
                                        if (e.target.checked && !form.endDate) set("endDate", form.date);
                                    }}
                                />
                                Multi-day (e.g. hotel stay)
                            </label>
                        </div>
                        {isRange ? (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400">From</span>
                                    <input type="date" className={inputCls} value={form.date} max={todayStr()} onChange={e => set("date", e.target.value)} required />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400">To</span>
                                    <input type="date" className={inputCls} value={form.endDate} min={form.date} max={todayStr()} onChange={e => set("endDate", e.target.value)} required />
                                </div>
                                {form.endDate && form.endDate >= form.date && (
                                    <p className="col-span-2 text-[11px] font-semibold text-gray-500">
                                        {Math.round((new Date(form.endDate) - new Date(form.date)) / 86400000) + 1} day(s)
                                    </p>
                                )}
                            </div>
                        ) : (
                            <input type="date" className={inputCls} value={form.date} max={todayStr()} onChange={e => set("date", e.target.value)} required />
                        )}
                    </div>
                    <div>
                        <label className={labelCls}>Category *</label>
                        <select className={inputCls} value={form.category} onChange={e => set("category", e.target.value)}>
                            {meta.categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Amount (₹) *</label>
                        <input type="number" min="0" step="0.01" className={inputCls} value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="0.00" required />
                    </div>
                    <div>
                        <label className={labelCls}>Payment Mode</label>
                        <select className={inputCls} value={form.paymentMode} onChange={e => set("paymentMode", e.target.value)}>
                            {meta.paymentModes.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Bill / Ticket No.</label>
                        <input className={inputCls} value={form.billNo} onChange={e => set("billNo", e.target.value)} placeholder="Optional" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className={labelCls}>Description</label>
                        <input className={inputCls} value={form.description} onChange={e => set("description", e.target.value)} placeholder="e.g. Train Delhi → Hyderabad, 3AC" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className={labelCls}>Bills / Receipts (image or PDF, max 5 · 5 MB each)</label>
                        <input
                            type="file"
                            multiple
                            accept="image/*,application/pdf"
                            onChange={e => setNewFiles(Array.from(e.target.files || []).slice(0, 5))}
                            className="block w-full text-xs text-gray-600 dark:text-gray-300 file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-teal-50 file:text-teal-700 dark:file:bg-teal-900/30 dark:file:text-teal-300 file:font-bold cursor-pointer"
                        />
                        {(keptAttachments.length > 0 || newFiles.length > 0) && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {keptAttachments.map(a => (
                                    <span key={a.url} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200">
                                        <Paperclip size={12} />
                                        <a href={`${FILE_BASE}${a.url}`} target="_blank" rel="noopener noreferrer" className="hover:underline max-w-[160px] truncate">{a.name}</a>
                                        <button type="button" onClick={() => setRemoved(r => [...r, a.url])} className="text-red-500 hover:text-red-700 cursor-pointer" aria-label={`Remove ${a.name}`}><X size={12} /></button>
                                    </span>
                                ))}
                                {newFiles.map(f => (
                                    <span key={f.name} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-xs font-semibold text-teal-700 dark:text-teal-300">
                                        <Paperclip size={12} /> <span className="max-w-[160px] truncate">{f.name}</span> (new)
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
    );
};

// ================= Tour form =================
const TourFormModal = ({ meta, tour, onClose, onSaved }) => {
    const isEdit = !!tour;
    const [form, setForm] = useState(() => ({
        staff: tour?.staff || "",
        title: tour?.title || "",
        purpose: tour?.purpose || "",
        fromCity: tour?.fromCity || "",
        toCities: tour?.toCities || "",
        startDate: toInputDate(tour?.startDate) || todayStr(),
        endDate: toInputDate(tour?.endDate) || todayStr(),
        status: tour?.status || "Planned",
        advanceAmount: tour?.advanceAmount ?? "",
        advanceDate: toInputDate(tour?.advanceDate),
        advanceMode: tour?.advanceMode || "",
        notes: tour?.notes || "",
    }));
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return toast.error("Tour title is required");
        if (form.endDate < form.startDate) return toast.error("End date cannot be before start date");
        setSaving(true);
        try {
            const payload = { ...form };
            if (!meta.isAdmin) { delete payload.staff; delete payload.advanceAmount; delete payload.advanceDate; delete payload.advanceMode; }
            if (isEdit) await API.put(`/expenses/tours/${tour._id}`, payload);
            else await API.post("/expenses/tours", payload);
            toast.success(isEdit ? "Tour updated" : "Tour created");
            onSaved();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save tour");
        } finally {
            setSaving(false);
        }
    };

    return (
            <Modal
                title={isEdit ? `Edit ${tour.tourNumber}` : "New Tour / Trip"}
                subtitle="Plan the trip; expenses and advance are tracked against it"
                icon={Plane}
                onClose={onClose}
                onSubmit={submit}
                footer={<>
                    <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
                    <button type="submit" className={btnPrimary} disabled={saving}>
                        {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Tour"}
                    </button>
                </>}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {meta.isAdmin && (
                        <div>
                            <label className={labelCls}>Staff *</label>
                            <select className={inputCls} value={form.staff} onChange={e => set("staff", e.target.value)} required>
                                <option value="">Select staff</option>
                                {meta.staff.map(s => <option key={s._id} value={s._id}>{s.name} ({s.role})</option>)}
                            </select>
                        </div>
                    )}
                    <div className={meta.isAdmin ? "" : "sm:col-span-2"}>
                        <label className={labelCls}>Tour Title *</label>
                        <input className={inputCls} value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Hyderabad dealer visit" required />
                    </div>
                    <div>
                        <label className={labelCls}>From City</label>
                        <input className={inputCls} value={form.fromCity} onChange={e => set("fromCity", e.target.value)} placeholder="e.g. New Delhi" />
                    </div>
                    <div>
                        <label className={labelCls}>Destination(s)</label>
                        <input className={inputCls} value={form.toCities} onChange={e => set("toCities", e.target.value)} placeholder="e.g. Hyderabad, Bengaluru" />
                    </div>
                    <div>
                        <label className={labelCls}>Start Date *</label>
                        <input type="date" className={inputCls} value={form.startDate} onChange={e => set("startDate", e.target.value)} required />
                    </div>
                    <div>
                        <label className={labelCls}>End Date *</label>
                        <input type="date" className={inputCls} value={form.endDate} min={form.startDate} onChange={e => set("endDate", e.target.value)} required />
                    </div>
                    <div className="sm:col-span-2">
                        <label className={labelCls}>Purpose</label>
                        <input className={inputCls} value={form.purpose} onChange={e => set("purpose", e.target.value)} placeholder="Service visit, installation, sales meeting..." />
                    </div>
                    <div>
                        <label className={labelCls}>Status</label>
                        <select className={inputCls} value={form.status} onChange={e => set("status", e.target.value)}>
                            {meta.tourStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    {meta.isAdmin && (
                        <>
                            <div>
                                <label className={labelCls}>Advance Given (₹)</label>
                                <input type="number" min="0" step="0.01" className={inputCls} value={form.advanceAmount} onChange={e => set("advanceAmount", e.target.value)} placeholder="0" />
                            </div>
                            <div>
                                <label className={labelCls}>Advance Date</label>
                                <input type="date" className={inputCls} value={form.advanceDate} onChange={e => set("advanceDate", e.target.value)} />
                            </div>
                            <div>
                                <label className={labelCls}>Advance Mode</label>
                                <select className={inputCls} value={form.advanceMode} onChange={e => set("advanceMode", e.target.value)}>
                                    <option value="">—</option>
                                    {meta.paymentModes.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                    <div className="sm:col-span-2">
                        <label className={labelCls}>Notes</label>
                        <textarea rows={2} className={inputCls} value={form.notes} onChange={e => set("notes", e.target.value)} />
                    </div>
                </div>
            </Modal>
    );
};

// ================= Reject reason =================
const RejectModal = ({ count, onClose, onConfirm }) => {
    const [reason, setReason] = useState("");
    return (
        <Modal
            title={`Reject ${count > 1 ? `${count} expenses` : "expense"}`}
            subtitle="The staff member will see this reason and can correct & re-submit"
            icon={XCircle}
            onClose={onClose}
            footer={<>
                <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
                <button
                    type="button"
                    disabled={!reason.trim()}
                    onClick={() => onConfirm(reason.trim())}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                    <XCircle size={14} /> Reject
                </button>
            </>}
        >
            <label className={labelCls}>Reason *</label>
            <textarea autoFocus rows={3} className={inputCls} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Bill missing / amount above hotel limit" />
        </Modal>
    );
};

// ================= Expense detail =================
const ExpenseDetailModal = ({ expense, onClose }) => (
    <Modal title={expense.expenseNumber} subtitle={`${expense.staffName} · ${fmtExpenseDate(expense)}${expense.endDate ? ` (${dayCount(expense)} days)` : ""}`} icon={Receipt} onClose={onClose}>
        <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3">
                <p className="text-2xl font-black text-gray-900 dark:text-white">{inr(expense.amount)}</p>
                <StatusChip status={expense.status} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                    ["Category", expense.category], ["Payment", expense.paymentMode],
                    ["Tour", expense.tour ? `${expense.tour.tourNumber} · ${expense.tour.title}` : "No tour"], ["Bill No.", expense.billNo || "-"],
                ].map(([k, v]) => (
                    <div key={k}><p className={labelCls}>{k}</p><p className="font-semibold text-gray-800 dark:text-gray-200">{v}</p></div>
                ))}
            </div>
            {expense.description && <p className="text-gray-700 dark:text-gray-300">{expense.description}</p>}
            {expense.rejectionReason && (
                <p className="text-xs font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 rounded-lg px-3 py-2">Rejected: {expense.rejectionReason}</p>
            )}
            <div>
                <p className={labelCls}>Bills</p>
                {expense.attachments?.length ? (
                    <div className="flex flex-wrap gap-2">
                        {expense.attachments.map(a => (
                            <a key={a.url} href={`${FILE_BASE}${a.url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-xs font-bold text-teal-700 dark:text-teal-300 hover:underline">
                                <Paperclip size={12} /> {a.name}
                            </a>
                        ))}
                    </div>
                ) : <p className="text-xs text-gray-400">No bill attached</p>}
            </div>
            <div>
                <p className={labelCls}>History</p>
                <ol className="space-y-1.5">
                    {(expense.statusHistory || []).map((h, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                            <StatusChip status={h.status} />
                            <span>{h.by} · {new Date(h.at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                            {h.note && <span className="text-gray-400">— {h.note}</span>}
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    </Modal>
);

// ================= Tour detail (settlement) =================
const TourDetailModal = ({ meta, tourId, onClose, onChanged, onAddExpense }) => {
    const [data, setData] = useState(null);
    const load = useCallback(() => {
        API.get(`/expenses/tours/${tourId}`).then(res => setData(res.data)).catch(() => toast.error("Failed to load tour"));
    }, [tourId]);
    useEffect(() => { load(); }, [load]);

    const toggleSettled = async () => {
        try {
            await API.put(`/expenses/tours/${tourId}`, { settled: !data.tour.settled });
            toast.success(data.tour.settled ? "Marked as not settled" : "Advance marked as settled");
            load();
            onChanged();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update");
        }
    };

    const t = data?.tour;
    return (
        <Modal wide title={t ? `${t.tourNumber} · ${t.title}` : "Tour"} subtitle={t ? `${t.staffName} · ${fmtDate(t.startDate)} – ${fmtDate(t.endDate)}` : ""} icon={Plane} onClose={onClose}
            footer={t && <>
                {meta.isAdmin && (t.advanceAmount > 0) && (
                    <button type="button" className={btnGhost} onClick={toggleSettled}>{t.settled ? "Mark Not Settled" : "Mark Advance Settled"}</button>
                )}
                {t.status !== "Cancelled" && (
                    <button type="button" className={btnPrimary} onClick={() => onAddExpense(t)}><Plus size={14} /> Add Expense</button>
                )}
            </>}
        >
            {!t ? (
                <div className="py-12 flex justify-center"><RefreshCw className="animate-spin text-teal-600" /></div>
            ) : (
                <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
                        <StatusChip status={t.status} />
                        {(t.fromCity || t.toCities) && <span className="flex items-center gap-1"><MapPin size={13} /> {[t.fromCity, t.toCities].filter(Boolean).join(" → ")}</span>}
                        {t.settled && <span className="font-bold text-emerald-600">Settled {fmtDate(t.settledAt)}</span>}
                    </div>
                    {t.purpose && <p className="text-sm text-gray-700 dark:text-gray-300">{t.purpose}</p>}

                    {/* Settlement */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            ["Advance", inr(t.advanceAmount), t.advanceDate ? `${fmtDate(t.advanceDate)} · ${t.advanceMode || ""}` : "Not given"],
                            ["Spent (approved)", inr(t.spent), `${t.count} entries`],
                            ["Pending approval", inr(t.pending), ""],
                            [t.balance >= 0 ? "Staff to return" : "Company to pay", inr(Math.abs(t.balance)), t.balance === 0 ? "Fully settled" : ""],
                        ].map(([k, v, h]) => (
                            <div key={k} className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                                <p className={labelCls}>{k}</p>
                                <p className="text-lg font-black text-gray-900 dark:text-white">{v}</p>
                                {h && <p className="text-[11px] text-gray-500">{h}</p>}
                            </div>
                        ))}
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-900/60 text-[10px] font-black uppercase tracking-wider text-gray-500">
                                <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Description</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Bills</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {data.expenses.length === 0 ? (
                                    <tr><td colSpan="6" className="px-3 py-8 text-center text-gray-400 font-bold uppercase tracking-widest">No expenses on this tour yet</td></tr>
                                ) : data.expenses.map(x => (
                                    <tr key={x._id}>
                                        <td className="px-3 py-2 whitespace-nowrap">{fmtExpenseDate(x)}</td>
                                        <td className="px-3 py-2">{x.category}</td>
                                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{x.description || "-"}</td>
                                        <td className="px-3 py-2 text-right font-bold">{inr(x.amount)}</td>
                                        <td className="px-3 py-2"><StatusChip status={x.status} /></td>
                                        <td className="px-3 py-2">{x.attachments?.length ? x.attachments.map(a => (
                                            <a key={a.url} href={`${FILE_BASE}${a.url}`} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline mr-2" title={a.name}><Paperclip size={13} className="inline" /></a>
                                        )) : "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </Modal>
    );
};

// ================= Page =================
const TABS = [
    { key: "overview", label: "Overview", icon: Wallet },
    { key: "expenses", label: "Expenses", icon: Receipt },
    { key: "tours", label: "Tours", icon: Plane },
];

const Expenses = () => {
    const [meta, setMeta] = useState(null);
    const [tab, setTab] = useState("overview");
    const [preset, setPreset] = useState("this_month");
    const [filters, setFilters] = useState({ ...rangeFor("this_month"), staff: "", status: "All", category: "All", tour: "", search: "" });
    const [summary, setSummary] = useState(null);
    const [expenses, setExpenses] = useState({ items: [], total: 0, pages: 1, totalAmount: 0 });
    const [page, setPage] = useState(1);
    const [tours, setTours] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState([]);

    const [expenseForm, setExpenseForm] = useState(null); // { expense?, defaultTour? }
    const [tourForm, setTourForm] = useState(null);       // { tour? }
    const [tourDetail, setTourDetail] = useState(null);   // tourId
    const [expenseDetail, setExpenseDetail] = useState(null);
    const [rejecting, setRejecting] = useState(null);     // [ids]

    useEffect(() => {
        API.get("/expenses/meta").then(res => setMeta(res.data)).catch(() => toast.error("Failed to load Travel & Expenses"));
    }, []);

    const params = useMemo(() => {
        const p = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v && v !== "All") p.append(k, v); });
        return p;
    }, [filters]);

    const loadSummary = useCallback(() => {
        const p = new URLSearchParams();
        ["from", "to", "staff"].forEach(k => filters[k] && p.append(k, filters[k]));
        API.get(`/expenses/summary?${p}`).then(res => setSummary(res.data)).catch(() => {});
    }, [filters.from, filters.to, filters.staff]);

    const loadExpenses = useCallback((pg = page) => {
        setLoading(true);
        const p = new URLSearchParams(params);
        p.append("page", pg);
        p.append("limit", 25);
        API.get(`/expenses?${p}`)
            .then(res => { setExpenses(res.data); setSelected([]); })
            .catch(() => toast.error("Failed to load expenses"))
            .finally(() => setLoading(false));
    }, [params, page]);

    const loadTours = useCallback(() => {
        const p = new URLSearchParams();
        if (filters.staff) p.append("staff", filters.staff);
        if (filters.search && tab === "tours") p.append("search", filters.search);
        API.get(`/expenses/tours?${p}`).then(res => setTours(res.data || [])).catch(() => {});
    }, [filters.staff, filters.search, tab]);

    const refreshAll = useCallback(() => { loadSummary(); loadExpenses(); loadTours(); }, [loadSummary, loadExpenses, loadTours]);

    useEffect(() => { if (meta) loadSummary(); }, [meta, loadSummary]);
    useEffect(() => { if (meta) loadTours(); }, [meta, loadTours]);
    useEffect(() => { if (meta) loadExpenses(page); }, [meta, params, page]); // eslint-disable-line react-hooks/exhaustive-deps

    const setFilter = (k, v) => { setPage(1); setFilters(f => ({ ...f, [k]: v })); };
    const applyPreset = (p) => {
        setPreset(p);
        if (p !== "custom") { setPage(1); setFilters(f => ({ ...f, ...rangeFor(p) })); }
    };

    const changeStatus = async (ids, status, reason) => {
        try {
            if (ids.length === 1) {
                await API.patch(`/expenses/${ids[0]}/status`, { status, reason });
                toast.success(`Expense ${status.toLowerCase()}`);
            } else {
                const res = await API.post("/expenses/bulk-status", { ids, status, reason });
                toast.success(`${res.data.updated} expense(s) ${status.toLowerCase()}`);
                if (res.data.skipped?.length) toast.error(`Skipped: ${res.data.skipped.join("; ")}`, { duration: 6000 });
            }
            refreshAll();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update status");
        }
    };

    const deleteExpense = async (x) => {
        if (!window.confirm(`Delete ${x.expenseNumber} (${inr(x.amount)})? This cannot be undone.`)) return;
        try {
            await API.delete(`/expenses/${x._id}`);
            toast.success("Expense deleted");
            refreshAll();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete");
        }
    };

    const deleteTour = async (t) => {
        if (!window.confirm(`Delete tour ${t.tourNumber} "${t.title}"?`)) return;
        try {
            await API.delete(`/expenses/tours/${t._id}`);
            toast.success("Tour deleted");
            refreshAll();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete tour");
        }
    };

    const exportCSV = async () => {
        try {
            const p = new URLSearchParams(params);
            p.append("limit", 5000);
            const res = await API.get(`/expenses?${p}`);
            const rows = res.data.items || [];
            if (!rows.length) return toast.error("Nothing to export for these filters");
            const head = ["Expense No", "From Date", "To Date", "Staff", "Tour No", "Tour", "Category", "Description", "Amount (INR)", "Payment Mode", "Bill No", "Status", "Approved By", "Paid On", "Rejection Reason", "Bills"];
            const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
            const lines = rows.map(x => [
                x.expenseNumber, fmtDate(x.date), x.endDate ? fmtDate(x.endDate) : "", x.staffName, x.tour?.tourNumber || "", x.tour?.title || "", x.category, x.description,
                x.amount, x.paymentMode, x.billNo, x.status, x.approvedBy, x.paidAt ? fmtDate(x.paidAt) : "", x.rejectionReason, x.attachments?.length || 0
            ].map(esc).join(","));
            const blob = new Blob(["﻿" + [head.map(esc).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Expenses_${filters.from || "all"}_${filters.to || todayStr()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error("Export failed");
        }
    };

    if (!meta) {
        return <div className="p-8 flex justify-center"><RefreshCw className="animate-spin text-teal-600" /></div>;
    }

    const isAdmin = meta.isAdmin;
    const myId = MY_ID();
    const isMine = (x) => String(x.staff) === String(myId);
    // Same rules as the API: drafts only by their owner; admin anything except Paid; staff only Submitted / Rejected
    const canEdit = (x) => {
        if (x.status === "Draft") return isMine(x);
        return isAdmin ? x.status !== "Paid" : ["Submitted", "Rejected"].includes(x.status);
    };
    const visibleTabs = isAdmin ? TABS : TABS.filter(t => t.key !== "tours");

    const submitDraft = async (x) => {
        try {
            await API.post(`/expenses/${x._id}/submit`);
            toast.success(`${x.expenseNumber} submitted for approval`);
            refreshAll();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to submit");
        }
    };
    const selectable = expenses.items.filter(x => ["Submitted", "Approved"].includes(x.status));
    const selectedItems = expenses.items.filter(x => selected.includes(x._id));
    const allSubmitted = selectedItems.length > 0 && selectedItems.every(x => x.status === "Submitted");
    const allApproved = selectedItems.length > 0 && selectedItems.every(x => x.status === "Approved");

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                        <Wallet className="text-teal-600" size={28} /> Travel & Expenses
                    </h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                        {isAdmin ? "Track every tour and spend across staff — approve claims, settle advances, export." : "Record your own expenses with bills — save as draft or submit for approval, and track their status."}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {isAdmin && <button className={btnGhost + " border border-gray-200 dark:border-gray-700 flex items-center gap-2"} onClick={() => setTourForm({})}><Plane size={14} /> New Tour</button>}
                    <button className={btnPrimary} onClick={() => setExpenseForm({})}><Plus size={14} /> Add Expense</button>
                </div>
            </div>

            {/* Tabs + filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                <div className="flex bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl w-fit gap-1 flex-wrap">
                    {visibleTabs.map(({ key, label, icon: Icon }) => (
                        <button key={key} onClick={() => setTab(key)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${tab === key ? "bg-white dark:bg-gray-800 text-teal-600 dark:text-teal-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"}`}>
                            <Icon size={15} /> {label}
                            {key === "expenses" && isAdmin && summary?.pendingApproval?.count > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px]">{summary.pendingApproval.count}</span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className={labelCls}>Period</label>
                        <select className={inputCls} value={preset} onChange={e => applyPreset(e.target.value)}>
                            <option value="this_month">This month</option>
                            <option value="last_month">Last month</option>
                            <option value="this_fy">This financial year</option>
                            <option value="all">All time</option>
                            <option value="custom">Custom…</option>
                        </select>
                    </div>
                    {preset === "custom" && (
                        <>
                            <div><label className={labelCls}>From</label><input type="date" className={inputCls} value={filters.from} onChange={e => setFilter("from", e.target.value)} /></div>
                            <div><label className={labelCls}>To</label><input type="date" className={inputCls} value={filters.to} onChange={e => setFilter("to", e.target.value)} /></div>
                        </>
                    )}
                    {isAdmin && (
                        <div>
                            <label className={labelCls}>Staff</label>
                            <select className={inputCls} value={filters.staff} onChange={e => setFilter("staff", e.target.value)}>
                                <option value="">All staff</option>
                                {meta.staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>
                    )}
                    {tab === "expenses" && (
                        <>
                            <div>
                                <label className={labelCls}>Status</label>
                                <select className={inputCls} value={filters.status} onChange={e => setFilter("status", e.target.value)}>
                                    <option value="All">All statuses</option>
                                    {meta.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Category</label>
                                <select className={inputCls} value={filters.category} onChange={e => setFilter("category", e.target.value)}>
                                    <option value="All">All categories</option>
                                    {meta.categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Tour</label>
                                <select className={inputCls} value={filters.tour} onChange={e => setFilter("tour", e.target.value)}>
                                    <option value="">All</option>
                                    <option value="none">No tour</option>
                                    {tours.map(t => <option key={t._id} value={t._id}>{t.tourNumber} · {t.title}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                    {tab !== "overview" && (
                        <div className="flex-1 min-w-[180px]">
                            <label className={labelCls}>Search</label>
                            <div className="relative">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input className={inputCls + " pl-9"} value={filters.search} onChange={e => setFilter("search", e.target.value)} placeholder={tab === "tours" ? "Tour, city, staff..." : "Description, bill no, staff..."} />
                            </div>
                        </div>
                    )}
                    {tab === "expenses" && (
                        <button className={btnGhost + " border border-gray-200 dark:border-gray-700 flex items-center gap-2"} onClick={exportCSV}><Download size={14} /> Export CSV</button>
                    )}
                </div>
            </div>

            {/* ===== Overview ===== */}
            {tab === "overview" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatTile label="Total spent" value={inr(summary?.spent)} hint="Approved + paid in this period" icon={IndianRupee} />
                        <StatTile label="Pending approval" value={inr(summary?.pendingApproval?.amount)} hint={`${summary?.pendingApproval?.count || 0} claim(s) waiting`} icon={Clock} tone="text-amber-500" />
                        <StatTile label="Approved, to pay" value={inr(summary?.approvedUnpaid?.amount)} hint={`${summary?.approvedUnpaid?.count || 0} claim(s) not yet paid`} icon={CheckCircle2} tone="text-blue-500" />
                        {isAdmin
                            ? <StatTile label="Active tours" value={summary?.activeTours ?? 0} hint={`Open advances ${inr(summary?.openAdvances)}`} icon={Plane} />
                            : <StatTile label="My drafts" value={summary?.drafts?.count ?? 0} hint={`${inr(summary?.drafts?.amount)} not yet submitted`} icon={FileText} tone="text-gray-500" />}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartCard title="Spend by category" empty={!summary?.byCategory?.length}>
                            <HBarChart data={summary?.byCategory || []} dataKey="amount" nameKey="category" />
                        </ChartCard>
                        {isAdmin ? (
                            <ChartCard title="Spend by staff (top 10)" empty={!summary?.byStaff?.length}>
                                <HBarChart data={summary?.byStaff || []} dataKey="amount" nameKey="name" />
                            </ChartCard>
                        ) : (
                            <ChartCard title="Monthly spend (last 6 months)" empty={!summary?.byMonth?.some(m => m.amount > 0)}>
                                <MonthChart data={summary?.byMonth || []} />
                            </ChartCard>
                        )}
                    </div>
                    {isAdmin && (
                        <ChartCard title="Monthly spend (last 6 months)" empty={!summary?.byMonth?.some(m => m.amount > 0)}>
                            <MonthChart data={summary?.byMonth || []} />
                        </ChartCard>
                    )}
                </div>
            )}

            {/* ===== Expenses ===== */}
            {tab === "expenses" && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                            {expenses.total} expense(s) · <span className="text-gray-900 dark:text-white font-black">{inr(expenses.totalAmount)}</span>
                        </p>
                        {isAdmin && selected.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-gray-500">{selected.length} selected</span>
                                {allSubmitted && <button className="px-3 py-1.5 rounded-lg text-xs font-black text-white bg-blue-600 hover:bg-blue-700 cursor-pointer" onClick={() => changeStatus(selected, "Approved")}>Approve</button>}
                                {allSubmitted && <button className="px-3 py-1.5 rounded-lg text-xs font-black text-white bg-red-600 hover:bg-red-700 cursor-pointer" onClick={() => setRejecting(selected)}>Reject</button>}
                                {allApproved && <button className="px-3 py-1.5 rounded-lg text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer" onClick={() => changeStatus(selected, "Paid")}>Mark Paid</button>}
                                {!allSubmitted && !allApproved && <span className="text-[11px] text-amber-600 font-semibold">Select only Submitted or only Approved items</span>}
                            </div>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[960px] text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900/60 text-[10px] font-black uppercase tracking-wider text-gray-500">
                                <tr>
                                    {isAdmin && (
                                        <th className="px-4 py-3 w-10">
                                            <input type="checkbox" aria-label="Select all"
                                                checked={selectable.length > 0 && selectable.every(x => selected.includes(x._id))}
                                                onChange={e => setSelected(e.target.checked ? selectable.map(x => x._id) : [])} />
                                        </th>
                                    )}
                                    <th className="px-4 py-3">Expense</th>
                                    <th className="px-4 py-3">Staff</th>
                                    <th className="px-4 py-3">Category / Description</th>
                                    <th className="px-4 py-3">Tour</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {loading ? (
                                    <tr><td colSpan="8" className="px-4 py-14 text-center"><RefreshCw className="animate-spin inline text-teal-600" /></td></tr>
                                ) : expenses.items.length === 0 ? (
                                    <tr><td colSpan="8" className="px-4 py-14 text-center text-xs font-bold uppercase tracking-widest text-gray-400">No expenses for these filters</td></tr>
                                ) : expenses.items.map(x => (
                                    <tr key={x._id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                                        {isAdmin && (
                                            <td className="px-4 py-3">
                                                <input type="checkbox" aria-label={`Select ${x.expenseNumber}`}
                                                    disabled={!["Submitted", "Approved"].includes(x.status)}
                                                    checked={selected.includes(x._id)}
                                                    onChange={e => setSelected(s => e.target.checked ? [...s, x._id] : s.filter(i => i !== x._id))} />
                                            </td>
                                        )}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <p className="font-bold text-gray-900 dark:text-white font-mono text-xs">{x.expenseNumber}</p>
                                            <p className="text-[11px] text-gray-500">{fmtExpenseDate(x)}{x.endDate ? ` · ${dayCount(x)}d` : ""}</p>
                                        </td>
                                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-semibold">{x.staffName}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">{x.category}</p>
                                            <p className="text-[11px] text-gray-500 line-clamp-1">{x.description || "—"}{x.attachments?.length ? <span className="ml-1 text-teal-600"><Paperclip size={11} className="inline" />{x.attachments.length}</span> : null}</p>
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {x.tour ? <button className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer" onClick={() => setTourDetail(x.tour._id)}>{x.tour.tourNumber}</button> : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white whitespace-nowrap">{inr(x.amount)}</td>
                                        <td className="px-4 py-3">
                                            <StatusChip status={x.status} />
                                            {x.status === "Rejected" && x.rejectionReason && <p className="text-[10px] text-red-500 mt-1 line-clamp-1" title={x.rejectionReason}>{x.rejectionReason}</p>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                <button className={`${iconBtn} text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20`} title="View" onClick={() => setExpenseDetail(x)}><Eye size={16} /></button>
                                                {isAdmin && x.status === "Submitted" && <>
                                                    <button className={`${iconBtn} text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20`} title="Approve" onClick={() => changeStatus([x._id], "Approved")}><CheckCircle2 size={16} /></button>
                                                    <button className={`${iconBtn} text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`} title="Reject" onClick={() => setRejecting([x._id])}><XCircle size={16} /></button>
                                                </>}
                                                {isAdmin && x.status === "Approved" && (
                                                    <button className={`${iconBtn} text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20`} title="Mark Paid" onClick={() => changeStatus([x._id], "Paid")}><BadgeCheck size={16} /></button>
                                                )}
                                                {x.status === "Draft" && isMine(x) && (
                                                    <button className={`${iconBtn} text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20`} title="Submit for approval" onClick={() => submitDraft(x)}><Send size={16} /></button>
                                                )}
                                                <button className={`${iconBtn} text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20`} title="Edit" disabled={!canEdit(x)} onClick={() => setExpenseForm({ expense: x })}><Edit2 size={16} /></button>
                                                <button className={`${iconBtn} text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`} title="Delete" disabled={!canEdit(x)} onClick={() => deleteExpense(x)}><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {expenses.pages > 1 && (
                        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-xs font-bold text-gray-500">
                            <button className={`${iconBtn} border border-gray-200 dark:border-gray-700`} disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
                            Page {page} of {expenses.pages}
                            <button className={`${iconBtn} border border-gray-200 dark:border-gray-700`} disabled={page >= expenses.pages} onClick={() => setPage(p => p + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
                        </div>
                    )}
                </div>
            )}

            {/* ===== Tours ===== */}
            {tab === "tours" && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {tours.length === 0 ? (
                        <div className="md:col-span-2 xl:col-span-3 bg-white dark:bg-gray-800 rounded-3xl p-12 text-center border border-dashed border-gray-200 dark:border-gray-700">
                            <Plane className="mx-auto text-gray-300" size={36} />
                            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-gray-400">No tours yet</p>
                            <button className={btnPrimary + " mx-auto mt-4"} onClick={() => setTourForm({})}><Plus size={14} /> New Tour</button>
                        </div>
                    ) : tours.map(t => (
                        <div key={t._id} className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-mono font-bold text-teal-600 dark:text-teal-400">{t.tourNumber}</p>
                                    <h3 className="font-black text-gray-900 dark:text-white truncate">{t.title}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5"><User size={12} /> {t.staffName}</p>
                                </div>
                                <StatusChip status={t.status} />
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                                <p className="flex items-center gap-1"><Calendar size={12} /> {fmtDate(t.startDate)} – {fmtDate(t.endDate)}</p>
                                {(t.fromCity || t.toCities) && <p className="flex items-center gap-1"><MapPin size={12} /> {[t.fromCity, t.toCities].filter(Boolean).join(" → ")}</p>}
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 py-2"><p className="text-[10px] font-black uppercase text-gray-400">Advance</p><p className="text-sm font-black text-gray-900 dark:text-white">{inr(t.advanceAmount)}</p></div>
                                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 py-2"><p className="text-[10px] font-black uppercase text-gray-400">Spent</p><p className="text-sm font-black text-gray-900 dark:text-white">{inr(t.spent)}</p></div>
                                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 py-2">
                                    <p className="text-[10px] font-black uppercase text-gray-400">{t.balance >= 0 ? "To return" : "To pay"}</p>
                                    <p className="text-sm font-black text-gray-900 dark:text-white">{inr(Math.abs(t.balance))}</p>
                                </div>
                            </div>
                            {t.pending > 0 && <p className="text-[11px] font-semibold text-amber-600">{inr(t.pending)} pending approval</p>}
                            <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-700">
                                <button className="text-xs font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 hover:underline cursor-pointer" onClick={() => setTourDetail(t._id)}>Open · {t.count} expense(s)</button>
                                <div className="flex gap-1">
                                    <button className={`${iconBtn} text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20`} title="Edit tour" disabled={!isAdmin && t.settled} onClick={() => setTourForm({ tour: t })}><Edit2 size={15} /></button>
                                    <button className={`${iconBtn} text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`} title="Delete tour" disabled={t.count > 0} onClick={() => deleteTour(t)}><Trash2 size={15} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ===== Modals ===== */}
            {expenseForm && (
                <ExpenseFormModal meta={meta} tours={tours} expense={expenseForm.expense} defaultTour={expenseForm.defaultTour}
                    onClose={() => setExpenseForm(null)} onSaved={() => { setExpenseForm(null); refreshAll(); }} />
            )}
            {tourForm && (
                <TourFormModal meta={meta} tour={tourForm.tour} onClose={() => setTourForm(null)} onSaved={() => { setTourForm(null); refreshAll(); }} />
            )}
            {tourDetail && (
                <TourDetailModal meta={meta} tourId={tourDetail} onClose={() => setTourDetail(null)} onChanged={refreshAll}
                    onAddExpense={(t) => { setTourDetail(null); setExpenseForm({ defaultTour: t, expense: null }); }} />
            )}
            {expenseDetail && <ExpenseDetailModal expense={expenseDetail} onClose={() => setExpenseDetail(null)} />}
            {rejecting && (
                <RejectModal count={rejecting.length} onClose={() => setRejecting(null)}
                    onConfirm={(reason) => { const ids = rejecting; setRejecting(null); changeStatus(ids, "Rejected", reason); }} />
            )}
        </div>
    );
};

// Monthly spend — one series, vertical bars with value tooltip
const MonthChart = ({ data }) => (
    <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(v >= 1000 ? 0 : 1)}k`} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={48} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(13,148,136,0.08)" }} />
            <Bar dataKey="amount" fill={CHART_COLOR} barSize={28} radius={[4, 4, 0, 0]} />
        </BarChart>
    </ResponsiveContainer>
);

export default Expenses;
