import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    Wallet, CalendarDays, CalendarPlus, CalendarClock, Receipt, Plus, X, Search, Download, Edit2, Trash2, Eye, CheckCircle2, XCircle,
    IndianRupee, Clock, Paperclip, RefreshCw, MapPin, Calendar, User, BadgeCheck, Ban, ChevronLeft, ChevronRight,
    Save, Send, FileText
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
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
    Ongoing: { cls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800", icon: CalendarClock },
    Completed: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800", icon: CheckCircle2 },
    Cancelled: { cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800", icon: Ban },
    // Claim-level statuses
    "Pending Approval": { cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800", icon: Clock },
    "Partially Approved": { cls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800", icon: CheckCircle2 },
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

// text-base (16px) on phones stops iOS Safari from zooming the page when a field is focused
const inputCls = "w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-base sm:text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500";
const labelCls = "block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1";
const btnPrimary = "flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition cursor-pointer";
const btnGhost = "px-4 py-2.5 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition cursor-pointer";
const iconBtn = "p-2 rounded-xl transition hover:scale-110 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100";

// true below the Tailwind `sm` breakpoint (640px) — used where layout can't be done with CSS alone (charts)
const useIsMobile = () => {
    const query = "(max-width: 639px)";
    const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
    useEffect(() => {
        const mq = window.matchMedia(query);
        const onChange = () => setMobile(mq.matches);
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, []);
    return mobile;
};

// Pass onSubmit to make the panel itself the <form> (keeps native validation inside the portal).
// Phones: full-width bottom sheet sliding up · larger screens: centred dialog scaling in.
const Modal = ({ title, subtitle, icon: Icon, onClose, children, footer, wide, onSubmit }) => {
    const Panel = onSubmit ? motion.form : motion.div;
    const isMobile = useIsMobile();

    // Lock page scroll behind the dialog; Esc closes it
    const closeRef = React.useRef(onClose);
    useEffect(() => { closeRef.current = onClose; });
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e) => e.key === "Escape" && closeRef.current?.();
        window.addEventListener("keydown", onKey);
        return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
    }, []);

    return createPortal(
    <motion.div
        className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm"
        onMouseDown={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
    >
        <Panel
            onSubmit={onSubmit}
            className={`w-full ${wide ? "sm:max-w-4xl" : "sm:max-w-2xl"} max-h-[94dvh] sm:max-h-[92vh] flex flex-col bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden`}
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            transition={isMobile ? { type: "spring", damping: 30, stiffness: 320 } : { duration: 0.2, ease: "easeOut" }}
        >
            {/* drag handle hint on phones */}
            <div className="sm:hidden flex justify-center pt-2 bg-gradient-to-r from-teal-600 to-emerald-600"><span className="w-10 h-1 rounded-full bg-white/50" /></div>
            <div className="px-4 sm:px-6 py-3.5 sm:py-5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    {Icon && <Icon size={22} className="shrink-0" />}
                    <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-black uppercase tracking-wider truncate">{title}</h3>
                        {subtitle && <p className="text-[11px] sm:text-xs text-teal-50 font-medium line-clamp-2 sm:truncate">{subtitle}</p>}
                    </div>
                </div>
                <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 cursor-pointer shrink-0" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain custom-scrollbar">{children}</div>
            {footer && (
                // phones: buttons share the full width and wrap; a full-width info line (basis-full) sits on top
                <div className="px-4 sm:px-6 py-3 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex flex-wrap justify-end items-center gap-2 shrink-0 max-sm:*:flex-1 max-sm:*:justify-center">
                    {footer}
                </div>
            )}
        </Panel>
    </motion.div>,
    document.body
    );
};

// ---------- Stat tile ----------
const StatTile = ({ label, value, hint, icon: Icon, tone = "text-teal-600 dark:text-teal-400", index = 0 }) => (
    <motion.div
        className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.06 }}
        whileHover={{ y: -3 }}
    >
        <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-gray-400 leading-tight">{label}</p>
            <Icon size={18} className={`${tone} shrink-0`} />
        </div>
        <p className="mt-2 text-lg sm:text-2xl font-black text-gray-900 dark:text-white break-words">{value}</p>
        {hint && <p className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">{hint}</p>}
    </motion.div>
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
const HBarChart = ({ data, dataKey, nameKey }) => {
    const isMobile = useIsMobile();
    return (
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: isMobile ? 8 : 16, left: isMobile ? 0 : 8, bottom: 4 }}>
                <CartesianGrid horizontal={false} stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(v >= 1000 ? 0 : 1)}k`} tick={{ fontSize: isMobile ? 10 : 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey={nameKey} width={isMobile ? 86 : 120} tick={{ fontSize: isMobile ? 10 : 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(13,148,136,0.08)" }} />
                <Bar dataKey={dataKey} fill={CHART_COLOR} barSize={14} radius={[0, 4, 4, 0]} animationDuration={700} />
            </BarChart>
        </ResponsiveContainer>
    );
};

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
        () => tours.filter(t => !staffId || (t.members?.length ? t.members : [t.staff]).some(m => String(m) === String(staffId))),
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

// ================= Assign staff (multi-select) =================
const MemberPicker = ({ staffList, value, onChange }) => {
    const [q, setQ] = useState("");
    const selected = new Set(value.map(String));
    const shown = staffList.filter(s => !q.trim() || `${s.name} ${s.role}`.toLowerCase().includes(q.trim().toLowerCase()));
    const toggle = (id) => onChange(selected.has(String(id)) ? value.filter(v => String(v) !== String(id)) : [...value, id]);
    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            {value.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 border-b border-gray-200 dark:border-gray-700">
                    {value.map(id => {
                        const s = staffList.find(x => String(x._id) === String(id));
                        return (
                            <span key={id} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-teal-600 text-white text-[11px] font-bold">
                                {s?.name || "Unknown"}
                                <button type="button" onClick={() => toggle(id)} className="p-0.5 rounded-full hover:bg-white/20 cursor-pointer" aria-label={`Remove ${s?.name || "member"}`}><X size={11} /></button>
                            </span>
                        );
                    })}
                </div>
            )}
            <div className="p-2">
                <div className="relative mb-2">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className="w-full pl-8 pr-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                        value={q} onChange={e => setQ(e.target.value)} placeholder="Search staff..." />
                </div>
                <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-0.5">
                    {shown.map(s => (
                        <label key={s._id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 cursor-pointer text-sm">
                            <input type="checkbox" checked={selected.has(String(s._id))} onChange={() => toggle(s._id)} />
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{s.name}</span>
                            <span className="text-[11px] text-gray-400 capitalize">{s.role}</span>
                        </label>
                    ))}
                    {shown.length === 0 && <p className="px-2 py-3 text-xs text-gray-400">No staff found</p>}
                </div>
            </div>
        </div>
    );
};

// ================= Tour form =================
const TourFormModal = ({ meta, tour, onClose, onSaved }) => {
    const isEdit = !!tour;
    const [form, setForm] = useState(() => ({
        members: (tour?.members?.length ? tour.members : (tour?.staff ? [tour.staff] : [])).map(String),
        title: tour?.title || "",
        purpose: tour?.purpose || "",
        fromCity: tour?.fromCity || "",
        toCities: tour?.toCities || "",
        startDate: toInputDate(tour?.startDate) || todayStr(),
        endDate: toInputDate(tour?.endDate) || todayStr(),
        status: tour?.status || "Planned",
        approvedBudget: tour?.approvedBudget ? tour.approvedBudget : "",
        notes: tour?.notes || "",
    }));
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return toast.error("Tour title is required");
        if (form.endDate < form.startDate) return toast.error("End date cannot be before start date");
        if (meta.isAdmin && form.members.length === 0) return toast.error("Assign at least one staff member");
        if (form.approvedBudget !== "" && !(Number(form.approvedBudget) >= 0)) return toast.error("Enter a valid approved budget");
        setSaving(true);
        try {
            const payload = { ...form };
            if (!meta.isAdmin) delete payload.members;
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
                title={isEdit ? `Edit Event ${tour.tourNumber}` : "Create Event"}
                subtitle="Plan the trip; expenses and advance are tracked against it"
                icon={CalendarPlus}
                onClose={onClose}
                onSubmit={submit}
                footer={<>
                    <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
                    <button type="submit" className={btnPrimary} disabled={saving}>
                        {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Event"}
                    </button>
                </>}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <label className={labelCls}>Tour Title *</label>
                        <input className={inputCls} value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Hyderabad dealer visit" required />
                    </div>
                    {meta.isAdmin && (
                        <div className="sm:col-span-2">
                            <label className={labelCls}>Assign Staff * <span className="normal-case font-semibold text-gray-400">— {form.members.length} selected · only they can add expenses to this tour</span></label>
                            <MemberPicker staffList={meta.staff} value={form.members} onChange={v => set("members", v)} />
                        </div>
                    )}
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
                    <div>
                        <label className={labelCls}>Approved Budget (₹)</label>
                        <input type="number" min="0" step="0.01" className={inputCls + " font-bold"} value={form.approvedBudget}
                            onChange={e => set("approvedBudget", e.target.value)} placeholder="e.g. 25000" />
                        {Number(form.approvedBudget) > 0 && (
                            <p className="text-[11px] text-gray-500 mt-1">{inr(form.approvedBudget)} sanctioned — spend is tracked against it</p>
                        )}
                    </div>
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
                    ...(expense.claimNumber ? [["Claim", expense.claimNumber]] : []), ...(expense.place ? [["Place", expense.place]] : []),
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
        <Modal wide title={t ? `${t.tourNumber} · ${t.title}` : "Event"} subtitle={t ? `${(t.memberNames?.length ? t.memberNames : [t.staffName]).join(", ")} · ${fmtDate(t.startDate)} – ${fmtDate(t.endDate)}` : ""} icon={CalendarDays} onClose={onClose}
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

                    {/* Assigned staff & what each has spent on this tour */}
                    {meta.isAdmin && data.memberTotals?.length > 0 && (
                        <div>
                            <p className={labelCls}>Assigned staff ({data.memberTotals.length})</p>
                            <div className="flex flex-wrap gap-2">
                                {data.memberTotals.map(mt => (
                                    <div key={mt.staff} className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                                        <p className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-1"><User size={12} /> {mt.name}</p>
                                        <p className="text-[11px] text-gray-500">Spent {inr(mt.spent)}{mt.pending > 0 ? ` · ${inr(mt.pending)} pending` : ""}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Approved budget vs. spend */}
                    <BudgetBar budget={t.approvedBudget} spent={t.spent} pending={t.pending} />

                    {/* Settlement */}
                    <div className={`grid grid-cols-2 ${t.advanceAmount > 0 ? "md:grid-cols-4" : "md:grid-cols-3"} gap-3`}>
                        {[
                            // Advance is no longer entered on trips — shown only for older trips that have one
                            ...(t.advanceAmount > 0 ? [["Advance", inr(t.advanceAmount), t.advanceDate ? `${fmtDate(t.advanceDate)} · ${t.advanceMode || ""}` : ""]] : []),
                            ["Spent (approved)", inr(t.spent), `${t.count} entries`],
                            ["Pending approval", inr(t.pending), ""],
                            ...(t.advanceAmount > 0
                                ? [[t.balance >= 0 ? "Staff to return" : "Company to pay", inr(Math.abs(t.balance)), t.balance === 0 ? "Fully settled" : ""]]
                                : [["Total claimed", inr(t.spent + t.pending), "Approved + pending"]]),
                        ].map(([k, v, h]) => (
                            <div key={k} className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                                <p className={labelCls}>{k}</p>
                                <p className="text-base sm:text-lg font-black text-gray-900 dark:text-white break-words">{v}</p>
                                {h && <p className="text-[11px] text-gray-500">{h}</p>}
                            </div>
                        ))}
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
                        <table className="w-full min-w-[600px] text-left text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-900/60 text-[10px] font-black uppercase tracking-wider text-gray-500">
                                <tr><th className="px-3 py-2">Date</th>{meta.isAdmin && <th className="px-3 py-2">Staff</th>}<th className="px-3 py-2">Category</th><th className="px-3 py-2">Description</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Bills</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {data.expenses.length === 0 ? (
                                    <tr><td colSpan="7" className="px-3 py-8 text-center text-gray-400 font-bold uppercase tracking-widest">No expenses on this tour yet</td></tr>
                                ) : data.expenses.map(x => (
                                    <tr key={x._id}>
                                        <td className="px-3 py-2 whitespace-nowrap">{fmtExpenseDate(x)}</td>
                                        {meta.isAdmin && <td className="px-3 py-2 font-semibold whitespace-nowrap">{x.staffName}</td>}
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

// ================= Claim (many expense rows, saved as draft or submitted together) =================
const newRowKey = () => `r${Math.random().toString(36).slice(2, 10)}`;
const blankRow = (date) => ({
    key: newRowKey(), _id: null, status: null, date: date || todayStr(), endDate: "", isRange: false,
    category: "Travel", place: "", description: "", amount: "", paymentMode: "Cash", billNo: "",
    files: [], attachments: [], removeAttachments: []
});
const LOCKED = ["Submitted", "Approved", "Paid"];

// Textarea that starts at 2 lines and grows with its content (still user-resizable)
const AutoTextarea = ({ value, onChange, className, ...rest }) => {
    const ref = React.useRef(null);
    const fit = () => {
        const el = ref.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight + 2, 320)}px`;
    };
    useEffect(fit, [value]);
    return <textarea ref={ref} rows={2} value={value} onChange={onChange} className={className} style={{ minHeight: 64 }} {...rest} />;
};

// Approved budget vs. spend — progress bar used on event cards and in event detail
const BudgetBar = ({ budget, spent, pending = 0, compact }) => {
    if (!(budget > 0)) return null;
    const used = spent / budget;
    const withPending = (spent + pending) / budget;
    const over = spent > budget;
    const remaining = budget - spent;
    const barColor = over ? "bg-red-500" : used >= 0.9 ? "bg-amber-500" : "bg-teal-600";
    return (
        <div className={compact ? "" : "p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700"}>
            <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-gray-500 dark:text-gray-400">Budget {inr(budget)}</span>
                <span className={over ? "text-red-600" : "text-gray-700 dark:text-gray-200"}>{Math.round(used * 100)}% used</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden relative" role="progressbar" aria-valuenow={Math.round(used * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Budget used">
                {pending > 0 && <div className="absolute inset-y-0 left-0 bg-amber-300/60" style={{ width: `${Math.min(withPending, 1) * 100}%` }} />}
                <div className={`absolute inset-y-0 left-0 rounded-full ${barColor}`} style={{ width: `${Math.min(used, 1) * 100}%` }} />
            </div>
            <p className={`mt-1 text-[11px] font-semibold ${over ? "text-red-600" : "text-gray-500 dark:text-gray-400"}`}>
                {over ? `Over budget by ${inr(-remaining)}` : `${inr(remaining)} remaining`}
                {pending > 0 && <span className="text-amber-600"> · {inr(pending)} pending approval</span>}
            </p>
        </div>
    );
};

// Tours a staff member is assigned to (older tours: the single `staff`)
const tourHasMember = (t, userId) => (t.members?.length ? t.members : [t.staff]).some(m => String(m) === String(userId));

const ClaimFormModal = ({ meta, tours, claimNumber, defaultTour, onClose, onSaved }) => {
    const isEdit = !!claimNumber;
    const [loading, setLoading] = useState(isEdit);
    // Staff always enter their own claim. An admin starts with themselves (so Save as Draft is available)
    // or, when opened from a tour, with the tour's first member.
    const [staff, setStaff] = useState(meta.isAdmin ? String(defaultTour?.members?.[0] || defaultTour?.staff || MY_ID()) : MY_ID());
    const [tour, setTour] = useState(defaultTour?._id || "");
    const [rows, setRows] = useState(() => [blankRow()]);
    const [saving, setSaving] = useState(null);

    useEffect(() => {
        if (!isEdit) return;
        API.get(`/expenses/claims/${encodeURIComponent(claimNumber)}`)
            .then(res => {
                const items = res.data.items || [];
                setStaff(res.data.staff);
                setTour(items.find(i => i.tour)?.tour?._id || "");
                setRows(items.map(x => ({
                    key: newRowKey(), _id: x._id, status: x.status, rejectionReason: x.rejectionReason,
                    date: toInputDate(x.date), endDate: toInputDate(x.endDate), isRange: !!x.endDate,
                    category: x.category, place: x.place || "", description: x.description || "", amount: x.amount,
                    paymentMode: x.paymentMode, billNo: x.billNo || "", files: [], attachments: x.attachments || [], removeAttachments: []
                })));
            })
            .catch(err => { toast.error(err.response?.data?.message || "Failed to load claim"); onClose(); })
            .finally(() => setLoading(false));
    }, [isEdit, claimNumber]); // eslint-disable-line react-hooks/exhaustive-deps

    const ownClaim = String(staff) === String(MY_ID()) || !meta.isAdmin;
    // Admin creating a claim sees ALL tours (picking one sets a member as staff);
    // staff — or an admin editing an existing claim — only see tours the staff member is assigned to
    const showAllTours = meta.isAdmin && !isEdit;
    const staffTours = useMemo(
        () => tours.filter(t => t.status !== "Cancelled" && (showAllTours || (staff && tourHasMember(t, staff)))),
        [tours, staff, showAllTours]
    );
    const memberLabel = (t) => {
        const names = t.memberNames?.length ? t.memberNames : [t.staffName];
        return names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ");
    };

    const pickTour = (tourId) => {
        setTour(tourId);
        if (!tourId || !showAllTours) return;
        const t = tours.find(x => x._id === tourId);
        if (t && !tourHasMember(t, staff)) {
            const first = (t.members?.length ? t.members : [t.staff])[0];
            setStaff(String(first));
            const name = (t.memberNames?.length ? t.memberNames : [t.staffName])[0];
            toast(`Staff set to ${name} — assigned to ${t.tourNumber}`, { icon: "👤" });
        }
    };

    const pickStaff = (staffId) => {
        setStaff(staffId);
        const t = tours.find(x => x._id === tour);
        if (t && staffId && !tourHasMember(t, staffId)) {
            setTour("");
            toast("Tour cleared — this staff member is not assigned to it", { icon: "ℹ️" });
        }
    };
    const editableRows = rows.filter(r => !LOCKED.includes(r.status));
    const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const draftTotal = editableRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

    const update = (key, patch) => setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));
    const addRow = () => setRows(rs => [...rs, blankRow(rs[rs.length - 1]?.date)]);
    const removeRow = (key) => setRows(rs => rs.filter(r => r.key !== key));

    const save = async (e) => {
        e.preventDefault();
        const mode = e.nativeEvent?.submitter?.value === "draft" ? "draft" : "submit";
        if (!editableRows.length) return toast.error("Add at least one expense row");
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (LOCKED.includes(r.status)) continue;
            if (!(Number(r.amount) > 0)) return toast.error(`Row ${i + 1}: enter an amount`);
            if (r.isRange && r.endDate && r.endDate < r.date) return toast.error(`Row ${i + 1}: 'To' date is before 'From' date`);
            const billCount = r.attachments.filter(a => !r.removeAttachments.includes(a.url)).length + r.files.length;
            if (billCount > 5) return toast.error(`Row ${i + 1}: up to 5 bills per row`);
        }
        if (meta.isAdmin && !staff) return toast.error("Select the staff member");
        setSaving(mode);
        try {
            const fd = new FormData();
            fd.append("rows", JSON.stringify(rows.map(r => ({
                key: r.key, _id: r._id || undefined, date: r.date, endDate: r.isRange ? r.endDate : "",
                category: r.category, place: r.place, description: r.description, amount: r.amount,
                paymentMode: r.paymentMode, billNo: r.billNo, removeAttachments: r.removeAttachments
            }))));
            fd.append("tour", tour || "none");
            fd.append("saveAs", mode);
            if (meta.isAdmin && !isEdit) fd.append("staff", staff);
            rows.forEach(r => r.files.forEach(f => fd.append(`bills_${r.key}`, f)));
            const res = isEdit
                ? await API.put(`/expenses/claims/${encodeURIComponent(claimNumber)}`, fd)
                : await API.post("/expenses/claims", fd);
            toast.success(mode === "draft"
                ? `${res.data.claimNumber} saved as draft — add more rows anytime, then submit`
                : `${res.data.claimNumber} submitted for approval (${inr(draftTotal)})`);
            onSaved();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save claim");
        } finally {
            setSaving(null);
        }
    };

    const cell = "w-full px-2.5 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-base sm:text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60";

    return (
        <Modal
            wide
            title={isEdit ? `Claim ${claimNumber}` : "New Expense Claim"}
            subtitle="Add every spend as a row — save as draft while you go, submit the whole claim when ready"
            icon={Receipt}
            onClose={onClose}
            onSubmit={save}
            footer={<>
                <div className="basis-full sm:basis-auto sm:mr-auto text-xs font-bold text-gray-500 dark:text-gray-300 self-center max-sm:flex max-sm:justify-between">
                    <span>{rows.length} row(s)</span>
                    <span className="sm:ml-1">Total <span className="text-base font-black text-gray-900 dark:text-white">{inr(total)}</span></span>
                </div>
                <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
                {/* Drafts are private to their owner — available for your own claim only */}
                <button type="submit" value="draft" disabled={!!saving || loading || !ownClaim}
                    title={ownClaim ? "Save privately and continue later" : "Drafts are only for your own expenses — submit directly for another staff member"}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                    {saving === "draft" ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving === "draft" ? "Saving..." : "Save as Draft"}
                </button>
                <button type="submit" value="submit" className={btnPrimary} disabled={!!saving || loading}>
                    {saving === "submit" ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    {saving === "submit" ? "Submitting..." : "Submit Claim"}
                </button>
            </>}
        >
            {loading ? (
                <div className="py-12 flex justify-center"><RefreshCw className="animate-spin text-teal-600" /></div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {meta.isAdmin && (
                            <div>
                                <label className={labelCls}>Staff *</label>
                                <select className={inputCls} value={staff} disabled={isEdit} onChange={e => pickStaff(e.target.value)} required>
                                    <option value="">Select staff</option>
                                    {meta.staff.map(s => <option key={s._id} value={s._id}>{s.name} ({s.role})</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className={labelCls}>Tour / Trip (optional)</label>
                            <select className={inputCls} value={tour} onChange={e => pickTour(e.target.value)}>
                                <option value="">No tour (office / local expense)</option>
                                {staffTours.map(t => (
                                    <option key={t._id} value={t._id}>
                                        {t.tourNumber} · {t.title}{showAllTours ? ` — ${memberLabel(t)}` : ""}
                                    </option>
                                ))}
                            </select>
                            {!showAllTours && staffTours.length === 0 && (
                                <p className="text-[11px] text-gray-400 mt-1">No tour assigned{meta.isAdmin ? " to this staff member" : " to you"} yet</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <AnimatePresence initial={false}>
                        {rows.map((r, i) => {
                            const locked = LOCKED.includes(r.status);
                            const kept = r.attachments.filter(a => !r.removeAttachments.includes(a.url));
                            return (
                                <motion.div
                                    key={r.key}
                                    layout
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
                                    transition={{ duration: 0.22 }}
                                    className={`rounded-2xl border p-3 ${locked ? "border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30" : "border-gray-200 dark:border-gray-700"}`}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                                            <span className="w-6 h-6 shrink-0 rounded-full bg-teal-600 text-white text-[11px] font-black flex items-center justify-center">{i + 1}</span>
                                            {r.status && <StatusChip status={r.status} />}
                                            {r.status === "Rejected" && r.rejectionReason && <span className="text-[11px] font-semibold text-red-600">{r.rejectionReason}</span>}
                                            {locked && <span className="text-[11px] text-gray-400">Already submitted — read only</span>}
                                        </div>
                                        {!locked && (
                                            <button type="button" onClick={() => removeRow(r.key)} disabled={editableRows.length <= 1}
                                                className={`${iconBtn} text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`} title="Remove row" aria-label={`Remove row ${i + 1}`}>
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-12 gap-2">
                                        <div className="col-span-2 md:col-span-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-gray-400 uppercase">{r.isRange ? "From – To *" : "Date *"}</span>
                                                {!locked && (
                                                    <label className="flex items-center gap-1 text-[10px] font-bold text-teal-700 dark:text-teal-300 cursor-pointer">
                                                        <input type="checkbox" checked={r.isRange} onChange={e => update(r.key, { isRange: e.target.checked, endDate: e.target.checked ? (r.endDate || r.date) : "" })} /> Multi-day
                                                    </label>
                                                )}
                                            </div>
                                            <div className={r.isRange ? "grid grid-cols-2 gap-1" : ""}>
                                                <input type="date" className={cell} value={r.date} max={todayStr()} disabled={locked} required onChange={e => update(r.key, { date: e.target.value })} />
                                                {r.isRange && <input type="date" className={cell} value={r.endDate} min={r.date} max={todayStr()} disabled={locked} required onChange={e => update(r.key, { endDate: e.target.value })} />}
                                            </div>
                                        </div>
                                        <div className="md:col-span-3">
                                            <span className="text-[10px] font-black text-gray-400 uppercase">Category *</span>
                                            <select className={cell} value={r.category} disabled={locked} onChange={e => update(r.key, { category: e.target.value })}>
                                                {meta.categories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase">Place</span>
                                            <input className={cell} value={r.place} disabled={locked} placeholder="Where" onChange={e => update(r.key, { place: e.target.value })} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase">Amount ₹ *</span>
                                            <input type="number" min="0" step="0.01" className={cell + " font-bold"} value={r.amount} disabled={locked} required placeholder="0" onChange={e => update(r.key, { amount: e.target.value })} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase">Mode</span>
                                            <select className={cell} value={r.paymentMode} disabled={locked} onChange={e => update(r.key, { paymentMode: e.target.value })}>
                                                {meta.paymentModes.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                        {/* Description on its own full-width line — grows with the text */}
                                        <div className="col-span-2 md:col-span-12">
                                            <span className="text-[10px] font-black text-gray-400 uppercase">Description</span>
                                            <AutoTextarea
                                                className={cell + " leading-relaxed resize-y"}
                                                value={r.description}
                                                disabled={locked}
                                                placeholder="What was this expense for? e.g. Taxi from airport to client site, waiting charges included"
                                                onChange={e => update(r.key, { description: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-2 md:col-span-3">
                                            <span className="text-[10px] font-black text-gray-400 uppercase">Bill No.</span>
                                            <input className={cell} value={r.billNo} disabled={locked} placeholder="Optional" onChange={e => update(r.key, { billNo: e.target.value })} />
                                        </div>
                                        <div className="col-span-2 md:col-span-9">
                                            <span className="text-[10px] font-black text-gray-400 uppercase">Receipt / Bill (image or PDF)</span>
                                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                {!locked && (
                                                    <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs font-bold cursor-pointer hover:bg-teal-100">
                                                        <Paperclip size={13} /> Attach
                                                        <input type="file" multiple accept="image/*,application/pdf" className="hidden"
                                                            onChange={e => { update(r.key, { files: [...r.files, ...Array.from(e.target.files || [])].slice(0, 5) }); e.target.value = ""; }} />
                                                    </label>
                                                )}
                                                {kept.map(a => (
                                                    <span key={a.url} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-[11px] font-semibold text-gray-700 dark:text-gray-200">
                                                        <a href={`${FILE_BASE}${a.url}`} target="_blank" rel="noopener noreferrer" className="hover:underline max-w-[140px] truncate">{a.name}</a>
                                                        {!locked && <button type="button" onClick={() => update(r.key, { removeAttachments: [...r.removeAttachments, a.url] })} className="text-red-500 cursor-pointer" aria-label={`Remove ${a.name}`}><X size={11} /></button>}
                                                    </span>
                                                ))}
                                                {r.files.map((f, fi) => (
                                                    <span key={`${f.name}-${fi}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                                                        <span className="max-w-[140px] truncate">{f.name}</span>
                                                        <button type="button" onClick={() => update(r.key, { files: r.files.filter((_, j) => j !== fi) })} className="text-red-500 cursor-pointer" aria-label={`Remove ${f.name}`}><X size={11} /></button>
                                                    </span>
                                                ))}
                                                {!locked && kept.length + r.files.length === 0 && <span className="text-[11px] text-gray-400">No bill yet</span>}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                        </AnimatePresence>
                    </div>

                    <button type="button" onClick={addRow} disabled={rows.length >= 50}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 text-xs font-black uppercase tracking-wider hover:bg-teal-50 dark:hover:bg-teal-900/20 cursor-pointer">
                        <Plus size={15} /> Add another expense row
                    </button>
                </div>
            )}
        </Modal>
    );
};

// ================= Claim PDF download =================
const downloadClaimPdf = async (claimNumber) => {
    const tId = toast.loading("Preparing PDF...");
    try {
        const res = await API.get(`/expenses/claims/${encodeURIComponent(claimNumber)}/pdf`, { responseType: "blob" });
        const name = /filename="([^"]+)"/.exec(res.headers["content-disposition"] || "")?.[1] || `Expense_Claim_${claimNumber}.pdf`;
        const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        toast.success("PDF downloaded", { id: tId });
    } catch (err) {
        // Error body arrives as a Blob because of responseType
        let message = "Failed to download PDF";
        try { message = JSON.parse(await err.response.data.text()).message || message; } catch { /* keep default */ }
        toast.error(message, { id: tId });
    }
};

// ================= Claim view (status of every row + PDF) =================
const ClaimViewModal = ({ meta, claim, onClose, onEdit, onSubmit }) => {
    const [data, setData] = useState(null);
    useEffect(() => {
        API.get(`/expenses/claims/${encodeURIComponent(claim.claimNumber)}`)
            .then(res => setData(res.data))
            .catch(err => { toast.error(err.response?.data?.message || "Failed to load claim"); onClose(); });
    }, [claim.claimNumber]); // eslint-disable-line react-hooks/exhaustive-deps

    const mine = String(claim.staff) === String(MY_ID());
    const canEditClaim = mine && (claim.counts.draft > 0 || claim.counts.rejected > 0);
    const a = claim.amounts;

    return (
        <Modal wide title={`Claim ${claim.claimNumber}`} subtitle={`${claim.staffName}${claim.tour ? ` · ${claim.tour.tourNumber} ${claim.tour.title}` : ""}`} icon={FileText} onClose={onClose}
            footer={<>
                <div className="basis-full sm:basis-auto sm:mr-auto self-center"><StatusChip status={claim.status} /></div>
                {canEditClaim && <button type="button" className={btnGhost + " border border-gray-200 dark:border-gray-700 flex items-center gap-2"} onClick={onEdit}><Edit2 size={14} /> {claim.counts.draft > 0 ? "Continue" : "Fix & Re-submit"}</button>}
                {mine && claim.counts.draft > 0 && <button type="button" className={btnPrimary} onClick={onSubmit}><Send size={14} /> Submit Claim</button>}
                {claim.pdfReady && <button type="button" className={btnPrimary} onClick={() => downloadClaimPdf(claim.claimNumber)}><Download size={14} /> Download PDF</button>}
            </>}
        >
            {/* Amount summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                    ["Claimed", a.claimed + a.draft],
                    ["Pending approval", a.pending],
                    ["Approved", a.approved],
                    [a.paid > 0 ? "Paid" : "Rejected", a.paid > 0 ? a.paid : a.rejected],
                ].map(([k, v]) => (
                    <div key={k} className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                        <p className={labelCls}>{k}</p>
                        <p className="text-base sm:text-lg font-black text-gray-900 dark:text-white break-words">{inr(v)}</p>
                    </div>
                ))}
            </div>
            {["Pending Approval", "Draft"].includes(claim.status) && (
                <p className="mb-4 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
                    The PDF can be downloaded now, but it is marked "{claim.status.toUpperCase()}" — it is not a final approved document yet.
                </p>
            )}
            {!data ? (
                <div className="py-10 flex justify-center"><RefreshCw className="animate-spin text-teal-600" /></div>
            ) : (
                <>
                {/* phones: one card per row */}
                <div className="md:hidden space-y-2.5">
                    {data.items.map((x, i) => (
                        <motion.div key={x._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}
                            className="rounded-2xl border border-gray-100 dark:border-gray-700 p-3 bg-gray-50/60 dark:bg-gray-900/40">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-black text-gray-900 dark:text-white">{i + 1}. {x.category}</p>
                                    <p className="text-[11px] text-gray-500">{fmtExpenseDate(x)}{x.place ? ` · ${x.place}` : ""}</p>
                                </div>
                                <p className={`text-sm font-black whitespace-nowrap ${x.status === "Rejected" ? "line-through text-gray-400" : "text-gray-900 dark:text-white"}`}>{inr(x.amount)}</p>
                            </div>
                            {x.description && <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-300">{x.description}</p>}
                            {x.status === "Rejected" && x.rejectionReason && <p className="mt-1 text-[11px] font-semibold text-red-600">Rejected: {x.rejectionReason}</p>}
                            <div className="mt-2 flex items-center justify-between gap-2">
                                <StatusChip status={x.status} />
                                <div className="flex flex-wrap gap-1.5 justify-end">
                                    {(x.attachments || []).map(f => (
                                        <a key={f.url} href={`${FILE_BASE}${f.url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-[11px] font-bold text-teal-700 dark:text-teal-300" title={f.name}>
                                            <Paperclip size={11} /> Bill
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
                <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
                    <table className="w-full min-w-[720px] text-left text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-900/60 text-[10px] font-black uppercase tracking-wider text-gray-500">
                            <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Place</th><th className="px-3 py-2">Description</th><th className="px-3 py-2">Bills</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {data.items.map((x, i) => (
                                <tr key={x._id}>
                                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">{fmtExpenseDate(x)}</td>
                                    <td className="px-3 py-2">{x.category}</td>
                                    <td className="px-3 py-2">{x.place || "-"}</td>
                                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                                        {x.description || "-"}
                                        {x.status === "Rejected" && x.rejectionReason && <p className="text-[11px] font-semibold text-red-600 mt-0.5">Rejected: {x.rejectionReason}</p>}
                                    </td>
                                    <td className="px-3 py-2">{x.attachments?.length ? x.attachments.map(f => (
                                        <a key={f.url} href={`${FILE_BASE}${f.url}`} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline mr-2" title={f.name}><Paperclip size={13} className="inline" /></a>
                                    )) : "-"}</td>
                                    <td className={`px-3 py-2 text-right font-bold whitespace-nowrap ${x.status === "Rejected" ? "line-through text-gray-400" : ""}`}>{inr(x.amount)}</td>
                                    <td className="px-3 py-2"><StatusChip status={x.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                </>
            )}
        </Modal>
    );
};

// ================= Page =================
const TABS = [
    { key: "overview", label: "Overview", icon: Wallet },
    { key: "claims", label: "Claims", icon: FileText },
    { key: "expenses", label: "Expenses", icon: Receipt },
    { key: "tours", label: "Events", icon: CalendarDays },
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

    const [expenseForm, setExpenseForm] = useState(null); // { expense } — single-row edit (old / non-claim rows)
    const [claimForm, setClaimForm] = useState(null);     // { claimNumber?, defaultTour? }
    const [draftClaims, setDraftClaims] = useState([]);
    const [claims, setClaims] = useState([]);
    const [claimsLoading, setClaimsLoading] = useState(false);
    const [claimStatus, setClaimStatus] = useState("All");
    const [claimView, setClaimView] = useState(null); // claim row object
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

    const { from: fFrom, to: fTo, staff: fStaff } = filters;
    const loadSummary = useCallback(() => {
        const p = new URLSearchParams();
        Object.entries({ from: fFrom, to: fTo, staff: fStaff }).forEach(([k, v]) => v && p.append(k, v));
        API.get(`/expenses/summary?${p}`).then(res => setSummary(res.data)).catch(() => {});
    }, [fFrom, fTo, fStaff]);

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

    const loadClaims = useCallback(() => {
        const p = new URLSearchParams();
        if (filters.staff) p.append("staff", filters.staff);
        if (claimStatus !== "All") p.append("status", claimStatus);
        if (filters.search && tab === "claims") p.append("search", filters.search);
        setClaimsLoading(true);
        API.get(`/expenses/claim-list?${p}`)
            .then(res => setClaims(res.data || []))
            .catch(() => toast.error("Failed to load claims"))
            .finally(() => setClaimsLoading(false));
    }, [filters.staff, filters.search, claimStatus, tab]);
    useEffect(() => { if (meta && tab === "claims") loadClaims(); }, [meta, tab, loadClaims]);

    const loadDraftClaims = useCallback(() => {
        API.get("/expenses/claims?status=Draft").then(res => setDraftClaims(res.data || [])).catch(() => {});
    }, []);

    const refreshAll = useCallback(() => {
        loadSummary(); loadExpenses(); loadTours(); loadDraftClaims();
        if (tab === "claims") loadClaims();
    }, [loadSummary, loadExpenses, loadTours, loadDraftClaims, loadClaims, tab]);
    useEffect(() => { if (meta) loadDraftClaims(); }, [meta, loadDraftClaims]);

    const submitClaim = async (c) => {
        if (!window.confirm(`Submit claim ${c.claimNumber} (${c.count} row(s), ${inr(c.amount)}) for approval?`)) return;
        try {
            const res = await API.post(`/expenses/claims/${encodeURIComponent(c.claimNumber)}/submit`);
            toast.success(`${c.claimNumber} submitted — ${res.data.submitted} row(s), ${inr(res.data.amount)}`);
            refreshAll();
            setTab("claims");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to submit claim");
        }
    };

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
            const head = ["Expense No", "Claim No", "From Date", "To Date", "Place", "Staff", "Tour No", "Tour", "Category", "Description", "Amount (INR)", "Payment Mode", "Bill No", "Status", "Approved By", "Paid On", "Rejection Reason", "Bills"];
            const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
            const lines = rows.map(x => [
                x.expenseNumber, x.claimNumber || "", fmtDate(x.date), x.endDate ? fmtDate(x.endDate) : "", x.place || "", x.staffName, x.tour?.tourNumber || "", x.tour?.title || "", x.category, x.description,
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

    // Action buttons — shared by the desktop tables and the phone cards
    const claimActions = (c) => {
        const mine = String(c.staff) === String(myId);
        return (
            <>
                <button className={`${iconBtn} text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20`} title="View claim" aria-label="View claim" onClick={() => setClaimView(c)}><Eye size={16} /></button>
                {mine && (c.counts.draft > 0 || c.counts.rejected > 0) && (
                    <button className={`${iconBtn} text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20`} title={c.counts.draft > 0 ? "Continue claim" : "Fix rejected rows & re-submit"} aria-label="Edit claim" onClick={() => setClaimForm({ claimNumber: c.claimNumber })}><Edit2 size={16} /></button>
                )}
                {mine && c.counts.draft > 0 && (
                    <button className={`${iconBtn} text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20`} title="Submit claim" aria-label="Submit claim" onClick={() => submitClaim({ claimNumber: c.claimNumber, count: c.counts.draft, amount: c.amounts.draft })}><Send size={16} /></button>
                )}
                {c.pdfReady && (
                    <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black text-white bg-teal-600 hover:bg-teal-700 cursor-pointer" title={`Download claim PDF (marked ${c.status.toUpperCase()})`} onClick={() => downloadClaimPdf(c.claimNumber)}>
                        <Download size={13} /> PDF
                    </button>
                )}
            </>
        );
    };

    const expenseActions = (x) => (
        <>
            <button className={`${iconBtn} text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20`} title="View" aria-label="View" onClick={() => setExpenseDetail(x)}><Eye size={16} /></button>
            {isAdmin && x.status === "Submitted" && <>
                <button className={`${iconBtn} text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20`} title="Approve" aria-label="Approve" onClick={() => changeStatus([x._id], "Approved")}><CheckCircle2 size={16} /></button>
                <button className={`${iconBtn} text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`} title="Reject" aria-label="Reject" onClick={() => setRejecting([x._id])}><XCircle size={16} /></button>
            </>}
            {isAdmin && x.status === "Approved" && (
                <button className={`${iconBtn} text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20`} title="Mark Paid" aria-label="Mark paid" onClick={() => changeStatus([x._id], "Paid")}><BadgeCheck size={16} /></button>
            )}
            {x.status === "Draft" && isMine(x) && (
                <button className={`${iconBtn} text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20`} title="Submit for approval" aria-label="Submit for approval" onClick={() => submitDraft(x)}><Send size={16} /></button>
            )}
            <button className={`${iconBtn} text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20`} title={x.claimNumber && isMine(x) && ["Draft", "Rejected"].includes(x.status) ? "Open claim to edit" : "Edit"} aria-label="Edit" disabled={!canEdit(x)}
                onClick={() => (x.claimNumber && isMine(x) && ["Draft", "Rejected"].includes(x.status)
                    ? setClaimForm({ claimNumber: x.claimNumber })
                    : setExpenseForm({ expense: x }))}><Edit2 size={16} /></button>
            <button className={`${iconBtn} text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`} title="Delete" aria-label="Delete" disabled={!canEdit(x)} onClick={() => deleteExpense(x)}><Trash2 size={16} /></button>
        </>
    );

    // staggered entrance for list cards / rows
    const enter = (i) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25, delay: Math.min(i * 0.035, 0.35) } });

    return (
        <MotionConfig reducedMotion="user">
        <div className="p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700"
            >
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-white flex items-center gap-2 sm:gap-3">
                        <Wallet className="text-teal-600 shrink-0" size={26} /> Travel & Expenses
                    </h1>
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                        {isAdmin ? "Track every event and spend across staff — approve claims, watch budgets, export." : "Record your own expenses with bills — save as draft or submit for approval, and track their status."}
                    </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto max-md:*:flex-1 max-md:*:justify-center">
                    {isAdmin && (
                        <motion.button whileTap={{ scale: 0.96 }} className={btnGhost + " border border-gray-200 dark:border-gray-700 flex items-center gap-2"} onClick={() => setTourForm({})}>
                            <CalendarPlus size={14} /> Create Event
                        </motion.button>
                    )}
                    <motion.button whileTap={{ scale: 0.96 }} className={btnPrimary} onClick={() => setClaimForm({})}><Plus size={14} /> Add Expenses</motion.button>
                </div>
            </motion.div>

            {/* Tabs + filters */}
            <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                {/* tabs scroll sideways on phones; the active pill slides between tabs */}
                <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl w-max gap-1">
                        {visibleTabs.map(({ key, label, icon: Icon }) => (
                            <button key={key} onClick={() => setTab(key)}
                                className={`relative flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer ${tab === key ? "text-teal-600 dark:text-teal-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"}`}>
                                {tab === key && (
                                    <motion.span layoutId="expenses-tab-pill" className="absolute inset-0 rounded-xl bg-white dark:bg-gray-800 shadow-sm"
                                        transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                                )}
                                <span className="relative flex items-center gap-2">
                                    <Icon size={15} /> {label}
                                    {key === "expenses" && isAdmin && summary?.pendingApproval?.count > 0 && (
                                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px]">{summary.pendingApproval.count}</span>
                                    )}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
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
                    {tab === "claims" && (
                        <div>
                            <label className={labelCls}>Claim Status</label>
                            <select className={inputCls} value={claimStatus} onChange={e => setClaimStatus(e.target.value)}>
                                {["All", "Draft", "Pending Approval", "Partially Approved", "Approved", "Paid", "Rejected"].map(s => (
                                    <option key={s} value={s}>{s === "All" ? "All statuses" : s}</option>
                                ))}
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
                        <div className="col-span-2 sm:flex-1 sm:min-w-[180px]">
                            <label className={labelCls}>Search</label>
                            <div className="relative">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input className={inputCls + " pl-9"} value={filters.search} onChange={e => setFilter("search", e.target.value)} placeholder={tab === "tours" ? "Event, city, staff..." : "Description, bill no, staff..."} />
                            </div>
                        </div>
                    )}
                    {tab === "expenses" && (
                        <button className={btnGhost + " col-span-2 justify-center border border-gray-200 dark:border-gray-700 flex items-center gap-2"} onClick={exportCSV}><Download size={14} /> Export CSV</button>
                    )}
                </div>
            </div>

            {/* Tab content fades / slides in when the tab changes */}
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="space-y-4 sm:space-y-6">

            {/* ===== My draft claims (private until submitted) ===== */}
            {tab !== "tours" && draftClaims.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-dashed border-teal-300 dark:border-teal-700 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-300">
                        <FileText size={15} /> My draft claims ({draftClaims.length}) — not sent yet
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {draftClaims.map(c => (
                            <div key={c.claimNumber} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="font-mono text-xs font-black text-gray-900 dark:text-white">{c.claimNumber}</p>
                                    <p className="text-[11px] text-gray-500">
                                        {c.count} row(s) · {fmtDate(c.from)}{c.to && toInputDate(c.to) !== toInputDate(c.from) ? ` – ${fmtDate(c.to)}` : ""}
                                    </p>
                                    <p className="text-sm font-black text-gray-900 dark:text-white">{inr(c.amount)}</p>
                                </div>
                                <div className="flex flex-col gap-1.5 shrink-0">
                                    <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-black text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/20 cursor-pointer" onClick={() => setClaimForm({ claimNumber: c.claimNumber })}>
                                        <Edit2 size={12} /> Continue
                                    </button>
                                    <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-black text-white bg-teal-600 hover:bg-teal-700 cursor-pointer" onClick={() => submitClaim(c)}>
                                        <Send size={12} /> Submit
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== Overview ===== */}
            {tab === "overview" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <StatTile index={0} label="Total spent" value={inr(summary?.spent)} hint="Approved + paid in this period" icon={IndianRupee} />
                        <StatTile index={1} label="Pending approval" value={inr(summary?.pendingApproval?.amount)} hint={`${summary?.pendingApproval?.count || 0} claim(s) waiting`} icon={Clock} tone="text-amber-500" />
                        <StatTile index={2} label="Approved, to pay" value={inr(summary?.approvedUnpaid?.amount)} hint={`${summary?.approvedUnpaid?.count || 0} claim(s) not yet paid`} icon={CheckCircle2} tone="text-blue-500" />
                        {isAdmin
                            ? <StatTile index={3} label="Active events" value={summary?.activeTours ?? 0} hint={summary?.openAdvances > 0 ? `Open advances ${inr(summary.openAdvances)}` : "Planned + ongoing events"} icon={CalendarDays} />
                            : <StatTile index={3} label="My drafts" value={summary?.drafts?.count ?? 0} hint={`${inr(summary?.drafts?.amount)} not yet submitted`} icon={FileText} tone="text-gray-500" />}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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

            {/* ===== Claims ===== */}
            {tab === "claims" && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 sm:px-5 py-3 border-b border-gray-100 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400">
                        {claims.length} claim(s){isAdmin ? "" : " · your claims"}<span className="hidden sm:inline"> — download the PDF any time; its watermark shows the claim's current status</span>
                    </div>

                    {/* phones: one card per claim */}
                    <div className="md:hidden p-3 space-y-3">
                        {claimsLoading ? (
                            <div className="py-12 text-center"><RefreshCw className="animate-spin inline text-teal-600" /></div>
                        ) : claims.length === 0 ? (
                            <p className="py-12 text-center text-xs font-bold uppercase tracking-widest text-gray-400">No claims yet — tap "Add Expenses"</p>
                        ) : claims.map((c, i) => (
                            <motion.div key={c.claimNumber} {...enter(i)} className="rounded-2xl border border-gray-100 dark:border-gray-700 p-3.5 bg-gray-50/50 dark:bg-gray-900/40">
                                <div className="flex items-start justify-between gap-2">
                                    <button className="text-left min-w-0" onClick={() => setClaimView(c)}>
                                        <p className="font-mono text-sm font-black text-teal-700 dark:text-teal-400">{c.claimNumber}</p>
                                        <p className="text-[11px] text-gray-500">
                                            {isAdmin ? `${c.staffName} · ` : ""}{c.count} row(s){c.counts.rejected ? ` · ${c.counts.rejected} rejected` : ""}
                                        </p>
                                    </button>
                                    <StatusChip status={c.status} />
                                </div>
                                <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <p className={labelCls + " mb-0"}>Claimed</p>
                                        <p className="font-black text-gray-900 dark:text-white">{inr(c.amounts.claimed + c.amounts.draft)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={labelCls + " mb-0"}>Approved</p>
                                        <p className="font-black text-gray-900 dark:text-white">{c.amounts.approved > 0 ? inr(c.amounts.approved) : "—"}</p>
                                    </div>
                                </div>
                                <p className="mt-2 text-[11px] text-gray-500 flex items-center gap-1">
                                    <Calendar size={11} /> {fmtDate(c.from)}{toInputDate(c.to) !== toInputDate(c.from) ? ` – ${fmtDate(c.to)}` : ""}
                                    {c.tour && <span className="truncate"> · {c.tour.tourNumber} {c.tour.title}</span>}
                                </p>
                                <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-1">
                                    {claimActions(c)}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900/60 text-[10px] font-black uppercase tracking-wider text-gray-500">
                                <tr>
                                    <th className="px-4 py-3">Claim</th>
                                    {isAdmin && <th className="px-4 py-3">Staff</th>}
                                    <th className="px-4 py-3">Event</th>
                                    <th className="px-4 py-3">Period</th>
                                    <th className="px-4 py-3 text-right">Claimed</th>
                                    <th className="px-4 py-3 text-right">Approved</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {claimsLoading ? (
                                    <tr><td colSpan="8" className="px-4 py-14 text-center"><RefreshCw className="animate-spin inline text-teal-600" /></td></tr>
                                ) : claims.length === 0 ? (
                                    <tr><td colSpan="8" className="px-4 py-14 text-center text-xs font-bold uppercase tracking-widest text-gray-400">No claims yet — use "Add Expenses" to create one</td></tr>
                                ) : claims.map((c, i) => {
                                    const claimed = c.amounts.claimed + c.amounts.draft;
                                    return (
                                        <motion.tr key={c.claimNumber} {...enter(i)} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                                            <td className="px-4 py-3">
                                                <button className="font-mono text-xs font-black text-teal-700 dark:text-teal-400 hover:underline cursor-pointer" onClick={() => setClaimView(c)}>{c.claimNumber}</button>
                                                <p className="text-[11px] text-gray-500">{c.count} row(s){c.counts.rejected ? ` · ${c.counts.rejected} rejected` : ""}</p>
                                            </td>
                                            {isAdmin && <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">{c.staffName}</td>}
                                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{c.tour ? `${c.tour.tourNumber} · ${c.tour.title}` : "—"}</td>
                                            <td className="px-4 py-3 text-xs whitespace-nowrap">{fmtDate(c.from)}{toInputDate(c.to) !== toInputDate(c.from) ? ` – ${fmtDate(c.to)}` : ""}</td>
                                            <td className="px-4 py-3 text-right font-bold whitespace-nowrap">{inr(claimed)}</td>
                                            <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white whitespace-nowrap">{c.amounts.approved > 0 ? inr(c.amounts.approved) : "—"}</td>
                                            <td className="px-4 py-3"><StatusChip status={c.status} /></td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">{claimActions(c)}</div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ===== Expenses ===== */}
            {tab === "expenses" && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            {isAdmin && selectable.length > 0 && (
                                <input type="checkbox" className="md:hidden" aria-label="Select all"
                                    checked={selectable.every(x => selected.includes(x._id))}
                                    onChange={e => setSelected(e.target.checked ? selectable.map(x => x._id) : [])} />
                            )}
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                {expenses.total} expense(s) · <span className="text-gray-900 dark:text-white font-black">{inr(expenses.totalAmount)}</span>
                            </p>
                        </div>
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
                    {/* phones: one card per expense */}
                    <div className="md:hidden p-3 space-y-3">
                        {loading ? (
                            <div className="py-12 text-center"><RefreshCw className="animate-spin inline text-teal-600" /></div>
                        ) : expenses.items.length === 0 ? (
                            <p className="py-12 text-center text-xs font-bold uppercase tracking-widest text-gray-400">No expenses for these filters</p>
                        ) : expenses.items.map((x, i) => (
                            <motion.div key={x._id} {...enter(i)}
                                className={`rounded-2xl border p-3.5 ${selected.includes(x._id) ? "border-teal-400 bg-teal-50/50 dark:bg-teal-900/20" : "border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40"}`}>
                                <div className="flex items-start gap-2.5">
                                    {isAdmin && ["Submitted", "Approved"].includes(x.status) && (
                                        <input type="checkbox" className="mt-1" aria-label={`Select ${x.expenseNumber}`}
                                            checked={selected.includes(x._id)}
                                            onChange={e => setSelected(s => e.target.checked ? [...s, x._id] : s.filter(id => id !== x._id))} />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-gray-900 dark:text-white">{x.category}</p>
                                                <p className="text-[11px] text-gray-500">
                                                    {fmtExpenseDate(x)}{x.place ? ` · ${x.place}` : ""}{isAdmin ? ` · ${x.staffName}` : ""}
                                                </p>
                                            </div>
                                            <p className="text-sm font-black text-gray-900 dark:text-white whitespace-nowrap">{inr(x.amount)}</p>
                                        </div>
                                        {x.description && <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{x.description}</p>}
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-mono font-bold text-gray-500">
                                            <StatusChip status={x.status} />
                                            <span>{x.expenseNumber}</span>
                                            {x.claimNumber && <span className="text-teal-600 dark:text-teal-400">{x.claimNumber}</span>}
                                            {x.tour && <button className="text-teal-600 dark:text-teal-400 underline" onClick={() => setTourDetail(x.tour._id)}>{x.tour.tourNumber}</button>}
                                            {x.attachments?.length > 0 && <span className="text-teal-600 flex items-center gap-0.5"><Paperclip size={10} />{x.attachments.length}</span>}
                                        </div>
                                        {x.status === "Rejected" && x.rejectionReason && <p className="mt-1 text-[11px] font-semibold text-red-600">Rejected: {x.rejectionReason}</p>}
                                    </div>
                                </div>
                                <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-1">
                                    {expenseActions(x)}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="hidden md:block overflow-x-auto">
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
                                    <th className="px-4 py-3">Event</th>
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
                                ) : expenses.items.map((x, i) => (
                                    <motion.tr key={x._id} {...enter(i)} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
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
                                            {x.claimNumber && <p className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400">{x.claimNumber}</p>}
                                            {x.place && <p className="text-[10px] text-gray-500 flex items-center gap-0.5"><MapPin size={10} />{x.place}</p>}
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
                                            <div className="flex items-center justify-center gap-1">{expenseActions(x)}</div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {expenses.pages > 1 && (
                        <div className="flex items-center justify-center sm:justify-end gap-2 px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-xs font-bold text-gray-500">
                            <button className={`${iconBtn} border border-gray-200 dark:border-gray-700`} disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
                            Page {page} of {expenses.pages}
                            <button className={`${iconBtn} border border-gray-200 dark:border-gray-700`} disabled={page >= expenses.pages} onClick={() => setPage(p => p + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
                        </div>
                    )}
                </div>
            )}

            {/* ===== Tours ===== */}
            {tab === "tours" && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                    {tours.length === 0 ? (
                        <div className="md:col-span-2 xl:col-span-3 bg-white dark:bg-gray-800 rounded-3xl p-12 text-center border border-dashed border-gray-200 dark:border-gray-700">
                            <CalendarDays className="mx-auto text-gray-300" size={36} />
                            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-gray-400">No events yet</p>
                            <button className={btnPrimary + " mx-auto mt-4"} onClick={() => setTourForm({})}><Plus size={14} /> Create Event</button>
                        </div>
                    ) : tours.map((t, i) => (
                        <motion.div key={t._id} {...enter(i)} whileHover={{ y: -3 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl p-4 sm:p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-mono font-bold text-teal-600 dark:text-teal-400">{t.tourNumber}</p>
                                    <h3 className="font-black text-gray-900 dark:text-white truncate">{t.title}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1 mt-0.5" title={(t.memberNames || [t.staffName]).join(", ")}>
                                        <User size={12} className="mt-0.5 shrink-0" />
                                        <span className="line-clamp-2">
                                            {(t.memberNames?.length ? t.memberNames : [t.staffName]).slice(0, 3).join(", ")}
                                            {(t.memberNames?.length || 1) > 3 && ` +${t.memberNames.length - 3} more`}
                                        </span>
                                    </p>
                                </div>
                                <StatusChip status={t.status} />
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                                <p className="flex items-center gap-1"><Calendar size={12} /> {fmtDate(t.startDate)} – {fmtDate(t.endDate)}</p>
                                {(t.fromCity || t.toCities) && <p className="flex items-center gap-1"><MapPin size={12} /> {[t.fromCity, t.toCities].filter(Boolean).join(" → ")}</p>}
                            </div>
                            {t.advanceAmount > 0 ? (
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 py-2"><p className="text-[10px] font-black uppercase text-gray-400">Advance</p><p className="text-sm font-black text-gray-900 dark:text-white">{inr(t.advanceAmount)}</p></div>
                                    <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 py-2"><p className="text-[10px] font-black uppercase text-gray-400">Spent</p><p className="text-sm font-black text-gray-900 dark:text-white">{inr(t.spent)}</p></div>
                                    <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 py-2">
                                        <p className="text-[10px] font-black uppercase text-gray-400">{t.balance >= 0 ? "To return" : "To pay"}</p>
                                        <p className="text-sm font-black text-gray-900 dark:text-white">{inr(Math.abs(t.balance))}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 text-center">
                                    <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 py-2"><p className="text-[10px] font-black uppercase text-gray-400">Spent (approved)</p><p className="text-sm font-black text-gray-900 dark:text-white">{inr(t.spent)}</p></div>
                                    <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 py-2"><p className="text-[10px] font-black uppercase text-gray-400">Pending</p><p className="text-sm font-black text-gray-900 dark:text-white">{inr(t.pending)}</p></div>
                                </div>
                            )}
                            {t.advanceAmount > 0 && t.pending > 0 && !(t.approvedBudget > 0) && <p className="text-[11px] font-semibold text-amber-600">{inr(t.pending)} pending approval</p>}
                            <BudgetBar budget={t.approvedBudget} spent={t.spent} pending={t.pending} compact />
                            <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-700">
                                <button className="text-xs font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 hover:underline cursor-pointer" onClick={() => setTourDetail(t._id)}>Open · {t.count} expense(s)</button>
                                <div className="flex gap-1">
                                    <button className={`${iconBtn} text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20`} title="Edit tour" disabled={!isAdmin && t.settled} onClick={() => setTourForm({ tour: t })}><Edit2 size={15} /></button>
                                    <button className={`${iconBtn} text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`} title="Delete event" aria-label="Delete event" disabled={t.count > 0} onClick={() => deleteTour(t)}><Trash2 size={15} /></button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
            </motion.div>

            {/* ===== Modals ===== */}
            {claimView && (
                <ClaimViewModal meta={meta} claim={claimView} onClose={() => setClaimView(null)}
                    onEdit={() => { const n = claimView.claimNumber; setClaimView(null); setClaimForm({ claimNumber: n }); }}
                    onSubmit={() => { const c = claimView; setClaimView(null); submitClaim({ claimNumber: c.claimNumber, count: c.counts.draft, amount: c.amounts.draft }); }} />
            )}
            {claimForm && (
                <ClaimFormModal meta={meta} tours={tours} claimNumber={claimForm.claimNumber} defaultTour={claimForm.defaultTour}
                    onClose={() => setClaimForm(null)} onSaved={() => { setClaimForm(null); refreshAll(); setTab("claims"); }} />
            )}
            {expenseForm && (
                <ExpenseFormModal meta={meta} tours={tours} expense={expenseForm.expense} defaultTour={expenseForm.defaultTour}
                    onClose={() => setExpenseForm(null)} onSaved={() => { setExpenseForm(null); refreshAll(); }} />
            )}
            {tourForm && (
                <TourFormModal meta={meta} tour={tourForm.tour} onClose={() => setTourForm(null)} onSaved={() => { setTourForm(null); refreshAll(); }} />
            )}
            {tourDetail && (
                <TourDetailModal meta={meta} tourId={tourDetail} onClose={() => setTourDetail(null)} onChanged={refreshAll}
                    onAddExpense={(t) => { setTourDetail(null); setClaimForm({ defaultTour: t }); }} />
            )}
            {expenseDetail && <ExpenseDetailModal expense={expenseDetail} onClose={() => setExpenseDetail(null)} />}
            {rejecting && (
                <RejectModal count={rejecting.length} onClose={() => setRejecting(null)}
                    onConfirm={(reason) => { const ids = rejecting; setRejecting(null); changeStatus(ids, "Rejected", reason); }} />
            )}
        </div>
        </MotionConfig>
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
