import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Eye, Pencil, Trash2, List, Users, CheckCircle, CreditCard, TrendingUp, PlusCircle, Clock, Download, RefreshCw, Flag } from "lucide-react";
import API, { API_BASE_URL } from "../api/api";
import toast from "react-hot-toast";



import { format } from "date-fns";
import { locationData } from "../data/locations";
import { io } from "socket.io-client";
import Skeleton from "../components/common/Skeleton";

const DESIGNATIONS = [
    "Proprietor", "Director", "Managing Director", "Procurement Manager", 
    "Purchase Manager", "General Manager", "CEO", "Owner", "Other"
];

const COUNTRIES = ["India", "United States", "United Kingdom", "United Arab Emirates", "Singapore", "Australia"];

const ProductSearchSelect = React.memo(({ value, onChange, placeholder = "Select Product..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    // Initial load for value display
    useEffect(() => {
        if (value && searchTerm === "") {
            API.get(`/products/${value}`).then(res => {
                if (res.data) setSearchTerm(`${res.data.name} (${res.data.productNo})`);
            }).catch(() => {});
        }
    }, [value]);

    useEffect(() => {
        if (!searchTerm || searchTerm.length < 2 || searchTerm.includes('(')) {
            if (!searchTerm) setResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            setLoading(true);
            API.get(`/products/search/${searchTerm}`)
                .then(res => {
                    setResults(res.data || []);
                    setLoading(false);
                })
                .catch(() => {
                    setResults([]);
                    setLoading(false);
                });
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    return (
        <div className="relative">
            <input
                type="text"
                className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsOpen(true);
                    if (e.target.value === "") onChange("");
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            />
            {loading && (
                <div className="absolute right-8 top-2">
                    <Skeleton type="table" count={3} />
                </div>
            )}
            {searchTerm && (
                <button
                    type="button"
                    onClick={() => {
                        onChange("");
                        setSearchTerm("");
                        setResults([]);
                    }}
                    className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer text-lg leading-none"
                >
                    &times;
                </button>
            )}
            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full max-h-60 overflow-y-auto bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg mt-1">
                    {results.map(p => (
                        <div
                            key={p._id}
                            className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-0"
                                onMouseDown={(e) => {
                                e.preventDefault();
                                onChange(p); // Return product object
                                setSearchTerm(`${p.name} (${p.productNo})`);
                                setIsOpen(false);
                            }}
                        >
                            <div className="font-bold">{p.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Part Code: {p.productNo} | Brand: {p.brand} | Rate: ₹{p.retailPriceINR || 0}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});


const ClientSearchSelect = React.memo(({ clients, value, onChange, placeholder = "Client Name *", disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value || "");

    useEffect(() => {
        setSearchTerm(value || "");
    }, [value]);

    const filtered = React.useMemo(() => {
        const term = searchTerm.toLowerCase();
        return clients.filter(c => {
            return (c.clientName || "").toLowerCase().includes(term);
        }).slice(0, 50);
    }, [clients, searchTerm]);

    return (
        <div className="relative w-full">
            <input
                type="text"
                className={`w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => {
                    const val = e.target.value;
                    setSearchTerm(val);
                    setIsOpen(true);
                    onChange(val, null);
                }}
                onFocus={() => !disabled && setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                disabled={disabled}
                required
            />
            {isOpen && filtered.length > 0 && !disabled && (
                <div className="absolute z-50 w-full max-h-60 overflow-y-auto bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl mt-1">
                    {filtered.map(c => (
                        <div
                            key={c._id}
                            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-0"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setSearchTerm(c.clientName);
                                onChange(c.clientName, c);
                                setIsOpen(false);
                            }}
                        >
                            <div className="font-bold">{c.clientName}</div>
                            {c.contactPerson1?.phone && <div className="text-xs text-gray-500 dark:text-gray-400">Phone: {c.contactPerson1.phone}</div>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

const escapeHTML = (str) => {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const getStatusColor = (status) => {
    switch (status) {
        case "New": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
        case "Contacted": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
        case "Qualified": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
        case "Quotation Submitted": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
        case "Won": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
        case "Lost": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
        default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
};

const statusColors = {
    New: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    Contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    Qualified: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    "Quotation Submitted": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    Won: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    Lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
};

const StatCard = React.memo(({ title, value, icon, color, loading }) => (
    <div className={`bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4`}>
        <div className={`p-4 rounded-xl ${color} text-white`}>
            <span className="text-2xl">{icon}</span>
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
            {loading ? (
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mt-1"></div>
            ) : (
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
            )}
        </div>
    </div>
));


const SkeletonRow = ({ cols = 8 }) => (
    <tr className="animate-pulse">
        {[...Array(cols)].map((_, i) => (
            <td key={i} className="px-6 py-4">
                <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${i === cols - 1 ? 'w-20 mx-auto h-8 rounded-lg' : 'w-24'}`}></div>
            </td>
        ))}
    </tr>
);

const ClientTableView = React.memo(({ 
    clients, searchClientQuery, searchClientGroup, searchClientAllotment, leads, openClientViewModal, setEditingClient, setClientFormData, 
    setClientIsSecret, setClientAllowedUsers, setShowClientModal, handleDeleteClient, loading,
    pagination, onPageChange
}) => {
    const filteredClients = clients;

    const { currentPage, totalPages, totalItems } = pagination || { currentPage: 1, totalPages: 1, totalItems: 0 };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Client Info</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Group</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact Person</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Location</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Leads</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {loading && clients.length === 0 ? (
                            [...Array(5)].map((_, i) => <SkeletonRow key={i} cols={6} />)
                        ) : filteredClients.length === 0 ? (
                            <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500 italic">No clients found.</td></tr>
                        ) : (
                            filteredClients.map((c, index) => {
                                const clientLeadCount = leads.filter(l =>
                                    l.name === c.clientName &&
                                    (l.group?._id === c.group?._id || l.group === c.group?._id || l.group === c.group)
                                ).length;

                                return (
                                    <tr key={c._id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 dark:text-white text-sm">{c.clientName}</span>
                                                <span className="text-xs text-gray-500 font-mono">{c.clientId || `#${(currentPage - 1) * 10 + index + 1}`}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {c.group ? (
                                                <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-bold">
                                                    {c.group.name}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">No Group</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{c.contactPerson1?.name || "N/A"}</span>
                                                <span className="text-xs text-gray-500">{c.contactPerson1?.phone || "-"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col text-sm">
                                                <span className="text-gray-700 dark:text-gray-300">{c.billingAddress?.city || "-"}</span>
                                                <span className="text-xs text-gray-500 uppercase">{c.billingAddress?.state || "-"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs">
                                                {clientLeadCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-1">
                                                <button onClick={() => openClientViewModal(c)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" title="View">
                                                    <Eye size={18} />
                                                </button>
                                                <button onClick={() => {
                                                    setEditingClient(c);
                                                    setClientFormData({
                                                        group: c.group?._id || c.group || "",
                                                        clientName: c.clientName,
                                                        legalEntityName: c.legalEntityName,
                                                        billingAddress: c.billingAddress || { addressLine1: "", addressLine2: "", city: "", distt: "", state: "", zipCode: "", country: "" },
                                                        gstVatNo: c.gstVatNo,
                                                        contactPerson1: c.contactPerson1 || { name: "", designation: "", phone: "", email: "" },
                                                        contactPerson2: c.contactPerson2 || { name: "", designation: "", phone: "", email: "" },
                                                        isDispatchAddressSame: c.isDispatchAddressSame || false,
                                                        dispatchAddress: c.dispatchAddress || { addressLine1: "", addressLine2: "", city: "", distt: "", state: "", zipCode: "", country: "" }
                                                    });
                                                    setClientIsSecret(c.isSecret || false);
                                                    setClientAllowedUsers(c.allowedUsers || []);
                                                    setShowClientModal(true);
                                                }} className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-all" title="Edit">
                                                    <Pencil size={18} />
                                                </button>
                                                <button onClick={() => handleDeleteClient(c._id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Delete">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-500">
                        Showing <span className="font-medium text-gray-700 dark:text-gray-300">{clients.length}</span> of <span className="font-medium text-gray-700 dark:text-gray-300">{totalItems}</span> clients
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1 || loading}
                            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-all"
                        >
                            Previous
                        </button>
                        <div className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-blue-600 dark:text-blue-400">
                            {currentPage} / {totalPages}
                        </div>
                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || loading}
                            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

const QuotationTableView = React.memo(({ 
    quotations, searchQuotationQuery, openQuotationModal, handleDeleteQuotation, loading,
    pagination, onPageChange, userRole, printQuotation, downloadQuotation, onWhatsAppClick, onConvertToPI, openFollowUpModal,
    isPIView: isPIViewProp
}) => {
    const filteredQuotations = quotations;
    const isPIView = isPIViewProp !== undefined ? isPIViewProp : quotations.some(q => q.quotationNumber?.startsWith("PI"));

    const { currentPage, totalPages, totalItems } = pagination || { currentPage: 1, totalPages: 1, totalItems: 0 };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50/50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700">
                        <tr>
                            <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-[0.1em]">{isPIView ? "PI Info" : "Quotation Info"}</th>
                            <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-[0.1em]">Lead / Client</th>
                            <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-[0.1em]">Financials</th>
                            <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-[0.1em]">Issued Date</th>
                            {!isPIView && <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-[0.1em]">Follow-up</th>}
                            <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-[0.1em]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                        {loading && quotations.length === 0 ? (
                            [...Array(5)].map((_, i) => <SkeletonRow key={i} cols={isPIView ? 5 : 6} />)
                        ) : filteredQuotations.length === 0 ? (
                            <tr><td colSpan={isPIView ? 5 : 6} className="px-6 py-20 text-center text-gray-400 italic">No quotations found in the registry.</td></tr>
                        ) : (
                            filteredQuotations.map((q) => (
                                <tr key={q._id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group">
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-black text-gray-900 dark:text-white tracking-tight">#{q.quotationNumber}</span>
                                            <span className="text-[10px] uppercase font-bold text-blue-500 tracking-widest mt-0.5">
                                                {q.lead?.leadNumber ? `Lead No: ${q.lead.leadNumber}` : "Commercial Offer"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{q.lead?.name || "Unknown Client"}</span>
                                            <span className="text-xs text-gray-500">{q.lead?.company || "Direct Individual"}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-gray-900 dark:text-white">₹{q.grandTotal?.toLocaleString() || "0"}</span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase">Incl. Taxes</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col items-start gap-1">
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg">
                                                {format(new Date(q.createdAt), "dd MMM yyyy")}
                                            </span>
                                            {!isPIView && q.lead?.status !== "Won" && q.lead?.status !== "Lost" && q.followUps && q.followUps.length > 0 && (
                                                (() => {
                                                    const sorted = [...q.followUps].sort((a, b) => new Date(a.date) - new Date(b.date));
                                                    const upcoming = sorted.find(f => new Date(f.date) >= new Date());
                                                    if (upcoming) {
                                                        return (
                                                            <div className="text-[10px] text-red-600 dark:text-red-400 font-bold flex items-center gap-1 mt-0.5" title={`Upcoming follow-up: ${upcoming.remark}`}>
                                                                <Flag size={10} className="fill-red-600 dark:fill-red-400 text-red-600 dark:text-red-400" />
                                                                <span>F/U: {format(new Date(upcoming.date), "dd MMM HH:mm")}</span>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()
                                            )}
                                        </div>
                                    </td>
                                    {!isPIView && (
                                        <td className="px-6 py-5 text-sm text-gray-500 dark:text-gray-400">
                                            {q.followUps && q.followUps.length > 0 ? (
                                                (() => {
                                                    const sorted = [...q.followUps].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
                                                    const recent = sorted[0];
                                                    return (
                                                        <div className="flex flex-col max-w-[200px]" title={recent.remark}>
                                                            <span className="text-gray-800 dark:text-gray-200 font-medium truncate">{recent.remark}</span>
                                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-0.5">
                                                                By: {recent.createdBy?.name || "System"} | {format(new Date(recent.createdAt || recent.date), "dd MMM")}
                                                            </span>
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <span className="text-gray-400 dark:text-gray-600 italic">No Follow-up</span>
                                            )}
                                        </td>
                                    )}
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button 
                                                onClick={() => printQuotation(q)} 
                                                className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all shadow-sm bg-white dark:bg-gray-800" 
                                                title="View / Print Quotation"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            {!isPIView && (
                                                <button 
                                                    onClick={() => openFollowUpModal && openFollowUpModal(q, "quotation")} 
                                                    className={`p-2.5 transition-all shadow-sm bg-white dark:bg-gray-800 rounded-xl ${
                                                        q.lead?.status === "Won" || q.lead?.status === "Lost"
                                                            ? "text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                                            : "text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                                                    }`}
                                                    title={q.lead?.status === "Won" || q.lead?.status === "Lost" ? "View Follow-up History" : "Add Follow-up"}
                                                >
                                                    <Flag size={18} className={q.lead?.status === "Won" || q.lead?.status === "Lost" ? "" : "fill-current"} />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => {
                                                    const phone = q.lead?.phone || "";
                                                    if (!phone) {
                                                        toast.error("No phone number registered for this lead");
                                                        return;
                                                    }
                                                    let cleanPhone = phone.replace(/\D/g, "");
                                                    if (cleanPhone.length === 10) {
                                                        cleanPhone = `91${cleanPhone}`;
                                                    }
                                                    window.open(`https://wa.me/${cleanPhone}`, "_blank");
                                                }} 
                                                className="p-2.5 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-xl transition-all shadow-sm bg-white dark:bg-gray-800 flex items-center justify-center" 
                                                title="Send WhatsApp Message"
                                            >
                                                <svg 
                                                    className="w-[18px] h-[18px] text-green-500 dark:text-green-400 transition-transform hover:scale-110" 
                                                    viewBox="0 0 24 24" 
                                                    fill="currentColor"
                                                >
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                </svg>
                                            </button>
                                            <button 
                                                onClick={() => downloadQuotation(q)} 
                                                className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all shadow-sm bg-white dark:bg-gray-800 flex items-center justify-center animate-fade-in" 
                                                title="Download PDF"
                                            >
                                                <Download size={18} />
                                            </button>
                                            {!q.quotationNumber?.startsWith("PI") && (
                                                <button 
                                                    onClick={() => onConvertToPI && onConvertToPI(q)} 
                                                    className="p-2.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-xl transition-all shadow-sm bg-white dark:bg-gray-800 flex items-center justify-center" 
                                                    title="Convert to PI"
                                                >
                                                    <RefreshCw size={18} />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => openQuotationModal(q)} 
                                                className="p-2.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-xl transition-all shadow-sm bg-white dark:bg-gray-800" 
                                                title="Edit Proposal"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            {(userRole === "admin" || userRole === "superadmin") && (
                                                <button 
                                                    onClick={() => handleDeleteQuotation(q._id)} 
                                                    className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all shadow-sm bg-white dark:bg-gray-800" 
                                                    title="Remove"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="px-8 py-6 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Document Registry: <span className="text-gray-900 dark:text-white">{totalItems} {isPIView ? "Proformas" : "Proposals"}</span>
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1 || loading}
                            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-white dark:hover:bg-gray-800 transition-all"
                        >
                            <span className="px-2 text-xs font-black uppercase tracking-widest">Prev</span>
                        </button>
                        <span className="text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || loading}
                            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-white dark:hover:bg-gray-800 transition-all"
                        >
                            <span className="px-2 text-xs font-black uppercase tracking-widest">Next</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

const GroupTableView = React.memo(({ 
    groups, searchGroupQuery, leads, openGroupModal, handleGroupDelete,
    pagination, onPageChange
}) => {
    const filteredGroups = groups;
    
    const { currentPage, totalPages, totalItems } = pagination || { currentPage: 1, totalPages: 1, totalItems: 0 };
    const paginatedGroups = filteredGroups.slice((currentPage - 1) * 3, currentPage * 3);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50/50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700">
                        <tr>
                            <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Group Category</th>
                            <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Population</th>
                            <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                        {filteredGroups.length === 0 ? (
                            <tr><td colSpan="3" className="px-6 py-20 text-center text-gray-400 italic font-medium">No active groups found.</td></tr>
                        ) : (
                            paginatedGroups.map((g) => {
                                const groupLeadCount = leads.filter(l => (l.group?._id === g._id || l.group === g._id)).length;
                                return (
                                    <tr key={g._id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-lg">
                                                    {g.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-black text-gray-900 dark:text-white text-lg tracking-tight">{g.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-gray-800 dark:text-gray-200">{groupLeadCount} Registered Leads</span>
                                                <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-2 overflow-hidden">
                                                    <div 
                                                        className="h-full bg-blue-500 rounded-full" 
                                                        style={{ width: `${Math.min(100, (groupLeadCount / (leads.length || 1)) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => openGroupModal(g)} className="p-3 text-gray-400 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm border border-transparent hover:border-blue-100">
                                                    <Pencil size={18} />
                                                </button>
                                                <button onClick={() => handleGroupDelete(g._id)} className="p-3 text-gray-400 hover:text-red-600 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm border border-transparent hover:border-red-100">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            
            {totalPages > 1 && (
                <div className="px-8 py-6 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                        Segment Index: <span className="text-gray-900 dark:text-white">{totalItems} Active Groups</span>
                    </p>
                    <div className="flex items-center gap-2">
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i}
                                onClick={() => onPageChange(i + 1)}
                                className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === i + 1 
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" 
                                    : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-500 hover:bg-gray-50"}`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

const TableView = React.memo(({ 
    data, type, statusColors, rolePermissions, userRole, openViewModal, openModal, handleDelete, 
    currentUserId, currentUserName, pagination, onPageChange, loading, onWhatsAppClick, openFollowUpModal
}) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="overflow-x-auto">
            <table className="w-full">
                {/* ... existing table code ... */}
                <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Lead No</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Group</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created By</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Assigned To</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky right-0 bg-gray-100 dark:bg-gray-700 z-10 border-l border-gray-200 dark:border-gray-600 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {loading && data.length === 0 ? (
                        [...Array(5)].map((_, i) => <SkeletonRow key={i} cols={7} />)
                    ) : data.length === 0 ? (
                        <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">No {type} found.</td></tr>
                    ) : (
                        data.map((l) => (
                            <tr key={l._id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                                    <div>{l.leadNumber || "-"}</div>
                                    {l.status !== "Won" && l.status !== "Lost" && l.followUps && l.followUps.length > 0 && (
                                        (() => {
                                            const sortedFollowUps = [...l.followUps].sort((a, b) => new Date(a.date) - new Date(b.date));
                                            const upcoming = sortedFollowUps.find(f => new Date(f.date) >= new Date());
                                            if (upcoming) {
                                                return (
                                                    <div className="text-[10px] text-red-600 dark:text-red-400 font-bold mt-1 flex items-center gap-1" title={`Upcoming follow-up: ${upcoming.remark}`}>
                                                        <Flag size={10} className="fill-red-600 dark:fill-red-400 text-red-600 dark:text-red-400" />
                                                        <span>F/U: {format(new Date(upcoming.date), "dd MMM HH:mm")}</span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(l.status)}`}>
                                        {l.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                    <div className="max-w-[200px] truncate" title={l.name}>
                                        {l.name}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                    {l.group?.name || "-"}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                    {l.source || "-"}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium whitespace-nowrap">
                                    {l.assignedTo?.name || <span className="text-gray-400 dark:text-gray-600 italic">Unassigned</span>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm sticky right-0 bg-white dark:bg-gray-800 z-10 border-l border-gray-100 dark:border-gray-700 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] group-hover:bg-gray-50/80 dark:group-hover:bg-gray-700/50 transition-colors">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => openViewModal(l)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all" title="View Details">
                                            <Eye size={18} />
                                        </button>
                                        <button 
                                            onClick={() => openFollowUpModal && openFollowUpModal(l)} 
                                            className={`p-2 transition-all rounded-lg ${
                                                l.status === "Won" || l.status === "Lost"
                                                    ? "text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                                    : "text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            }`} 
                                            title={l.status === "Won" || l.status === "Lost" ? "View Follow-up History" : "Add Follow-up"}
                                        >
                                            <Flag size={18} className={l.status === "Won" || l.status === "Lost" ? "" : "fill-current"} />
                                        </button>
                                        <button 
                                            onClick={() => onWhatsAppClick && onWhatsAppClick(l)} 
                                            className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-lg transition-all flex items-center justify-center" 
                                            title="Send WhatsApp Message"
                                        >
                                            <svg 
                                                className="w-[18px] h-[18px] text-green-500 dark:text-green-400 transition-transform hover:scale-110" 
                                                viewBox="0 0 24 24" 
                                                fill="currentColor"
                                            >
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                            </svg>
                                        </button>
                                        {(() => {
                                            const isAdminLead = (l.createdBy && (l.createdBy.role === "admin" || l.createdBy.role === "superadmin")) || 
                                                                (l.assignedBy && (l.assignedBy.role === "admin" || l.assignedBy.role === "superadmin"));
                                            
                                            const normalizedRole = userRole?.toLowerCase();
                                            const canEdit = normalizedRole === "admin" || 
                                                           normalizedRole === "superadmin" || 
                                                           isAdminLead ||
                                                           (l.createdBy && String(l.createdBy._id || l.createdBy) === String(currentUserId)) || 
                                                           (l.assignedTo && String(l.assignedTo._id || l.assignedTo) === String(currentUserId)) ||
                                                           (l.source === currentUserName);

                                            return canEdit ? (
                                                <button onClick={() => openModal(l)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" title="Edit Lead">
                                                    <Pencil size={18} />
                                                </button>
                                            ) : (
                                                <span className="p-2 text-gray-300 dark:text-gray-600 cursor-not-allowed" title="Permission Denied">
                                                    <Pencil size={18} className="opacity-30" />
                                                </span>
                                            );
                                        })()}
                                        {(() => {
                                            const isAdminLead = (l.createdBy && (l.createdBy.role === "admin" || l.createdBy.role === "superadmin")) || 
                                                                (l.assignedBy && (l.assignedBy.role === "admin" || l.assignedBy.role === "superadmin"));
                                            
                                            // Delete Rule: If it's an Admin lead, only Admins can delete.
                                            // Otherwise, Admins or Creators can delete.
                                            const canDelete = userRole === "admin" || userRole === "superadmin";
                                            
                                            return canDelete ? (
                                                <button onClick={() => handleDelete(l._id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Delete">
                                                    <Trash2 size={18} />
                                                </button>
                                            ) : (
                                                <span className="p-2 text-gray-300 dark:text-gray-600 cursor-not-allowed" title={isAdminLead ? "Only Admin can delete this lead" : "Permission Denied"}>
                                                    <Trash2 size={18} className="opacity-30" />
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
        {/* Pagination UI */}
        {pagination && pagination.totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                    Showing <span className="font-medium text-gray-700 dark:text-gray-300">{data.length}</span> of <span className="font-medium text-gray-700 dark:text-gray-300">{pagination.totalLeads}</span> leads
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => onPageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="px-4 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 shadow-sm"
                    >
                        Prev
                    </button>
                    {(() => {
                        const total = pagination.totalPages;
                        const current = pagination.currentPage;
                        const delta = 1; // Number of pages to show on each side of current
                        const range = [];
                        const rangeWithDots = [];
                        let l;

                        for (let i = 1; i <= total; i++) {
                            if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
                                range.push(i);
                            }
                        }

                        for (let i of range) {
                            if (l) {
                                if (i - l === 2) {
                                    rangeWithDots.push(l + 1);
                                } else if (i - l !== 1) {
                                    rangeWithDots.push('...');
                                }
                            }
                            rangeWithDots.push(i);
                            l = i;
                        }

                        return rangeWithDots.map((p, i) => (
                            p === '...' ? (
                                <span key={`dots-${i}`} className="px-3 py-1 text-gray-400">...</span>
                            ) : (
                                <button
                                    key={p}
                                    onClick={() => onPageChange(p)}
                                    className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${current === p 
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110" 
                                        : "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-400 dark:hover:border-blue-500"}`}
                                >
                                    {p}
                                </button>
                            )
                        ));
                    })()}
                    <button
                        onClick={() => onPageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="px-4 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 shadow-sm"
                    >
                        Next
                    </button>
                </div>
            </div>
        )}
    </div>
));

const TeamInspire = () => {
    const location = useLocation();
    const [leads, setLeads] = useState([]);
    const [groups, setGroups] = useState([]);
    const [clients, setClients] = useState([]);
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
    const [whatsAppLead, setWhatsAppLead] = useState(null);
    const [modalClients, setModalClients] = useState([]);

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    // Real-time & Permissions
    const [selectedLeads, setSelectedLeads] = useState([]);

    const [rolePermissions, setRolePermissions] = useState({});
    const [userRole, setUserRole] = useState("");
    const [currentUserId, setCurrentUserId] = useState("");
    const [currentUserName, setCurrentUserName] = useState("");
    const [socket, setSocket] = useState(null);
    const [activeTab, setActiveTab] = useState(new URLSearchParams(location.search).get("tab") || "dashboard"); // dashboard, leads, clients
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLeads, setTotalLeads] = useState(0);
    const [quotationPage, setQuotationPage] = useState(1);
    const [quotationTotalPages, setQuotationTotalPages] = useState(1);
    const [clientPage, setClientPage] = useState(1);
    const [clientTotalPages, setClientTotalPages] = useState(1);
    const [totalClients, setTotalClients] = useState(0);
    const [totalQuotations, setTotalQuotations] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState(null);
    const [editingGroup, setEditingGroup] = useState(null);
    const [searchGroupQuery, setSearchGroupQuery] = useState("");
    const [searchLeadQuery, setSearchLeadQuery] = useState("");
    const [searchMyLeadQuery, setSearchMyLeadQuery] = useState("");
    const [isLeadsSearchExpanded, setIsLeadsSearchExpanded] = useState(false);
    const [isMyLeadsSearchExpanded, setIsMyLeadsSearchExpanded] = useState(false);
    const [searchClientQuery, setSearchClientQuery] = useState("");
    const [searchClientGroup, setSearchClientGroup] = useState("");
    const [searchClientAllotment, setSearchClientAllotment] = useState("");
    const [searchQuotationQuery, setSearchQuotationQuery] = useState("");
    const [leadFollowUpFilter, setLeadFollowUpFilter] = useState("all"); // 'all', 'true', 'false'
    const [myLeadsFollowUpFilter, setMyLeadsFollowUpFilter] = useState("all"); // 'all', 'true', 'false'
    const [quotationFollowUpFilter, setQuotationFollowUpFilter] = useState("all"); // 'all', 'true', 'false'
    const [proformaFollowUpFilter, setProformaFollowUpFilter] = useState("all"); // 'all', 'true', 'false'
    const [leadFilterType, setLeadFilterType] = useState("all"); // 'all', 'created', 'assigned'
    const [myLeadsFilterType, setMyLeadsFilterType] = useState("all"); // 'all', 'created', 'assigned'
    const [staffFilter, setStaffFilter] = useState("all");
    const [myLeadsStaffFilter, setMyLeadsStaffFilter] = useState("all");
    const [leadStatusFilter, setLeadStatusFilter] = useState("all"); // 'all', 'New', 'Qualified', etc.
    const [myLeadsStatusFilter, setMyLeadsStatusFilter] = useState("all"); // 'all', 'New', 'Qualified', etc.
    const [leadStartDate, setLeadStartDate] = useState("");
    const [leadEndDate, setLeadEndDate] = useState("");
    const [myLeadsStartDate, setMyLeadsStartDate] = useState("");
    const [myLeadsEndDate, setMyLeadsEndDate] = useState("");
    const [showRemarksHistory, setShowRemarksHistory] = useState(false);
    const [viewingLead, setViewingLead] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingClient, setViewingClient] = useState(null);
    const [isClientViewModalOpen, setIsClientViewModalOpen] = useState(false);

    // Follow-up States
    const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
    const [followUpItem, setFollowUpItem] = useState(null);
    const [followUpType, setFollowUpType] = useState("lead");
    const [followUpDate, setFollowUpDate] = useState("");
    const [followUpRemark, setFollowUpRemark] = useState("");
    const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);

    // Quotation State
    const [quotations, setQuotations] = useState([]);
    const [quotationStaffFilter, setQuotationStaffFilter] = useState("all");

    // Proforma State
    const [proformas, setProformas] = useState([]);
    const [proformaStaffFilter, setProformaStaffFilter] = useState("all");
    const [proformaPage, setProformaPage] = useState(1);
    const [proformaTotalPages, setProformaTotalPages] = useState(1);
    const [totalProformas, setTotalProformas] = useState(0);
    const [searchProformaQuery, setSearchProformaQuery] = useState("");
    const [products, setProducts] = useState([]);
    const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
    const [editingQuotation, setEditingQuotation] = useState(null);
    const [activeQuotationLead, setActiveQuotationLead] = useState(null);
    const [isSubmittingQuotation, setIsSubmittingQuotation] = useState(false);
    const [isSubmittingLead, setIsSubmittingLead] = useState(false);
    const [isMetaLoading, setIsMetaLoading] = useState(true);
    const [eligibleLeads, setEligibleLeads] = useState([]);
    const [dashboardCounts, setDashboardCounts] = useState({
        leads: 0, myLeads: 0, assignedLeads: 0, quotations: 0, pendingQuotes: 0, 
        qualifiedLeads: 0, wonQuotes: 0, lostQuotes: 0
    });
    const [quotationFormData, setQuotationFormData] = useState({
        lead: "",
        products: [], // { product: id, quantity: 1, unitPrice: 0 }
        validUntil: "",
        terms: {
            deliveryLeadTime: "Ex-Stock items are subject to prior sales against subject to Force Majeure Clause.",
            payment: "100% advance along with Purchase Order.",
            warranty: "12 months from the date of TeamInspire Invoice for Equipments. (Onsite). No warranty on spare parts. Consumables, Wear and tear items, including rubber parts and bulbs, are not covered under warranty.",
            deliveryTerms: "Ex-warehouse, Delhi is subject to prior sales and Force Majeure Clause.",
            validity: "30 Days from the date of PI.",
            remark: ""
        },
        termDetails: {
            paymentPercent: "100",
            warrantyMonths: "12",
            warrantyType: "Onsite",
            validityDays: "30"
        },
        billTo: { name: "", address: "", gstin: "" },
        shipTo: { name: "", address: "", gstin: "" },
        poNumber: "",
        poDate: "",
        poComment: ""
    });

    // Client Modal State
    const [showClientModal, setShowClientModal] = useState(false);

    const [editingClient, setEditingClient] = useState(null);
    const [clientFormData, setClientFormData] = useState({
        group: "",
        clientName: "",
        legalEntityName: "",
        billingAddress: { addressLine1: "", addressLine2: "", city: "", distt: "", state: "", zipCode: "", country: "" },
        gstVatNo: "",
        contactPerson1: { name: "", designation: "", phone: "", email: "" },
        contactPerson2: { name: "", designation: "", phone: "", email: "" },
        isDispatchAddressSame: false,
        dispatchAddress: { addressLine1: "", addressLine2: "", city: "", distt: "", state: "", zipCode: "", country: "" },
        isVisible: true
    });
    const [manualBilling, setManualBilling] = useState(false);
    const [manualDispatch, setManualDispatch] = useState(false);
    const [clientIsSecret, setClientIsSecret] = useState(false);
    const [clientAllowedUsers, setClientAllowedUsers] = useState([]);

    // Form Stats
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        status: "New",
        source: "Direct",
        group: "",
        leadType: "",
        assignedTo: "",
        notes: ""
    });



    const [groupName, setGroupName] = useState("");
    const [groupVisible, setGroupVisible] = useState(true);
    const [groupIsSecret, setGroupIsSecret] = useState(false);
    const [groupAllowedUsers, setGroupAllowedUsers] = useState([]);
    const [groupPage, setGroupPage] = useState(1);

    // Stable filter reference definition to prevent re-creating fetchData
    const filtersRef = React.useRef({
        activeTab: "dashboard",
        leadFilterType: "all",
        myLeadsFilterType: "all",
        staffFilter: "all",
        myLeadsStaffFilter: "all",
        quotationStaffFilter: "all",
        proformaStaffFilter: "all",
        leadStatusFilter: "all",
        myLeadsStatusFilter: "all",
        leadStartDate: "",
        leadEndDate: "",
        myLeadsStartDate: "",
        myLeadsEndDate: "",
        searchLeadQuery: "",
        searchMyLeadQuery: "",
        searchClientQuery: "",
        searchQuotationQuery: "",
        searchProformaQuery: "",
        searchClientGroup: "",
        searchClientAllotment: "",
        leadFollowUpFilter: "all",
        myLeadsFollowUpFilter: "all",
        quotationFollowUpFilter: "all",
        proformaFollowUpFilter: "all"
    });

    const prevFiltersRef = React.useRef({
        searchLeadQuery: "",
        searchMyLeadQuery: "",
        searchClientQuery: "",
        searchQuotationQuery: "",
        searchProformaQuery: "",
        searchGroupQuery: "",
        leadFilterType: "all",
        staffFilter: "all",
        leadStatusFilter: "all",
        leadStartDate: "",
        leadEndDate: "",
        myLeadsFilterType: "all",
        myLeadsStaffFilter: "all",
        myLeadsStatusFilter: "all",
        myLeadsStartDate: "",
        myLeadsEndDate: "",
        searchClientGroup: "",
        searchClientAllotment: "",
        quotationStaffFilter: "all",
        proformaStaffFilter: "all",
        leadFollowUpFilter: "all",
        myLeadsFollowUpFilter: "all",
        quotationFollowUpFilter: "all",
        proformaFollowUpFilter: "all"
    });

    // Update filtersRef in real-time as state variables change
    useEffect(() => {
        filtersRef.current = {
            activeTab,
            leadFilterType,
            myLeadsFilterType,
            staffFilter,
            myLeadsStaffFilter,
            quotationStaffFilter,
            proformaStaffFilter,
            leadStatusFilter,
            myLeadsStatusFilter,
            leadStartDate,
            leadEndDate,
            myLeadsStartDate,
            myLeadsEndDate,
            searchLeadQuery,
            searchMyLeadQuery,
            searchClientQuery,
            searchQuotationQuery,
            searchProformaQuery,
            searchClientGroup,
            searchClientAllotment,
            leadFollowUpFilter,
            myLeadsFollowUpFilter,
            quotationFollowUpFilter,
            proformaFollowUpFilter
        };
    }, [
        activeTab,
        leadFilterType,
        myLeadsFilterType,
        staffFilter,
        myLeadsStaffFilter,
        quotationStaffFilter,
        proformaStaffFilter,
        leadStatusFilter,
        myLeadsStatusFilter,
        leadStartDate,
        leadEndDate,
        myLeadsStartDate,
        myLeadsEndDate,
        searchLeadQuery,
        searchMyLeadQuery,
        searchClientQuery,
        searchQuotationQuery,
        searchProformaQuery,
        searchClientGroup,
        searchClientAllotment,
        leadFollowUpFilter,
        myLeadsFollowUpFilter,
        quotationFollowUpFilter,
        proformaFollowUpFilter
    ]);

    // Request sequence tracking to solve race conditions
    const requestCounterRef = React.useRef({
        leads: 0,
        my_leads: 0,
        clients: 0,
        quotations: 0,
        proformas: 0
    });

    const metadataRequestCounterRef = React.useRef(0);

    const fetchSummary = useCallback(() => {
        API.get("/dashboard/summary")
            .then(res => setDashboardCounts(res.data))
            .catch(err => console.error("Summary Fetch Error", err));
    }, []);

    const fetchData = useCallback(async (pageNum = 1, type = null) => {
        const currentFilters = filtersRef.current;
        const fetchType = type || currentFilters.activeTab;
        if (!fetchType) return;
        
        // Track sequence of requests for this tab
        requestCounterRef.current[fetchType] = (requestCounterRef.current[fetchType] || 0) + 1;
        const currentRequestId = requestCounterRef.current[fetchType];
        
        setLoading(true);

        try {
            const promises = [];
            
            if (fetchType === 'leads' || fetchType === 'my_leads' || (fetchType === 'dashboard' && pageNum === 1)) {
                let params = `page=${pageNum}&limit=20`;
                if (fetchType === 'my_leads') {
                    if (currentFilters.myLeadsFilterType === 'created' || currentFilters.myLeadsFilterType === 'assigned' || currentFilters.myLeadsFilterType === 'assignedByMe') {
                        params += `&filterType=${currentFilters.myLeadsFilterType}`;
                    } else {
                        params += `&filterType=my_leads`;
                    }
                    if (currentFilters.myLeadsStaffFilter !== 'all') {
                        params += `&staff=${encodeURIComponent(currentFilters.myLeadsStaffFilter)}`;
                    }
                    if (currentFilters.myLeadsStatusFilter !== 'all') {
                        params += `&status=${encodeURIComponent(currentFilters.myLeadsStatusFilter)}`;
                    }
                    if (currentFilters.myLeadsStartDate) params += `&startDate=${encodeURIComponent(currentFilters.myLeadsStartDate)}`;
                    if (currentFilters.myLeadsEndDate) params += `&endDate=${encodeURIComponent(currentFilters.myLeadsEndDate)}`;
                    if (currentFilters.searchMyLeadQuery) params += `&search=${encodeURIComponent(currentFilters.searchMyLeadQuery)}`;
                    if (currentFilters.myLeadsFollowUpFilter !== 'all') {
                        params += `&hasFollowUp=${currentFilters.myLeadsFollowUpFilter}`;
                    }
                } else {
                    if (currentFilters.leadFilterType !== 'all') {
                        params += `&filterType=${currentFilters.leadFilterType}`;
                    }
                    if (currentFilters.staffFilter !== 'all') {
                        params += `&staff=${encodeURIComponent(currentFilters.staffFilter)}`;
                    }
                    if (currentFilters.leadStatusFilter !== 'all') {
                        params += `&status=${encodeURIComponent(currentFilters.leadStatusFilter)}`;
                    }
                    if (currentFilters.leadStartDate) params += `&startDate=${encodeURIComponent(currentFilters.leadStartDate)}`;
                    if (currentFilters.leadEndDate) params += `&endDate=${encodeURIComponent(currentFilters.leadEndDate)}`;
                    if (currentFilters.searchLeadQuery) params += `&search=${encodeURIComponent(currentFilters.searchLeadQuery)}`;
                    if (currentFilters.leadFollowUpFilter !== 'all') {
                        params += `&hasFollowUp=${currentFilters.leadFollowUpFilter}`;
                    }
                }
                
                promises.push(
                    API.get(`/leads?${params}`).then(res => {
                        if (currentRequestId !== requestCounterRef.current[fetchType]) return;
                        setLeads(res.data.leads || []);
                        setTotalPages(res.data.pagination?.totalPages || 1);
                        setTotalLeads(res.data.pagination?.totalLeads || 0);
                        setPage(pageNum);
                    })
                );
            } 
            
            if (fetchType === 'clients' || (fetchType === 'dashboard' && pageNum === 1)) {
                let params = `page=${pageNum}&limit=20`;
                if (currentFilters.searchClientQuery) params += `&search=${encodeURIComponent(currentFilters.searchClientQuery)}`;
                if (currentFilters.searchClientGroup) params += `&group=${encodeURIComponent(currentFilters.searchClientGroup)}`;
                if (currentFilters.searchClientAllotment) params += `&allotment=${encodeURIComponent(currentFilters.searchClientAllotment)}`;
                
                promises.push(
                    API.get(`/clients?${params}`).then(res => {
                        if (currentRequestId !== requestCounterRef.current[fetchType]) return;
                        setClients(res.data.clients || []);
                        setClientTotalPages(res.data.pagination?.totalPages || 1);
                        setTotalClients(res.data.pagination?.totalClients || 0);
                        setClientPage(pageNum);
                    })
                );
            } 
            
            if (fetchType === 'quotations' || (fetchType === 'dashboard' && pageNum === 1)) {
                let params = `page=${pageNum}&limit=20&docType=Quotation`;
                if (currentFilters.searchQuotationQuery) params += `&search=${encodeURIComponent(currentFilters.searchQuotationQuery)}`;
                if (currentFilters.quotationStaffFilter !== 'all') params += `&staff=${encodeURIComponent(currentFilters.quotationStaffFilter)}`;
                if (currentFilters.quotationFollowUpFilter !== 'all') {
                    params += `&hasFollowUp=${currentFilters.quotationFollowUpFilter}`;
                }
                promises.push(
                    API.get(`/quotations?${params}`).then(res => {
                        if (currentRequestId !== requestCounterRef.current[fetchType]) return;
                        setQuotations(res.data.quotations || []);
                        setQuotationTotalPages(res.data.pagination?.totalPages || 1);
                        setTotalQuotations(res.data.pagination?.totalQuotations || 0);
                        setQuotationPage(pageNum);
                    })
                );
            }

            if (fetchType === 'proformas' || (fetchType === 'dashboard' && pageNum === 1)) {
                let params = `page=${pageNum}&limit=20&docType=PI`;
                if (currentFilters.searchProformaQuery) params += `&search=${encodeURIComponent(currentFilters.searchProformaQuery)}`;
                if (currentFilters.proformaStaffFilter !== 'all') params += `&staff=${encodeURIComponent(currentFilters.proformaStaffFilter)}`;
                if (currentFilters.proformaFollowUpFilter !== 'all') {
                    params += `&hasFollowUp=${currentFilters.proformaFollowUpFilter}`;
                }
                promises.push(
                    API.get(`/quotations?${params}`).then(res => {
                        if (currentRequestId !== requestCounterRef.current[fetchType]) return;
                        setProformas(res.data.quotations || []);
                        setProformaTotalPages(res.data.pagination?.totalPages || 1);
                        setTotalProformas(res.data.pagination?.totalQuotations || 0);
                        setProformaPage(pageNum);
                    })
                );
            }

            if (fetchType === 'dashboard' && pageNum === 1) {
                promises.push(
                    API.get("/dashboard/summary").then(res => {
                        if (filtersRef.current.activeTab !== 'dashboard') return;
                        setDashboardCounts(res.data);
                    })
                );
            }

            if (promises.length > 0) {
                await Promise.all(promises);
            }
        } catch (err) {
            console.error("Fetch Data Error:", err);
        } finally {
            if (currentRequestId === requestCounterRef.current[fetchType]) {
                setLoading(false);
            }
        }
    }, []);

    const fetchMetadata = useCallback(async (search = "") => {
        metadataRequestCounterRef.current = (metadataRequestCounterRef.current || 0) + 1;
        const currentMetadataId = metadataRequestCounterRef.current;
        
        setIsMetaLoading(true);
        try {
            const groupParams = search ? `?search=${encodeURIComponent(search)}` : "";
            const [groupsRes, usersRes] = await Promise.all([
                API.get(`/groups${groupParams}`),
                API.get("/auth/users")
            ]);
            
            if (currentMetadataId !== metadataRequestCounterRef.current) return;
            setGroups(groupsRes.data || []);
            setUsers(usersRes.data || []);
        } catch (err) {
            console.error("Metadata Fetch Error:", err);
        } finally {
            if (currentMetadataId === metadataRequestCounterRef.current) {
                setIsMetaLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const tab = urlParams.get("tab");
        
        if (tab) {
            setActiveTab(tab);
        } else if (location.pathname === '/leads') {
            setActiveTab('leads');
        }
    }, [location.search, location.pathname]);

    const [fetchedTabs, setFetchedTabs] = useState(new Set());

    // Data fetching on tab change - Optimized to avoid redundant fetches
    useEffect(() => {
        if (activeTab && !fetchedTabs.has(activeTab)) {
            fetchData(1, activeTab);
            setFetchedTabs(prev => new Set(prev).add(activeTab));
        }
    }, [activeTab, fetchedTabs, fetchData]);

    // Debounced search for leads
    useEffect(() => {
        if (activeTab !== 'leads') return;
        if (prevFiltersRef.current.searchLeadQuery === searchLeadQuery) return;
        prevFiltersRef.current.searchLeadQuery = searchLeadQuery;

        const delayDebounceFn = setTimeout(() => {
            fetchData(1, 'leads');
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchLeadQuery, activeTab, fetchData]);

    // Debounced search for my_leads
    useEffect(() => {
        if (activeTab !== 'my_leads') return;
        if (prevFiltersRef.current.searchMyLeadQuery === searchMyLeadQuery) return;
        prevFiltersRef.current.searchMyLeadQuery = searchMyLeadQuery;

        const delayDebounceFn = setTimeout(() => {
            fetchData(1, 'my_leads');
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchMyLeadQuery, activeTab, fetchData]);

    // Debounced search for clients
    useEffect(() => {
        if (activeTab !== 'clients') return;
        if (prevFiltersRef.current.searchClientQuery === searchClientQuery) return;
        prevFiltersRef.current.searchClientQuery = searchClientQuery;

        const delayDebounceFn = setTimeout(() => {
            fetchData(1, 'clients');
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchClientQuery, activeTab, fetchData]);

    // Re-fetch clients when filters change
    useEffect(() => {
        if (activeTab !== 'clients') return;
        const groupChanged = prevFiltersRef.current.searchClientGroup !== searchClientGroup;
        const allotmentChanged = prevFiltersRef.current.searchClientAllotment !== searchClientAllotment;
        if (!groupChanged && !allotmentChanged) return;

        prevFiltersRef.current.searchClientGroup = searchClientGroup;
        prevFiltersRef.current.searchClientAllotment = searchClientAllotment;

        fetchData(1, 'clients');
    }, [searchClientGroup, searchClientAllotment, activeTab, fetchData]);

    // Debounced search for quotations
    useEffect(() => {
        if (activeTab !== 'quotations') return;
        if (prevFiltersRef.current.searchQuotationQuery === searchQuotationQuery) return;
        prevFiltersRef.current.searchQuotationQuery = searchQuotationQuery;

        const delayDebounceFn = setTimeout(() => {
            fetchData(1, 'quotations');
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuotationQuery, activeTab, fetchData]);

    // Re-fetch quotations when staff or follow-up filters change
    useEffect(() => {
        if (activeTab !== 'quotations') return;
        const staffChanged = prevFiltersRef.current.quotationStaffFilter !== quotationStaffFilter;
        const followUpChanged = prevFiltersRef.current.quotationFollowUpFilter !== quotationFollowUpFilter;
        if (!staffChanged && !followUpChanged) return;

        prevFiltersRef.current.quotationStaffFilter = quotationStaffFilter;
        prevFiltersRef.current.quotationFollowUpFilter = quotationFollowUpFilter;

        fetchData(1, 'quotations');
    }, [quotationStaffFilter, quotationFollowUpFilter, activeTab, fetchData]);

    // Debounced search for proformas
    useEffect(() => {
        if (activeTab !== 'proformas') return;
        if (prevFiltersRef.current.searchProformaQuery === searchProformaQuery) return;
        prevFiltersRef.current.searchProformaQuery = searchProformaQuery;

        const delayDebounceFn = setTimeout(() => {
            fetchData(1, 'proformas');
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchProformaQuery, activeTab, fetchData]);

    // Re-fetch proformas when staff or follow-up filters change
    useEffect(() => {
        if (activeTab !== 'proformas') return;
        const staffChanged = prevFiltersRef.current.proformaStaffFilter !== proformaStaffFilter;
        const followUpChanged = prevFiltersRef.current.proformaFollowUpFilter !== proformaFollowUpFilter;
        if (!staffChanged && !followUpChanged) return;

        prevFiltersRef.current.proformaStaffFilter = proformaStaffFilter;
        prevFiltersRef.current.proformaFollowUpFilter = proformaFollowUpFilter;

        fetchData(1, 'proformas');
    }, [proformaStaffFilter, proformaFollowUpFilter, activeTab, fetchData]);

    // Debounced search for groups
    useEffect(() => {
        if (activeTab !== 'groups') return;
        if (prevFiltersRef.current.searchGroupQuery === searchGroupQuery) return;
        prevFiltersRef.current.searchGroupQuery = searchGroupQuery;

        const delayDebounceFn = setTimeout(() => {
            // Re-fetch metadata with search
            fetchMetadata(searchGroupQuery);
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchGroupQuery, activeTab, fetchMetadata]);

    // Re-fetch leads when leads filter changes
    useEffect(() => {
        if (activeTab !== 'leads') return;
        const filterTypeChanged = prevFiltersRef.current.leadFilterType !== leadFilterType;
        const staffChanged = prevFiltersRef.current.staffFilter !== staffFilter;
        const statusChanged = prevFiltersRef.current.leadStatusFilter !== leadStatusFilter;
        const startDateChanged = prevFiltersRef.current.leadStartDate !== leadStartDate;
        const endDateChanged = prevFiltersRef.current.leadEndDate !== leadEndDate;
        const followUpChanged = prevFiltersRef.current.leadFollowUpFilter !== leadFollowUpFilter;

        if (!filterTypeChanged && !staffChanged && !statusChanged && !startDateChanged && !endDateChanged && !followUpChanged) return;

        prevFiltersRef.current.leadFilterType = leadFilterType;
        prevFiltersRef.current.staffFilter = staffFilter;
        prevFiltersRef.current.leadStatusFilter = leadStatusFilter;
        prevFiltersRef.current.leadStartDate = leadStartDate;
        prevFiltersRef.current.leadEndDate = leadEndDate;
        prevFiltersRef.current.leadFollowUpFilter = leadFollowUpFilter;

        fetchData(1, 'leads');
    }, [leadFilterType, staffFilter, leadStatusFilter, leadStartDate, leadEndDate, leadFollowUpFilter, activeTab, fetchData]);

    // Re-fetch my_leads when my_leads filter changes
    useEffect(() => {
        if (activeTab !== 'my_leads') return;
        const filterTypeChanged = prevFiltersRef.current.myLeadsFilterType !== myLeadsFilterType;
        const staffChanged = prevFiltersRef.current.myLeadsStaffFilter !== myLeadsStaffFilter;
        const statusChanged = prevFiltersRef.current.myLeadsStatusFilter !== myLeadsStatusFilter;
        const startDateChanged = prevFiltersRef.current.myLeadsStartDate !== myLeadsStartDate;
        const endDateChanged = prevFiltersRef.current.myLeadsEndDate !== myLeadsEndDate;
        const followUpChanged = prevFiltersRef.current.myLeadsFollowUpFilter !== myLeadsFollowUpFilter;

        if (!filterTypeChanged && !staffChanged && !statusChanged && !startDateChanged && !endDateChanged && !followUpChanged) return;

        prevFiltersRef.current.myLeadsFilterType = myLeadsFilterType;
        prevFiltersRef.current.myLeadsStaffFilter = myLeadsStaffFilter;
        prevFiltersRef.current.myLeadsStatusFilter = myLeadsStatusFilter;
        prevFiltersRef.current.myLeadsStartDate = myLeadsStartDate;
        prevFiltersRef.current.myLeadsEndDate = myLeadsEndDate;
        prevFiltersRef.current.myLeadsFollowUpFilter = myLeadsFollowUpFilter;

        fetchData(1, 'my_leads');
    }, [myLeadsFilterType, myLeadsStaffFilter, myLeadsStatusFilter, myLeadsStartDate, myLeadsEndDate, myLeadsFollowUpFilter, activeTab, fetchData]);

    useEffect(() => {
        console.log("DEBUG: Mount useEffect running in Leads.jsx");
        // Initial setup only, fetchData is handled by the tab listener

        // Load permissions
        const storedPermissions = JSON.parse(localStorage.getItem("rolePermissions") || "{}");
        setRolePermissions(storedPermissions);
        setUserRole(localStorage.getItem("role") || "");
        setCurrentUserId(localStorage.getItem("userId") || "");
        setCurrentUserName(localStorage.getItem("name") || "");

        // Refresh permissions from server
        API.get("/auth/me").then(res => {
            setRolePermissions(res.data.rolePermissions || {});
            setUserRole(res.data.role);
            setCurrentUserId(res.data._id);
            setCurrentUserName(res.data.name);
            localStorage.setItem("rolePermissions", JSON.stringify(res.data.rolePermissions || {}));
            localStorage.setItem("role", res.data.role);
            localStorage.setItem("userId", res.data._id);
            localStorage.setItem("name", res.data.name);
        }).catch(err => console.error("Permission Sync Error", err));

        fetchSummary();

        fetchMetadata();

        // Socket Connection
        const socketUrl = API_BASE_URL.replace('/api', '') || window.location.origin;

        const newSocket = io(socketUrl, {
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: 5,
        });
        setSocket(newSocket);

        let summaryTimer;
        const debouncedSummary = () => {
            if (summaryTimer) clearTimeout(summaryTimer);
            summaryTimer = setTimeout(fetchSummary, 2000); // Increased to 2s
        };

        newSocket.on("leadAdded", (newLead) => {
            setLeads(prev => [newLead, ...prev]);
            debouncedSummary(); 
        });

        newSocket.on("leadUpdated", (updatedLead) => {
            setLeads(prev => prev.map(l => l._id === updatedLead._id ? updatedLead : l));
            debouncedSummary();
        });

        newSocket.on("leadDeleted", (id) => {
            setLeads(prev => prev.filter(l => l._id !== id));
            debouncedSummary();
        });

        newSocket.on("leadsBulkDeleted", (ids) => {
            setLeads(prev => prev.filter(l => !ids.includes(l._id)));
            setSelectedLeads(prev => prev.filter(id => !ids.includes(id)));
            debouncedSummary();
        });

        newSocket.on("quotationAdded", (newQuote) => {
            if (newQuote.quotationNumber?.startsWith("PI")) {
                setProformas(prev => [newQuote, ...prev]);
            } else {
                setQuotations(prev => [newQuote, ...prev]);
            }
            debouncedSummary();
        });

        newSocket.on("quotationUpdated", (updatedQuote) => {
            if (updatedQuote.quotationNumber?.startsWith("PI")) {
                setQuotations(prev => prev.filter(q => q._id !== updatedQuote._id));
                setProformas(prev => {
                    const exists = prev.some(q => q._id === updatedQuote._id);
                    if (exists) {
                        return prev.map(q => q._id === updatedQuote._id ? updatedQuote : q);
                    } else {
                        return [updatedQuote, ...prev];
                    }
                });
            } else {
                setQuotations(prev => prev.map(q => q._id === updatedQuote._id ? updatedQuote : q));
                setProformas(prev => prev.filter(q => q._id !== updatedQuote._id));
            }
            debouncedSummary();
        });

        newSocket.on("quotationDeleted", (id) => {
            setQuotations(prev => prev.filter(q => q._id !== id));
            setProformas(prev => prev.filter(q => q._id !== id));
            debouncedSummary();
        });

        let clientTimer;
        const debouncedClientFetch = () => {
            if (clientTimer) clearTimeout(clientTimer);
            clientTimer = setTimeout(() => {
                fetchData(1, 'clients');
                fetchSummary();
            }, 1500);
        };

        newSocket.on("clientAdded", debouncedClientFetch);
        newSocket.on("clientUpdated", debouncedClientFetch);
        newSocket.on("clientDeleted", debouncedClientFetch);

        return () => {
            if (summaryTimer) clearTimeout(summaryTimer);
            if (clientTimer) clearTimeout(clientTimer);
            newSocket.disconnect();
        };
    }, []);

    useEffect(() => {
        console.log("DEBUG: Navigation/State useEffect running in Leads.jsx", { locationSearch: location.search, loading, leadsCount: leads.length, isModalOpen, isViewModalOpen });
        if (!loading) {
            const queryParams = new URLSearchParams(location.search);
            const action = queryParams.get("action");
            const id = queryParams.get("id");

            // Check flags only once to avoid multiple re-renders
            if (action === "add" && !isModalOpen) {
                if (rolePermissions?.menuPermissions?.['Leads']?.add || userRole === "admin" || userRole?.toLowerCase() === "sales" || userRole?.toLowerCase() === "services") {
                    openModal();
                } else {
                    toast.error("Unauthorized action");
                }
            } else if (action === "edit" && id && leads.length > 0 && !isModalOpen && !editingLead) {
                if (rolePermissions?.menuPermissions?.['Leads']?.edit || userRole === "admin" || userRole?.toLowerCase() === "sales" || userRole?.toLowerCase() === "services") {
                    const leadToEdit = leads.find(l => l._id === id);
                    if (leadToEdit) openModal(leadToEdit);
                } else {
                    toast.error("Unauthorized action");
                }
            } else if (action === "view" && id && leads.length > 0 && !isViewModalOpen && !viewingLead) {
                const leadToView = leads.find(l => l._id === id);
                if (leadToView) openViewModal(leadToView);
            } else if (action === "update") {
                setActiveTab("leads");
            }
        }
    }, [location.search, loading, leads, isModalOpen, isViewModalOpen]);

    // Enhanced Auto-fill for Quotation Modal
    useEffect(() => {
        if (isQuotationModalOpen) {
            if (!quotationFormData.lead) {
                setActiveQuotationLead(null);
                return;
            }

            const fetchAndApply = async () => {
                let l = null;
                try {
                    if (quotationFormData.lead && quotationFormData.lead.match(/^[0-9a-fA-F]{24}$/)) {
                        const res = await API.get(`/leads/${quotationFormData.lead}`);
                        l = res.data;
                        if (l && l.leadNumber !== quotationFormData.leadNumber) {
                            setQuotationFormData(prev => ({ 
                                ...prev, 
                                leadNumber: l.leadNumber 
                            }));
                        }
                    } else {
                        console.warn("Invalid or missing Lead ID for quotation:", quotationFormData.lead);
                    }
                } catch (err) {
                    console.error("Lead background fetch error", err);
                    // Fallback to local state if server fetch fails
                    l = eligibleLeads.find(lead => lead._id === quotationFormData.lead) || leads.find(lead => lead._id === quotationFormData.lead);
                }

                if (l) {
                    setActiveQuotationLead(l);
                } else {
                    setActiveQuotationLead(null);
                }

                if (l && !quotationFormData.billTo?.name) {
                    const normalize = (str) => (str || "").toLowerCase().trim();
                    const leadName = normalize(l.name);

                    const applyClientData = (foundClient) => {
                        const ba = foundClient.billingAddress || {};
                        const parts = [ba.addressLine1, ba.addressLine2, ba.city, ba.distt, ba.state, ba.zipCode, ba.country].filter(part => part && part.trim() !== "");
                        const autoAddress = parts.join(", ");
                        const autoName = foundClient.legalEntityName || foundClient.clientName;
                        const autoGst = foundClient.gstVatNo || "";

                        setQuotationFormData(prev => ({
                            ...prev,
                            leadNumber: l.leadNumber || "",
                            billTo: { name: autoName, address: autoAddress, gstin: autoGst },
                            shipTo: { name: autoName, address: autoAddress, gstin: autoGst }
                        }));
                    };

                    const groupId = l.group ? (l.group._id || l.group) : null;

                    // Try local search first - STRICT NAME MATCH ONLY
                    let client = clients.find(c => normalize(c.clientName) === leadName || normalize(c.legalEntityName) === leadName);
                    
                    if (client) {
                        applyClientData(client);
                    } else {
                        // Fetch from server - STRICT NAME MATCH ONLY
                        try {
                            const res = await API.get(`/clients?search=${encodeURIComponent(l.name)}&limit=10`);
                            const found = res.data.clients?.find(c => normalize(c.clientName) === leadName || normalize(c.legalEntityName) === leadName);
                            
                            if (found) {
                                applyClientData(found);
                            } else {
                                // If still not found, just set the lead name as the default Bill To name
                                // but leave address/gstin empty to avoid incorrect data
                                setQuotationFormData(prev => ({
                                    ...prev,
                                    leadNumber: l.leadNumber || "",
                                    billTo: { ...prev.billTo, name: l.name },
                                    shipTo: { ...prev.shipTo, name: l.name }
                                }));
                            }
                        } catch (err) {
                            console.error("Client background fetch error", err);
                        }
                    }
                }
            };
            fetchAndApply();
        }
    }, [isQuotationModalOpen, quotationFormData.lead, leads, eligibleLeads, clients]);

    // Removed local filter in favor of global backend search
    // const allClients = leads.filter(l => l.status === "Won"); // Unused, clients are fetched separately

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmittingLead) return;

        const payload = { ...formData, group: formData.group || null };

        // Validation: Must have a group if moving to Won status or Quotation Submitted
        if ((payload.status === "Won" || payload.status === "Quotation Submitted") && !payload.group) {
            toast.error("⚠️ Group Allotment Required: Please assign a group to this lead before marking it as Won.");
            return;
        }

        setIsSubmittingLead(true);
        try {
            if (editingLead) {
                await API.put(`/leads/${editingLead._id}`, payload);
            } else {
                await API.post("/leads", payload);
            }
            closeModal();
            fetchData();
        } catch (err) {
            console.error("Save Error:", err);
            const msg = err.response?.data?.message || "Failed to save";
            toast.error(msg);
        } finally {
            setIsSubmittingLead(false);
        }
    };


    const handleGroupSubmit = async (e) => {
        e.preventDefault();
        if (!groupName) return;
        try {
            const payload = {
                name: groupName,
                isVisible: groupVisible,
                isSecret: groupIsSecret,
                allowedUsers: groupAllowedUsers
            };

            if (editingGroup) {
                await API.put(`/groups/${editingGroup._id}`, payload);
                toast.success("Group updated");
            } else {
                await API.post("/groups", payload);
                toast.success("Group added");
            }
            setGroupName("");
            setGroupVisible(true);
            setGroupIsSecret(false);
            setGroupAllowedUsers([]);
            setEditingGroup(null);
            setIsGroupModalOpen(false);
            fetchData();
        } catch (err) {
            toast.error("Failed to save group");
        }
    };

    const handleGroupDelete = async (id) => {
        if (!window.confirm("Delete this group?")) return;
        try {
            await API.delete(`/groups/${id}`);
            setGroups(groups.filter(g => g._id !== id));
        } catch (err) {
            toast.error("Failed to delete group");
        }
    };

    const openGroupModal = (group = null) => {
        if (group) {
            setEditingGroup(group);
            setGroupName(group.name);
            setGroupVisible(group.isVisible !== undefined ? group.isVisible : true);
            setGroupIsSecret(group.isSecret || false);
            setGroupAllowedUsers(group.allowedUsers || []);
        } else {
            setEditingGroup(null);
            setGroupName("");
            setGroupVisible(true);
            setGroupIsSecret(false);
            setGroupAllowedUsers([]);
        }
        setIsGroupModalOpen(true);
    };

    const handleDelete = useCallback(async (id) => {
        if (!window.confirm("Delete this entry?")) return;
        try {
            await API.delete(`/leads/${id}`);
            // Optimistic update handled by socket, but can do it here too 
            // setLeads(leads.filter(l => l._id !== id));
        } catch (err) {
            toast.error("Failed to delete");
        }
    }, []);

    const handleWhatsAppClick = useCallback((lead) => {
        setWhatsAppLead(lead);
        setIsWhatsAppModalOpen(true);
    }, []);

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedLeads.length} selected leads?`)) return;
        try {
            await API.post("/leads/bulk-delete", { ids: selectedLeads });
            setSelectedLeads([]);
            // Socket will update the list
        } catch (err) {
            toast.error("Failed to delete leads");
        }
    };

    const openModal = useCallback((lead = null) => {
        if (lead) {
            setEditingLead(lead);
            setFormData({
                name: lead.name,
                phone: lead.phone,
                email: lead.email || "",
                status: lead.status || "New",
                source: lead.source || "Direct",
                group: lead.group?._id || lead.group || "",
                leadType: lead.leadType || "General",
                assignedTo: lead.assignedTo?._id || lead.assignedTo || "",
                notes: "" // Clear notes for adding new remark
            });
            if (lead.group) {
                API.get(`/clients?group=${lead.group?._id || lead.group}&limit=100`).then(res => setModalClients(res.data.clients)).catch(err => console.error(err));
            }
            setShowRemarksHistory(false); // Reset history view
        } else {
            setEditingLead(null);
            // Default Assignment for Staff
            let defaultAssign = "";
            if (userRole !== "admin" && userRole !== "superadmin") {
                const currentUserName = localStorage.getItem("name");
                const currentUserIdStr = localStorage.getItem("userId"); // Try getting direct ID from localStorage if available
                
                const currentUser = users.find(u => u.name === currentUserName || u._id === currentUserIdStr);
                if (currentUser) {
                    defaultAssign = currentUser._id;
                } else if (currentUserIdStr) {
                    defaultAssign = currentUserIdStr;
                }
            }

            setFormData({
                name: "",
                phone: "",
                email: "",
                status: "New",
                source: "Direct",
                group: "",
                leadType: "",
                assignedTo: defaultAssign,
                notes: ""
            });
            setModalClients([]);
        }
        setIsModalOpen(true);
    }, [userRole, users]);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setEditingLead(null);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "phone") {
            const numericValue = value.replace(/\D/g, "");
            if (numericValue.length <= 10) {
                setFormData({ ...formData, [name]: numericValue });
            }
        } else if (name === "group") {
            setFormData({ ...formData, [name]: value });
            if (value) {
                // Fetch all clients for this group specifically for the dropdown
                API.get(`/clients?group=${value}&limit=100`)
                    .then(res => {
                        setModalClients(res.data.clients || []);
                    })
                    .catch(err => console.error("Error fetching group clients:", err));
            } else {
                setModalClients([]);
            }
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const openViewModal = useCallback(async (lead) => {
        setViewingLead(lead);
        setIsViewModalOpen(true);
        try {
            const res = await API.get(`/leads/${lead._id}`);
            setViewingLead(res.data);
        } catch (err) {
            console.error("Error fetching lead details:", err);
        }
    }, []);

    const closeViewModal = () => {
        setIsViewModalOpen(false);
        setViewingLead(null);
    };

    const openClientViewModal = (client) => {
        setViewingClient(client);
        setIsClientViewModalOpen(true);
    };

    const closeClientViewModal = () => {
        setIsClientViewModalOpen(false);
        setViewingClient(null);
    };

    const openFollowUpModal = useCallback((item, type = "lead") => {
        setFollowUpItem(item);
        setFollowUpType(type);
        const now = new Date();
        const tzoffset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now - tzoffset)).toISOString().slice(0, 16);
        setFollowUpDate(localISOTime);
        setFollowUpRemark("");
        setIsFollowUpModalOpen(true);
    }, []);

    const closeFollowUpModal = useCallback(() => {
        setIsFollowUpModalOpen(false);
        setFollowUpItem(null);
        setFollowUpType("lead");
        setFollowUpDate("");
        setFollowUpRemark("");
    }, []);

    const handleFollowUpSubmit = async (e) => {
        e.preventDefault();
        if (!followUpItem || isSubmittingFollowUp) return;

        if (!followUpDate || !followUpRemark.trim()) {
            toast.error("Please fill in both the date and remark");
            return;
        }

        const wordCount = followUpRemark.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount > 100) {
            toast.error("Remark cannot exceed 100 words");
            return;
        }

        setIsSubmittingFollowUp(true);
        try {
            const url = followUpType === "quotation"
                ? `/quotations/${followUpItem._id}/followup`
                : `/leads/${followUpItem._id}/followup`;

            await API.post(url, {
                date: followUpDate,
                remark: followUpRemark.trim()
            });
            toast.success("Follow-up added successfully!");
            closeFollowUpModal();
            fetchData();
        } catch (err) {
            console.error("Follow-up Save Error:", err);
            const msg = err.response?.data?.message || "Failed to add follow-up";
            toast.error(msg);
        } finally {
            setIsSubmittingFollowUp(false);
        }
    };

    const printClientDetails = (client) => {
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>Client Details</title>');
        printWindow.document.write('<style>body { font-family: sans-serif; padding: 20px; } h1 { border-bottom: 2px solid #333; padding-bottom: 10px; } .section { margin-bottom: 20px; } .label { font-weight: bold; display: inline-block; width: 150px; } </style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(`<h1>${escapeHTML(client.clientName)}</h1>`);
        printWindow.document.write(`<div class="section"><p><span class="label">Group:</span> ${escapeHTML(client.group?.name || '-')}</p>`);
        printWindow.document.write(`<p><span class="label">Legal Entity:</span> ${escapeHTML(client.legalEntityName)}</p>`);
        printWindow.document.write(`<p><span class="label">GST/VAT:</span> ${escapeHTML(client.gstVatNo)}</p></div>`);

        printWindow.document.write('<h3>Billing Address</h3>');
        printWindow.document.write(`<p>${escapeHTML(client.billingAddress?.addressLine1)} ${escapeHTML(client.billingAddress?.addressLine2 || '')}<br>`);
        printWindow.document.write(`${escapeHTML(client.billingAddress?.city)}, ${escapeHTML(client.billingAddress?.distt)}<br>`);
        printWindow.document.write(`${escapeHTML(client.billingAddress?.state)} - ${escapeHTML(client.billingAddress?.zipCode)}<br>`);
        printWindow.document.write(`${escapeHTML(client.billingAddress?.country)}</p>`);

        if (client.dispatchAddress) {
            printWindow.document.write('<h3>Dispatch Address</h3>');
            if (client.isDispatchAddressSame) {
                printWindow.document.write('<p>Same as Billing Address</p>');
            } else {
                printWindow.document.write(`<p>${escapeHTML(client.dispatchAddress?.addressLine1)} ${escapeHTML(client.dispatchAddress?.addressLine2 || '')}<br>`);
                printWindow.document.write(`${escapeHTML(client.dispatchAddress?.city)}, ${escapeHTML(client.dispatchAddress?.distt)}<br>`);
                printWindow.document.write(`${escapeHTML(client.dispatchAddress?.state)} - ${escapeHTML(client.dispatchAddress?.zipCode)}<br>`);
                printWindow.document.write(`${escapeHTML(client.dispatchAddress?.country)}</p>`);
            }
        }

        printWindow.document.write('<h3>Contacts</h3>');
        printWindow.document.write(`<p><b>${escapeHTML(client.contactPerson1?.name)}</b> (${escapeHTML(client.contactPerson1?.designation)})<br>`);
        printWindow.document.write(`Phone: ${escapeHTML(client.contactPerson1?.phone)}<br>Email: ${escapeHTML(client.contactPerson1?.email)}</p>`);

        if (client.contactPerson2?.name) {
            printWindow.document.write(`<p><b>${escapeHTML(client.contactPerson2?.name)}</b> (${escapeHTML(client.contactPerson2?.designation)})<br>`);
            printWindow.document.write(`Phone: ${escapeHTML(client.contactPerson2?.phone)}<br>Email: ${escapeHTML(client.contactPerson2?.email)}</p>`);
        }

        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    };

    // Print Quotation
    const printQuotation = async (quotation) => {
        // Pre-load logo to base64 to ensure it shows in print window
        let logoBase64 = "/logo.png";
        try {
            const response = await fetch("/logo.png");
            if (response.ok) {
                const blob = await response.blob();
                logoBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            }
        } catch (error) {
            console.error("Failed to load logo for print:", error);
        }

        // Pre-load stamp to base64 to ensure it shows in print window
        let stampBase64 = "/stamp.png";
        try {
            const response = await fetch("/stamp.png");
            if (response.ok) {
                const blob = await response.blob();
                stampBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            }
        } catch (error) {
            console.error("Failed to load stamp for print:", error);
        }

        const isPI = quotation.quotationNumber?.startsWith("PI");
        
        // Custom filename format for print window to suggest perfect name on Save as PDF
        const clientName = quotation.billTo?.name || quotation.lead?.name || "Client";
        const firstWord = clientName.trim().split(/\s+/).at(0).replace(/[^a-zA-Z0-9_-]/g, "");
        
        let city = "";
        if (quotation.billTo?.address) {
            const parts = quotation.billTo.address.split(",").map(p => p.trim()).filter(Boolean);
            if (parts.length >= 3) {
                city = parts.at(-3);
            } else if (parts.length > 0) {
                city = parts.at(0);
            }
        }
        const safeCity = (city || "City").replace(/[^a-zA-Z0-9_-]/g, "");
        const safeDocNumber = quotation.quotationNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
        const suggestFilename = `${firstWord}_${safeCity}_${safeDocNumber}`;

        const printWindow = window.open('', '', 'height=800,width=1000');
        printWindow.document.write(`<html><head><title>${suggestFilename}</title>`);
        printWindow.document.write(`
            <style>
                body { font-family: 'Calibri', sans-serif; font-size: 10px; margin: 0; padding: 20px; color: #000; -webkit-print-color-adjust: exact; }
                .container { width: 100%; border: 2px solid #000; box-sizing: border-box; }
                
                /* Table Defaults */
                table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                th, td { border: 1px solid #000; padding: 3px; vertical-align: middle; word-wrap: break-word; }
                
                /* Header */
                .header-table td { border: none; border-bottom: 2px solid #000; vertical-align: top; padding: 5px; }
                .company-name { font-size: 16px; font-weight: bold; color: #1a237e; }
                .company-info { font-size: 10px; line-height: 1.2; }
                
                /* Info Blocks */
                .info-table td { border: 1px solid #000; font-size: 9px; vertical-align: top; }
                .info-label { font-weight: bold; background: #e0e0e0; padding: 2px; }
                
                /* Quotation Title */
                .title-row { text-align: center; font-weight: bold; font-size: 12px; border-bottom: 1px solid #000; padding: 2px; }
                
                /* Items Table */
                .items-table th { background-color: #f2f2f2; text-align: center; font-weight: bold; font-size: 9px; }
                .items-table td { font-size: 9px; }
                
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .bold { font-weight: bold; }
                
                /* Totals */
                .total-row td { font-weight: bold; background: #fff; }
                .grand-total td { background: #f2f2f2; }
                
                /* Terms */
                .terms-header { text-align: center; font-weight: bold; background: #fff; border-top: 2px solid #000; border-bottom: 1px solid #000; font-size: 10px; }
                .terms-table { font-size: 9px; width: 100%; }
                .terms-table td { border: 1px solid #000; padding: 2px 4px; }
                
                /* Footer */
                .footer { padding: 10px; margin-top: 10px; border-top: 2px solid #000; }
                .signatory { margin-top: 40px; font-weight: bold; }
                
                /* Utility */
                .no-border-bottom { border-bottom: none !important; }
                .no-border-top { border-top: none !important; }
            </style>
        `);
        printWindow.document.write('</head><body>');

        // Helper
        const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-GB') : '-';
        const formatMoney = (amount) => amount !== undefined && amount !== null ? Number(amount).toFixed(2) : '0.00';

        let html = '<div class="container">';

        // --- 1. Header Section ---
        html += `<table class="header-table">
            <tr>
                <td style="width: 65%; border-right: 2px solid #000;">
                    <div class="company-name">TeamInspire Business Solutions Pvt Ltd</div>
                    <div class="company-info">D730/29, Street No. 11, Ashok Nagar, Shahdara, Delhi, 110093, India</div>
                    <div class="company-info">E: deepak.gupta@teaminspire.co.in, spares@teaminspire.co.in</div>
                    <div class="company-info">Contact No. +91 9013589766, +91 9560825111</div>
                    <div class="company-info"><b>GSTIN: 07AAFCT5822P1ZT</b></div>
                </td>
                <td style="width: 35%; text-align: center; vertical-align: middle;">
                     <img src="${logoBase64}" alt="TeamInspire" style="max-width: 200px; height: auto; margin-bottom: 5px;" />
                </td>
            </tr>
        </table>`;

        // --- 2. Bill To / Ship To / Snapshot ---
        html += `<table class="info-table">
            <tr>
                <td style="width: 37.5%; border-bottom: 1px solid #000;" class="bold">BILL TO:</td>
                <td style="width: 37.5%; border-bottom: 1px solid #000;" class="bold">SHIP TO:</td>
                <td style="width: 10%;" class="bold">No.</td>
                <td style="width: 15%;">${escapeHTML(quotation.quotationNumber || '-')}</td>
            </tr>
            <tr>
                <td style="vertical-align: top; height: 60px; border-bottom: 1px solid #000;">
                    <div style="font-weight:bold; text-transform:uppercase;">${escapeHTML(quotation.billTo?.name || "")}</div>
                    <div>${escapeHTML(quotation.billTo?.address || "")}</div>
                </td>
                <td style="vertical-align: top; border-bottom: 1px solid #000;">
                    <div style="font-weight:bold; text-transform:uppercase;">${escapeHTML(quotation.shipTo?.name || "")}</div>
                    <div>${escapeHTML(quotation.shipTo?.address || "")}</div>
                </td>
                <td class="bold">Date</td>
                <td>${formatDate(quotation.createdAt)}</td>
            </tr>
            <tr>
                <td class="bold">GSTIN: ${escapeHTML(quotation.billTo?.gstin || "")}</td>
                <td class="bold">GSTIN: ${escapeHTML(quotation.shipTo?.gstin || "")}</td>
                ${isPI ? `<td class="bold">Lead No.</td><td>${escapeHTML(quotation.lead?.leadNumber || quotation.leadNumber || "-")}</td>` : `<td class="bold">Rev. No. / Date</td><td>${quotation.revisionNo > 0 ? `RN ${quotation.revisionNo} / ${formatDate(quotation.updatedAt)}` : "-"}</td>`}
            </tr>
            ${isPI && quotation.poNumber ? `
            <tr>
                <td class="bold" style="border-top: 1px solid #000;">PO No.</td>
                <td style="border-top: 1px solid #000;">${escapeHTML(quotation.poNumber || '-')}</td>
                <td class="bold" style="border-top: 1px solid #000;">PO Date</td>
                <td style="border-top: 1px solid #000;">${quotation.poDate ? formatDate(quotation.poDate) : '-'}</td>
            </tr>
            ` : ''}
        </table>`;

        // --- 3. Quotation Title ---
        const documentTitle = (quotation.quotationNumber && quotation.quotationNumber.startsWith("PI")) ? "PROFORMA INVOICE" : "QUOTATION";
        html += `<div class="title-row">${documentTitle}</div>`;

        // --- 4. Items Table ---
        html += `<table class="items-table">
            <thead>
                <tr>
                    <th style="width: 3%;">Sl. No.</th>
                    <th style="width: 8%;">Brand</th>
                    <th style="width: 12%;">Model No/Part Code</th>
                    <th style="width: 20%;">Description</th>
                    <th style="width: 8%;">HSN Code</th>
                    <th style="width: 5%;">UOM</th>
                    <th style="width: 5%;">QTY</th>
                    <th style="width: 8%;">Unit Rate (₹)</th>
                    <th style="width: 9%;">Taxable Value (₹)</th>
                    <th style="width: 5%;">GST Rate (%)</th>
                    <th style="width: 8%;">GST Value (₹)</th>
                    <th style="width: 9%;">Total Value (₹)</th>
                </tr>
            </thead>
            <tbody>`;

        quotation.products.forEach((p, index) => {
            html += `<tr>
                <td class="text-center">${index + 1}</td>
                <td class="text-center">${escapeHTML(p.brand || '')}</td>
                <td class="text-center">${escapeHTML(p.product?.productNo || p.productNo || '')}</td>
                <td>${escapeHTML(p.product?.name || p.name || '')}</td>
                <td class="text-center">${escapeHTML(p.hsnCode || '')}</td>
                <td class="text-center">${escapeHTML(p.uom || 'PCS')}</td>
                <td class="text-center">${p.quantity}</td>
                <td class="text-right">${formatMoney(p.unitPrice)}</td>
                <td class="text-right">${formatMoney(p.taxableAmount || (p.quantity * p.unitPrice))}</td>
                <td class="text-center">${p.gstRate || 0}</td>
                <td class="text-right">${formatMoney(p.gstAmount || (p.quantity * p.unitPrice * (p.gstRate || 0) / 100))}</td>
                <td class="text-right">${formatMoney(p.total)}</td>
            </tr>`;
        });

        // Loop to fill empty rows if needed (Optional, skipping for dynamic height)

        // Itemised Total
        const totalQty = quotation.products.reduce((acc, p) => acc + Number(p.quantity || 0), 0);
        const totalTaxable = quotation.products.reduce((acc, p) => acc + (p.taxableAmount || p.quantity * p.unitPrice), 0);
        const totalGst = quotation.products.reduce((acc, p) => acc + (p.gstAmount || (p.quantity * p.unitPrice * (p.gstRate || 0) / 100)), 0);
        const totalVal = quotation.products.reduce((acc, p) => acc + p.total, 0);

        html += `<tr class="total-row">
            <td colspan="6" class="text-right">Itemised Total</td>
            <td class="text-center">${totalQty}</td>
            <td></td>
            <td class="text-right">${formatMoney(totalTaxable)}</td>
            <td></td>
            <td class="text-right">${formatMoney(totalGst)}</td>
            <td class="text-right">${formatMoney(totalVal)}</td>
        </tr>`;

        // Services: Installation
        const charges = quotation.additionalCharges || { installation: 0, freight: 0 };
        if (charges.installation > 0) {
            const gst = charges.installation * 0.18;
            html += `<tr>
                <td colspan="6" class="bold">INSTALLATION/SERVICE CHARGES</td>
                <td class="text-center">1</td>
                <td class="text-right">${formatMoney(charges.installation)}</td>
                <td class="text-right">${formatMoney(charges.installation)}</td>
                <td class="text-center">18</td>
                <td class="text-right">${formatMoney(gst)}</td>
                <td class="text-right">${formatMoney(charges.installation + gst)}</td>
            </tr>`;
        }

        // Services: Freight
        if (charges.freight > 0) {
            const gst = charges.freight * 0.18;
            html += `<tr>
                <td colspan="6" class="bold">CARTAGE/FREIGHT/INSURANCE</td>
                <td class="text-center">1</td>
                <td class="text-right">${formatMoney(charges.freight)}</td>
                <td class="text-right">${formatMoney(charges.freight)}</td>
                <td class="text-center">18</td>
                <td class="text-right">${formatMoney(gst)}</td>
                <td class="text-right">${formatMoney(charges.freight + gst)}</td>
            </tr>`;
        }

        // Final Totals Block
        // Sub Total should show the actual unrounded total amount (Taxable + GST)
        const subTotal = (quotation.subTotal !== undefined && quotation.gstTotal !== undefined) 
            ? (quotation.subTotal + quotation.gstTotal) 
            : (totalVal + (charges.installation * 1.18) + (charges.freight * 1.18));
            
        const displayGrandTotal = Math.round(subTotal);
        const roundOff = quotation.roundOff !== undefined ? quotation.roundOff : (displayGrandTotal - subTotal);

        html += `<tr>
            <td colspan="10" class="text-right bold no-border-bottom">Sub Total</td>
            <td colspan="2" class="text-right bold">${formatMoney(subTotal)}</td>
        </tr>`;
        html += `<tr>
            <td colspan="10" class="text-right bold no-border-bottom no-border-top">Round Off (+/-)</td>
            <td colspan="2" class="text-right bold">${formatMoney(roundOff)}</td>
        </tr>`;
        html += `<tr class="grand-total">
            <td colspan="10" class="text-right bold border-top" style="border-top: 2px solid #000;">Grand Total</td>
            <td colspan="2" class="text-right bold border-top" style="border-top: 2px solid #000;">${formatMoney(displayGrandTotal)}</td>
        </tr>`;

        html += `</tbody></table>`;

        // --- 5. Terms & Conditions ---
        const terms = quotation.terms || {};

        html += `<div class="terms-header">Terms & Conditions:</div>`;
        html += `<table class="terms-table">
            <tr>
                <td style="width: 5%; text-align: center;" class="bold">1</td>
                <td style="width: 15%;" class="bold">Delivery Lead Time</td>
                <td>${escapeHTML(terms.deliveryLeadTime || '-')}</td>
            </tr>
            <tr>
                <td style="text-align: center;" class="bold">2</td>
                <td class="bold">Payment</td>
                <td>${escapeHTML(terms.payment || '-')}</td>
            </tr>
            <tr>
                <td style="text-align: center;" class="bold">3</td>
                <td class="bold">Warranty Terms</td>
                <td style="padding: 0; vertical-align: stretch;">
                    ${(() => {
                        const wText = terms.warranty || '';
                        const idx = wText.indexOf("No warranty on spare parts.");
                        if (idx !== -1) {
                            const p1 = wText.substring(0, idx).trim();
                            const p2 = wText.substring(idx).trim();
                            return `
                                <div style="padding: 3px; border-bottom: 1px solid #000;">${escapeHTML(p1)}</div>
                                <div style="padding: 3px;">${escapeHTML(p2)}</div>
                            `;
                        }
                        return `<div style="padding: 3px;">${escapeHTML(wText || '-')}</div>`;
                    })()}
                </td>
            </tr>
            <tr>
                <td style="text-align: center;" class="bold">4</td>
                <td class="bold">Delivery Terms</td>
                <td>${escapeHTML(terms.deliveryTerms || '-')}</td>
            </tr>
             <tr>
                <td style="text-align: center;" class="bold">5</td>
                <td class="bold">Note</td>
                <td>Road permit will be as applicable in respective states.</td>
            </tr>
             <tr>
                <td style="text-align: center;" class="bold">6</td>
                <td class="bold">Validity</td>
                <td>${escapeHTML(terms.validity || "30 Days from the date of PI.")}</td>
            </tr>
             <tr>
                <td style="text-align: center;" class="bold">7</td>
                <td class="bold">GST</td>
                <td>Any GST additional liability arising due to changes in billing location, place of supply and GST applicability after PO shall be to customer's account.</td>
            </tr>
             <tr>
                <td style="text-align: center;" class="bold">8</td>
                <td class="bold">Packaging</td>
                <td>Standard original OEM/Supplier packaging. If Wooden packing is required, will charged seperately on actual basis.</td>
            </tr>
             <tr>
                <td style="text-align: center;" class="bold">9</td>
                <td class="bold">HS Code</td>
                <td>HSN codes and GST rates are subject to Govt/GST rules, regulations, notifications, circulars, court or tribunal judgements, legal interpretation etc and subject to change from time to time/ as applicable without prior notice. Prevailing classification and GST rates at the time of transaction will apply.</td>
            </tr>
             <tr>
                <td style="text-align: center;" class="bold">10</td>
                <td class="bold">Bank Details</td>
                <td><b>Bank Name:</b> ICICI Bank Ltd, <b>Account Number:</b> 135505500940, <b>Bank Account Name:</b> TeamInspire Business Solutions Pvt Ltd, <b>IFSC/RTGS Number:</b> ICIC0001355</td>
            </tr>
             <tr>
                <td style="text-align: center;" class="bold">11</td>
                <td class="bold">Special Note</td>
                <td>In-view of the current Global Shipping Scenario, the shipments may be a subject to delay which is out of human control and thus the same shall be covered under the Force Majeure Clause.<br>
                Price quoted is valid if the order issued for all the quoted items with the same quantity. Any change in quantity/order can be discussed case to case basis.</td>
            </tr>
             <tr>
                <td style="text-align: center;" class="bold">12</td>
                <td class="bold">Remarks</td>
                <td>${escapeHTML(terms.remark || '')}</td>
            </tr>
        </table>`;

        html += `<div style="padding: 10px; margin-top: 10px; font-weight: bold; font-size: 14px; position: relative;">`;
        html += `For TeamInspire Business Solutions Pvt Ltd`;
        html += `<div style="position: absolute; left: 80px; top: 32px; z-index: 10;">`;
        html += `<img src="${stampBase64}" alt="Stamp" style="width: 85px; height: 85px;" />`;
        html += `</div>`;
        html += `</div>`;
        html += `<div style="height: 80px;"></div>`; // Space for signature
        html += `<div style="padding: 10px; font-weight: bold;">Authorized Signatory</div>`;

        html += '</div></body></html>';

        printWindow.document.write(html);
        printWindow.document.close();

        // Wait for image to render if base64 before print
        if (logoBase64.startsWith('data:')) {
            setTimeout(() => printWindow.print(), 500);
        } else {
            // If still a relative path, might differ
            setTimeout(() => printWindow.print(), 1000);
        }
    };

    // Download Quotation
    const downloadQuotation = async (quotation) => {
        // Pre-load logo to base64 to ensure it shows in PDF
        let logoBase64 = "/logo.png";
        try {
            const response = await fetch("/logo.png");
            if (response.ok) {
                const blob = await response.blob();
                logoBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            }
        } catch (error) {
            console.error("Failed to load logo for PDF download:", error);
        }

        // Pre-load stamp to base64 to ensure it shows in PDF
        let stampBase64 = "/stamp.png";
        try {
            const response = await fetch("/stamp.png");
            if (response.ok) {
                const blob = await response.blob();
                stampBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            }
        } catch (error) {
            console.error("Failed to load stamp for PDF download:", error);
        }

        const isPI = quotation.quotationNumber?.startsWith("PI");
        
        // Custom filename format: ClientName(firstWord)_City_DocNumber.pdf
        const clientName = quotation.billTo?.name || quotation.lead?.name || "Client";
        const firstWord = clientName.trim().split(/\s+/).at(0).replace(/[^a-zA-Z0-9_-]/g, "");
        
        let city = "";
        if (quotation.billTo?.address) {
            const parts = quotation.billTo.address.split(",").map(p => p.trim()).filter(Boolean);
            if (parts.length >= 3) {
                city = parts.at(-3);
            } else if (parts.length > 0) {
                city = parts.at(0);
            }
        }
        const safeCity = (city || "City").replace(/[^a-zA-Z0-9_-]/g, "");
        const safeDocNumber = quotation.quotationNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
        const filename = `${firstWord}_${safeCity}_${safeDocNumber}.pdf`;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '800px';
        iframe.style.height = '1200px';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        iframe.style.zIndex = '-9999';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;


        // Helper
        const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-GB') : '-';
        const formatMoney = (amount) => amount !== undefined && amount !== null ? Number(amount).toFixed(2) : '0.00';

        let html = `
            <style>
                .pdf-container {
                    width: 730px;
                    border: 2px solid #000;
                    box-sizing: border-box;
                    font-family: 'Calibri', sans-serif;
                    font-size: 10px;
                    color: #000;
                    background: #fff;
                }
                
                /* Table Defaults */
                table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    table-layout: fixed;
                }
                
                /* Outer borders for tables to avoid collapse bugs in html2canvas */
                .info-table, .items-table, .terms-table {
                    border-top: 1px solid #000;
                    border-left: 1px solid #000;
                }
                
                /* Inner borders for tables to avoid collapse bugs in html2canvas */
                .info-table td, .items-table th, .items-table td, .terms-table td {
                    border: none;
                    border-right: 1px solid #000;
                    border-bottom: 1px solid #000;
                    padding: 3px;
                    vertical-align: middle;
                    word-wrap: break-word;
                    box-sizing: border-box;
                }
                
                /* Header Table (no outer border) */
                .header-table {
                    border-collapse: collapse;
                }
                .header-table td {
                    border: none;
                    border-bottom: 2px solid #000;
                    vertical-align: top;
                    padding: 5px;
                }
                .company-name { font-size: 16px; font-weight: bold; color: #1a237e; }
                .company-info { font-size: 10px; line-height: 1.2; }
                
                .info-label { font-weight: bold; background: #e0e0e0; padding: 2px; }
                
                /* Quotation Title */
                .title-row {
                    text-align: center;
                    font-weight: bold;
                    font-size: 12px;
                    border-bottom: 1px solid #000;
                    padding: 2px;
                    border-left: 1px solid #000;
                    border-right: 1px solid #000;
                }
                
                /* Items Table Specifics */
                .items-table th { background-color: #f2f2f2; text-align: center; font-weight: bold; font-size: 9px; }
                .items-table td { font-size: 9px; }
                
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .bold { font-weight: bold; }
                
                /* Totals */
                .total-row td { font-weight: bold; background: #fff; }
                .grand-total td { background: #f2f2f2; }
                
                /* Terms Specifics */
                .terms-header {
                    text-align: center;
                    font-weight: bold;
                    background: #fff;
                    border-top: 2px solid #000;
                    border-bottom: 1px solid #000;
                    border-left: 1px solid #000;
                    border-right: 1px solid #000;
                    font-size: 10px;
                }
                .terms-table { font-size: 9px; width: 100%; }
                
                /* Footer */
                .footer { padding: 10px; margin-top: 10px; border-top: 2px solid #000; }
                .signatory { margin-top: 40px; font-weight: bold; }
                
                /* Utility */
                .no-border-bottom { border-bottom: none !important; }
                .no-border-top { border-top: none !important; }
            </style>
            <div class="pdf-container">
        `;

        // --- 1. Header Section ---
        // --- 1. Header Section ---
        html += `<table class="header-table">
            <tr>
                <td style="width: 65%; border-right: 2px solid #000;">
                    <div class="company-name">TeamInspire Business Solutions Pvt Ltd</div>
                    <div class="company-info">D730/29, Street No. 11, Ashok Nagar, Shahdara, Delhi, 110093, India</div>
                    <div class="company-info">E: deepak.gupta@teaminspire.co.in, spares@teaminspire.co.in</div>
                    <div class="company-info">Contact No. +91 9013589766, +91 9560825111</div>
                    <div class="company-info"><b>GSTIN: 07AAFCT5822P1ZT</b></div>
                </td>
                <td style="width: 35%; text-align: center; vertical-align: middle;">
                     <img src="${logoBase64}" alt="TeamInspire" style="max-width: 200px; height: auto; margin-bottom: 5px;" />
                </td>
            </tr>
        </table>`;

        // --- 2. Bill To / Ship To / Snapshot ---
        html += `<table class="info-table">
            <tr>
                <td style="width: 37.5%; border-bottom: 1px solid #000;" class="bold">BILL TO:</td>
                <td style="width: 37.5%; border-bottom: 1px solid #000;" class="bold">SHIP TO:</td>
                <td style="width: 10%;" class="bold">No.</td>
                <td style="width: 15%;">${escapeHTML(quotation.quotationNumber || '-')}</td>
            </tr>
            <tr>
                <td style="vertical-align: top; height: 60px; border-bottom: 1px solid #000;">
                    <div style="font-weight:bold; text-transform:uppercase;">${escapeHTML(quotation.billTo?.name || "")}</div>
                    <div>${escapeHTML(quotation.billTo?.address || "")}</div>
                </td>
                <td style="vertical-align: top; border-bottom: 1px solid #000;">
                    <div style="font-weight:bold; text-transform:uppercase;">${escapeHTML(quotation.shipTo?.name || "")}</div>
                    <div>${escapeHTML(quotation.shipTo?.address || "")}</div>
                </td>
                <td class="bold">Date</td>
                <td>${formatDate(quotation.createdAt)}</td>
            </tr>
            <tr>
                <td class="bold">GSTIN: ${escapeHTML(quotation.billTo?.gstin || "")}</td>
                <td class="bold">GSTIN: ${escapeHTML(quotation.shipTo?.gstin || "")}</td>
                ${isPI ? `<td class="bold">Lead No.</td><td>${escapeHTML(quotation.lead?.leadNumber || quotation.leadNumber || "-")}</td>` : `<td class="bold">Rev. No. / Date</td><td>${quotation.revisionNo > 0 ? `RN ${quotation.revisionNo} / ${formatDate(quotation.updatedAt)}` : "-"}</td>`}
            </tr>
            ${isPI && quotation.poNumber ? `
            <tr>
                <td class="bold" style="border-top: 1px solid #000;">PO No.</td>
                <td style="border-top: 1px solid #000;">${escapeHTML(quotation.poNumber || '-')}</td>
                <td class="bold" style="border-top: 1px solid #000;">PO Date</td>
                <td style="border-top: 1px solid #000;">${quotation.poDate ? formatDate(quotation.poDate) : '-'}</td>
            </tr>
            ` : ''}
        </table>`;

        // --- 3. Quotation Title ---
        const documentTitle = (quotation.quotationNumber && quotation.quotationNumber.startsWith("PI")) ? "PROFORMA INVOICE" : "QUOTATION";
        html += `<div class="title-row">${documentTitle}</div>`;

        // --- 4. Items Table ---
        html += `<table class="items-table">
            <thead>
                <tr>
                    <th style="width: 3%;">Sl. No.</th>
                    <th style="width: 8%;">Brand</th>
                    <th style="width: 12%;">Model No/Part Code</th>
                    <th style="width: 20%;">Description</th>
                    <th style="width: 8%;">HSN Code</th>
                    <th style="width: 5%;">UOM</th>
                    <th style="width: 5%;">QTY</th>
                    <th style="width: 8%;">Unit Rate (₹)</th>
                    <th style="width: 9%;">Taxable Value (₹)</th>
                    <th style="width: 5%;">GST Rate (%)</th>
                    <th style="width: 8%;">GST Value (₹)</th>
                    <th style="width: 9%;">Total Value (₹)</th>
                </tr>
            </thead>
            <tbody>`;

        quotation.products.forEach((p, index) => {
            html += `<tr>
                <td class="text-center">${index + 1}</td>
                <td class="text-center">${escapeHTML(p.brand || '')}</td>
                <td class="text-center">${escapeHTML(p.product?.productNo || p.productNo || '')}</td>
                <td>${escapeHTML(p.product?.name || p.name || '')}</td>
                <td class="text-center">${escapeHTML(p.hsnCode || '')}</td>
                <td class="text-center">${escapeHTML(p.uom || 'PCS')}</td>
                <td class="text-center">${p.quantity}</td>
                <td class="text-right">${formatMoney(p.unitPrice)}</td>
                <td class="text-right">${formatMoney(p.taxableAmount || (p.quantity * p.unitPrice))}</td>
                <td class="text-center">${p.gstRate || 0}</td>
                <td class="text-right">${formatMoney(p.gstAmount || (p.quantity * p.unitPrice * (p.gstRate || 0) / 100))}</td>
                <td class="text-right">${formatMoney(p.total)}</td>
            </tr>`;
        });

        // Itemised Total
        const totalQty = quotation.products.reduce((acc, p) => acc + Number(p.quantity || 0), 0);
        const totalTaxable = quotation.products.reduce((acc, p) => acc + (p.taxableAmount || p.quantity * p.unitPrice), 0);
        const totalGst = quotation.products.reduce((acc, p) => acc + (p.gstAmount || (p.quantity * p.unitPrice * (p.gstRate || 0) / 100)), 0);
        const totalVal = quotation.products.reduce((acc, p) => acc + p.total, 0);

        html += `<tr class="total-row">
            <td colspan="6" class="text-right">Itemised Total</td>
            <td class="text-center">${totalQty}</td>
            <td></td>
            <td class="text-right">${formatMoney(totalTaxable)}</td>
            <td></td>
            <td class="text-right">${formatMoney(totalGst)}</td>
            <td class="text-right">${formatMoney(totalVal)}</td>
        </tr>`;

        // Services: Installation
        const charges = quotation.additionalCharges || { installation: 0, freight: 0 };
        if (charges.installation > 0) {
            const gst = charges.installation * 0.18;
            html += `<tr>
                <td colspan="6" class="bold">INSTALLATION/SERVICE CHARGES</td>
                <td class="text-center">1</td>
                <td class="text-right">${formatMoney(charges.installation)}</td>
                <td class="text-right">${formatMoney(charges.installation)}</td>
                <td class="text-center">18</td>
                <td class="text-right">${formatMoney(gst)}</td>
                <td class="text-right">${formatMoney(charges.installation + gst)}</td>
            </tr>`;
        }

        // Services: Freight
        if (charges.freight > 0) {
            const gst = charges.freight * 0.18;
            html += `<tr>
                <td colspan="6" class="bold">CARTAGE/FREIGHT/INSURANCE</td>
                <td class="text-center">1</td>
                <td class="text-right">${formatMoney(charges.freight)}</td>
                <td class="text-right">${formatMoney(charges.freight)}</td>
                <td class="text-center">18</td>
                <td class="text-right">${formatMoney(gst)}</td>
                <td class="text-right">${formatMoney(charges.freight + gst)}</td>
            </tr>`;
        }

        // Final Totals Block
        const subTotal = (quotation.subTotal !== undefined && quotation.gstTotal !== undefined) 
            ? (quotation.subTotal + quotation.gstTotal) 
            : (totalVal + (charges.installation * 1.18) + (charges.freight * 1.18));
            
        const displayGrandTotal = Math.round(subTotal);
        const roundOff = quotation.roundOff !== undefined ? quotation.roundOff : (displayGrandTotal - subTotal);

        html += `<tr>
            <td colspan="10" class="text-right bold no-border-bottom">Sub Total</td>
            <td colspan="2" class="text-right bold">${formatMoney(subTotal)}</td>
        </tr>`;
        html += `<tr>
            <td colspan="10" class="text-right bold no-border-bottom no-border-top">Round Off (+/-)</td>
            <td colspan="2" class="text-right bold">${formatMoney(roundOff)}</td>
        </tr>`;
        html += `<tr class="grand-total">
            <td colspan="10" class="text-right bold border-top" style="border-top: 2px solid #000;">Grand Total</td>
            <td colspan="2" class="text-right bold border-top" style="border-top: 2px solid #000;">${formatMoney(displayGrandTotal)}</td>
        </tr>`;

        html += `</tbody></table>`;

        // --- 5. Terms & Conditions ---
        const terms = quotation.terms || {};

        html += `<div class="terms-header">Terms & Conditions:</div>`;
        html += `<table class="terms-table">
            <tr>
                <td style="width: 5%; text-align: center;" class="bold">1</td>
                <td style="width: 15%;" class="bold">Delivery Lead Time</td>
                <td>${escapeHTML(terms.deliveryLeadTime || '-')}</td>
            </tr>
            <tr>
                <td style="text-align: center;" class="bold">2</td>
                <td class="bold">Payment</td>
                <td>${escapeHTML(terms.payment || '-')}</td>
            </tr>
            <tr>
                <td style="text-align: center;" class="bold">3</td>
                <td class="bold">Warranty Terms</td>
                <td style="padding: 0; vertical-align: stretch;">
                    ${(() => {
                        const wText = terms.warranty || '';
                        const idx = wText.indexOf("No warranty on spare parts.");
                        if (idx !== -1) {
                            const p1 = wText.substring(0, idx).trim();
                            const p2 = wText.substring(idx).trim();
                            return `
                                <div style="padding: 3px; border-bottom: 1px solid #000;">${escapeHTML(p1)}</div>
                                <div style="padding: 3px;">${escapeHTML(p2)}</div>
                            `;
                        }
                        return `<div style="padding: 3px;">${escapeHTML(wText || '-')}</div>`;
                    })()}
                </td>
            </tr>
            <tr>
                <td style="text-align: center;" class="bold">4</td>
                <td class="bold">Delivery Terms</td>
                <td>${escapeHTML(terms.deliveryTerms || '-')}</td>
            </tr>
             <tr>
                <td style="text-align: center;" class="bold">5</td>
                <td class="bold">Note</td>
                <td>Road permit will be as applicable in respective states.</td>
            </tr>
             <tr>
                <td style="text-align: center;" class="bold">6</td>
                <td class="bold">Validity</td>
                <td>${escapeHTML(terms.validity || "30 Days from the date of PI.")}</td>
            </tr>
             <tr>
                <td style="text-align: center;" class="bold">7</td>
                <td class="bold">GST</td>
                <td>Any GST additional liability arising due to changes in billing location, place of supply and GST applicability after PO shall be to customer's account.</td>
            </tr>
             <tr>
                <td style="text-align: center;" class="bold">8</td>
                <td class="bold">Packaging</td>
                <td>Standard original OEM/Supplier packaging. If Wooden packing is required, will charged seperately on actual basis.</td>
            </tr>
             <tr>
                <td style="text-align: center;" class="bold">9</td>
                <td class="bold">HS Code</td>
                <td>HSN codes and GST rates are subject to Govt/GST rules, regulations, notifications, circulars, court or tribunal judgements, legal interpretation etc and subject to change from time to time/ as applicable without prior notice. Prevailing classification and GST rates at the time of transaction will apply.</td>
            </tr>
             <tr>
                <td style="text-align: center;" class="bold">10</td>
                <td class="bold">Bank Details</td>
                <td><b>Bank Name:</b> ICICI Bank Ltd, <b>Account Number:</b> 135505500940, <b>Bank Account Name:</b> TeamInspire Business Solutions Pvt Ltd, <b>IFSC/RTGS Number:</b> ICIC0001355</td>
            </tr>
             <tr>
                <td style="text-align: center;" class="bold">11</td>
                <td class="bold">Special Note</td>
                <td>In-view of the current Global Shipping Scenario, the shipments may be a subject to delay which is out of human control and thus the same shall be covered under the Force Majeure Clause.<br>
                Price quoted is valid if the order issued for all the quoted items with the same quantity. Any change in quantity/order can be discussed case to case basis.</td>
            </tr>
             <tr>
                <td style="text-align: center;" class="bold">12</td>
                <td class="bold">Remarks</td>
                <td>${escapeHTML(terms.remark || '')}</td>
            </tr>
        </table>`;

        html += `<div style="padding: 10px; margin-top: 10px; font-weight: bold; font-size: 14px; position: relative;">`;
        html += `For TeamInspire Business Solutions Pvt Ltd`;
        html += `<div style="position: absolute; left: 80px; top: 32px; z-index: 10;">`;
        html += `<img src="${stampBase64}" alt="Stamp" style="width: 85px; height: 85px;" />`;
        html += `</div>`;
        html += `</div>`;
        html += `<div style="height: 80px;"></div>`; 
        html += `<div style="padding: 10px; font-weight: bold;">Authorized Signatory</div>`;

        html += '</div>';
        
        iframeDoc.open();
        iframeDoc.write(`
            <html>
            <head>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background: #fff;
                        color: #000;
                        font-family: 'Calibri', sans-serif;
                        font-size: 10px;
                        width: 730px;
                        box-sizing: border-box;
                    }
                </style>
            </head>
            <body>
                ${html}
            </body>
            </html>
        `);
        iframeDoc.close();

        const opt = {
            margin:       [8, 8, 8, 8], // top, left, bottom, right in mm
            filename:     filename,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2.5, useCORS: true, letterRendering: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        try {
            const toastId = toast.loading("Generating PDF file with premium formatting...");
            
            // Dynamic import of html2pdf.js to avoid bundle load crashes in production
            const html2pdfModule = await import("html2pdf.js");
            const html2pdf = html2pdfModule.default || html2pdfModule;

            // Wait for all images inside iframe to complete loading to avoid blank images
            const images = iframeDoc.getElementsByTagName('img');
            await Promise.all(Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));

            await html2pdf().set(opt).from(iframeDoc.body).save();
            toast.success("PDF Downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error("PDF generation error:", err);
            toast.error("Failed to generate PDF");
        } finally {
            document.body.removeChild(iframe);
        }
    };


    // Client Handlers
    const handleClientChange = (e, section = null) => {
        const { name, value, type, checked } = e.target;
        const val = type === "checkbox" ? checked : value;

        setClientFormData(prev => {
            const newData = { ...prev };

            if (section) {
                // Determine which address or contact sub-object we are updating
                if (section === "billingAddress" || section === "dispatchAddress") {
                    const addr = section === "billingAddress" ? { ...prev.billingAddress } : { ...prev.dispatchAddress };
                    if (name === "state") {
                        addr.state = val;
                        addr.distt = "";
                        addr.city = "";
                    } else if (name === "distt") {
                        addr.distt = val;
                        addr.city = "";
                    } else {
                        if (name === "addressLine1") addr.addressLine1 = val;
                        else if (name === "addressLine2") addr.addressLine2 = val;
                        else if (name === "city") addr.city = val;
                        else if (name === "zipCode") addr.zipCode = val;
                        else if (name === "country") addr.country = val;
                    }
                    if (section === "billingAddress") {
                        newData.billingAddress = addr;
                    } else {
                        newData.dispatchAddress = addr;
                    }
                } else if (section === "contactPerson1" || section === "contactPerson2") {
                    const contact = section === "contactPerson1" ? { ...prev.contactPerson1 } : { ...prev.contactPerson2 };
                    if (name === "name") contact.name = val;
                    else if (name === "designation") contact.designation = val;
                    else if (name === "phone") contact.phone = val;
                    else if (name === "email") contact.email = val;

                    if (section === "contactPerson1") {
                        newData.contactPerson1 = contact;
                    } else {
                        newData.contactPerson2 = contact;
                    }
                }
            } else {
                if (name === "clientName") newData.clientName = val;
                else if (name === "legalEntityName") newData.legalEntityName = val;
                else if (name === "gstVatNo") newData.gstVatNo = val;
                else if (name === "group") newData.group = val;
                else if (name === "isDispatchAddressSame") newData.isDispatchAddressSame = val;
            }
            return newData;
        });
    };

    const handleClientSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...clientFormData,
                billingAddress: { ...clientFormData.billingAddress, country: "India" },
                dispatchAddress: { ...clientFormData.dispatchAddress, country: "India" },
                isSecret: clientIsSecret,
                allowedUsers: clientAllowedUsers
            };

            if (editingClient) {
                await API.put(`/clients/${editingClient._id}`, payload);
                toast.success("Client updated successfully");
            } else {
                await API.post("/clients", payload);
                toast.success("Client added successfully");
            }
            setShowClientModal(false);
            setEditingClient(null);
            setClientFormData({
                group: "",
                clientName: "",
                legalEntityName: "",
                billingAddress: { addressLine1: "", addressLine2: "", city: "", distt: "", state: "", zipCode: "", country: "" },
                gstVatNo: "",
                contactPerson1: { name: "", designation: "", phone: "", email: "" },
                contactPerson2: { name: "", designation: "", phone: "", email: "" },
                isDispatchAddressSame: false,
                dispatchAddress: { addressLine1: "", addressLine2: "", city: "", distt: "", state: "", zipCode: "", country: "" },
                isVisible: true
            });
            setClientIsSecret(false);
            setClientAllowedUsers([]);
            fetchData();
        } catch (err) {
            console.error("Client Save Error:", err);
            toast.error("Failed to save client");
        }
    };

    const handleEditClient = (client) => {
        setEditingClient(client);

        const safeFormData = {
            ...client,
            group: client.group?._id || client.group || "",
            clientName: client.clientName || "",
            legalEntityName: client.legalEntityName || "",
            billingAddress: {
                addressLine1: client.billingAddress?.addressLine1 || "",
                addressLine2: client.billingAddress?.addressLine2 || "",
                city: client.billingAddress?.city || "",
                distt: client.billingAddress?.distt || "",
                state: client.billingAddress?.state || "",
                zipCode: client.billingAddress?.zipCode || "",
                country: client.billingAddress?.country || ""
            },
            gstVatNo: client.gstVatNo || "",
            contactPerson1: {
                name: client.contactPerson1?.name || "",
                designation: client.contactPerson1?.designation || "",
                phone: client.contactPerson1?.phone || "",
                email: client.contactPerson1?.email || ""
            },
            contactPerson2: {
                name: client.contactPerson2?.name || "",
                designation: client.contactPerson2?.designation || "",
                phone: client.contactPerson2?.phone || "",
                email: client.contactPerson2?.email || ""
            },
            isDispatchAddressSame: client.isDispatchAddressSame || false,
            dispatchAddress: {
                addressLine1: client.dispatchAddress?.addressLine1 || "",
                addressLine2: client.dispatchAddress?.addressLine2 || "",
                city: client.dispatchAddress?.city || "",
                distt: client.dispatchAddress?.distt || "",
                state: client.dispatchAddress?.state || "",
                zipCode: client.dispatchAddress?.zipCode || "",
                country: client.dispatchAddress?.country || ""
            },
            isVisible: client.isVisible !== undefined ? client.isVisible : true
        };

        setClientFormData(safeFormData);

        // Determine if addresses are manual
        const checkManual = (addr) => {
            if (!addr || !addr.state) return false;
            if (!locationData[addr.state]) return true;
            if (addr.distt && locationData[addr.state] && !locationData[addr.state][addr.distt]) return true;
            if (addr.city && locationData[addr.state] && locationData[addr.state][addr.distt] && !locationData[addr.state][addr.distt].includes(addr.city)) return true;
            return false;
        };

        setManualBilling(checkManual(client.billingAddress));
        setManualDispatch(checkManual(client.dispatchAddress));

        setClientIsSecret(client.isSecret || false);
        setClientAllowedUsers(client.allowedUsers || []);

        setShowClientModal(true);
    };

    const handleDeleteClient = async (id) => {
        if (!window.confirm("Delete this client?")) return;
        try {
            await API.delete(`/clients/${id}`);
            setClients(clients.filter(c => c._id !== id));
        } catch (err) {
            console.error("Delete Error:", err);
            toast.error("Failed to delete client");
        }
    };

    // Quotation Handlers
    // leadId: optional - if provided, this lead will be pre-selected and added to eligible list
    const openQuotationModal = async (quote = null, leadId = null) => {
        try {
            const res = await API.get("/leads?limit=1000&excludeQuoted=true");
            let list = res.data.leads || [];
            
            // If editing, make sure the current quotation's lead is included so it displays correctly
            if (quote) {
                const currentLead = quote.lead;
                if (currentLead && !list.some(l => l._id === (currentLead._id || currentLead))) {
                    list.push(currentLead);
                }
            }

            // If a specific leadId is passed (direct qualification flow), ensure it's in the list
            if (leadId && !list.some(l => l._id === leadId)) {
                try {
                    const leadRes = await API.get(`/leads/${leadId}`);
                    if (leadRes.data) list.unshift(leadRes.data);
                } catch (e) {
                    console.warn("Could not fetch lead for quotation pre-fill", e);
                }
            }

            setEligibleLeads(list);
        } catch (err) {
            console.error("Failed to fetch eligible leads:", err);
        }

        if (quote) {
            setEditingQuotation(quote);
            setQuotationFormData({
                lead: quote.lead?._id || quote.lead || "",
                leadNumber: quote.lead?.leadNumber || "",
                products: quote.products?.map(p => ({
                    ...p,
                    product: p.product?._id || p.product || ""
                })) || [],
                validUntil: quote.validUntil ? new Date(quote.validUntil).toISOString().split('T')[0] : "",
                terms: {
                    deliveryLeadTime: quote.terms?.deliveryLeadTime || "Ex-Stock items are subject to prior sales against subject to Force Majeure Clause.",
                    payment: quote.terms?.payment || "100% advance along with Purchase Order.",
                    warranty: quote.terms?.warranty || "12 months from the date of TeamInspire Invoice for Equipments. (Onsite/OffSite). No warranty on spare parts. Consumables, Wear and tear items, including rubber parts and bulbs, are not covered under warranty.",
                    deliveryTerms: quote.terms?.deliveryTerms || "Ex-warehouse, Delhi is subject to prior sales and Force Majeure Clause.",
                    validity: quote.terms?.validity || "30 Days from the date of PI.",
                    remark: quote.terms?.remark || ""
                },
                termDetails: quote.termDetails || {
                    paymentPercent: "100",
                    warrantyMonths: "12",
                    warrantyType: "Onsite",
                    validityDays: "30"
                },
                billTo: quote.billTo || { name: "", address: "", gstin: "" },
                shipTo: quote.shipTo || { name: "", address: "", gstin: "" },
                additionalCharges: quote.additionalCharges || { installation: 0, freight: 0 },
                poNumber: quote.poNumber || "",
                poDate: quote.poDate ? new Date(quote.poDate).toISOString().split('T')[0] : "",
                poComment: quote.poComment || ""
            });
        } else {
            setEditingQuotation(null);
            // If leadId is provided (direct qualification flow), preserve the lead pre-selection
            // Otherwise reset to empty form
            setQuotationFormData(prev => ({
                lead: leadId || prev.lead || "",
                products: leadId ? (prev.products || []) : [],
                validUntil: leadId ? (prev.validUntil || "") : "",
                terms: {
                    deliveryLeadTime: "Ex-Stock items are subject to prior sales against subject to Force Majeure Clause.",
                    payment: "100% advance along with Purchase Order.",
                    warranty: "12 months from the date of TeamInspire Invoice for Equipments. (Onsite/OffSite). No warranty on spare parts. Consumables, Wear and tear items, including rubber parts and bulbs, are not covered under warranty.",
                    deliveryTerms: "Ex-warehouse, Delhi is subject to prior sales and Force Majeure Clause.",
                    validity: "30 Days from the date of PI.",
                    remark: ""
                },
                termDetails: {
                    paymentPercent: "100",
                    warrantyMonths: "12",
                    warrantyType: "Onsite",
                    validityDays: "30"
                },
                billTo: leadId ? (prev.billTo || { name: "", address: "", gstin: "" }) : { name: "", address: "", gstin: "" },
                shipTo: leadId ? (prev.shipTo || { name: "", address: "", gstin: "" }) : { name: "", address: "", gstin: "" },
                additionalCharges: { installation: 0, freight: 0 }
            }));
        }
        setIsQuotationModalOpen(true);
    };

    const handleQuotationSubmit = async (e) => {
        e.preventDefault();
        if (isSubmittingQuotation) return;
        setIsSubmittingQuotation(true);
        try {
            if (editingQuotation) {
                await API.put(`/quotations/${editingQuotation._id}`, quotationFormData);
                toast.success("Quotation updated successfully");
            } else {
                await API.post("/quotations", quotationFormData);
                toast.success("Quotation created successfully");
            }
            setIsQuotationModalOpen(false);
            setEditingQuotation(null);
            fetchData();
        } catch (err) {
            console.error("Save Quotation Error:", err);
            toast.error("Failed to save quotation");
        } finally {
            setIsSubmittingQuotation(false);
        }
    };

    const handleSavePODetails = async () => {
        if (!editingQuotation) return;
        setIsSubmittingQuotation(true);
        try {
            await API.put(`/quotations/${editingQuotation._id}`, {
                poNumber: quotationFormData.poNumber,
                poDate: quotationFormData.poDate || null,
                poComment: quotationFormData.poComment,
                poOnly: true
            });
            toast.success("PO details saved successfully!");
        } catch (err) {
            console.error("Save PO Error:", err);
            toast.error("Failed to save PO details");
        } finally {
            setIsSubmittingQuotation(false);
        }
    };

    const closeQuotationModal = () => {
        setIsQuotationModalOpen(false);
        setEditingQuotation(null);
        setActiveQuotationLead(null);
    };

    const handleConvertToPI = async (q) => {
        if (!window.confirm(`Are you sure you want to convert Quotation #${q.quotationNumber} to a Proforma Invoice (PI)? This will change the number prefix to "PI-" and mark the status as Accepted.`)) return;
        try {
            const updatedNumber = q.quotationNumber.replace(/^Q-/, "PI-");
            const res = await API.put(`/quotations/${q._id}`, {
                quotationNumber: updatedNumber,
                status: "Accepted"
            });
            toast.success("Converted to Proforma Invoice (PI) successfully! Enter PO details below.");
            fetchData(1, 'quotations');
            fetchData(1, 'proformas');
            // Auto-open edit modal so user can immediately enter PO details
            const updatedDoc = res.data || { ...q, quotationNumber: updatedNumber, status: "Accepted" };
            openQuotationModal(updatedDoc);
        } catch (err) {
            console.error("Conversion error", err);
            toast.error("Failed to convert to PI");
        }
    };

    const handleDeleteQuotation = async (id) => {
        if (!window.confirm("Delete this quotation?")) return;
        try {
            await API.delete(`/quotations/${id}`);
            setQuotations(prev => prev.filter(q => q._id !== id));
        } catch (err) {
            console.error("Delete Quotation Error:", err);
            toast.error("Failed to delete quotation");
        }
    };


    const addQuotationItem = () => {
        setQuotationFormData(prev => ({
            ...prev,
            products: [...prev.products, { product: "", quantity: 1, unitPrice: 0 }]
        }));
    };

    const removeQuotationItem = (index) => {
        setQuotationFormData(prev => ({
            ...prev,
            products: prev.products.filter((_, i) => i !== index)
        }));
    };

    const handleQuotationItemChange = (index, field, value) => {
        setQuotationFormData(prev => {
            const updatedProducts = prev.products.map((item, i) => {
                if (i !== index) return item;

                if (field === "product_obj") {
                    const product = value;
                    if (product) {
                        const selectedLeadId = prev.lead;
                        const lead = leads.find(l => l._id === selectedLeadId);
                        const leadGroup = lead?.group;
                        const priceType = leadGroup?.priceType || 'default';

                        let unitPrice = 0;
                        if (priceType === 'dealer') {
                            unitPrice = product.dealerPriceINR || 0;
                        } else if (priceType === 'retailer') {
                            unitPrice = product.retailPriceINR || 0;
                        } else {
                            unitPrice = product.priceUSD || product.dealerPriceINR || 0;
                        }

                        return {
                            ...item,
                            product: product._id,
                            unitPrice: unitPrice,
                            name: product.name,
                            productNo: product.productNo,
                            brand: product.brand,
                            hsnCode: product.hsnCode || "",
                            uom: product.uom || "PCS",
                            gstRate: product.gstRate || 18
                        };
                    }
                    return item;
                }

                // Explicit, static property updates to bypass scanner dynamic bracket warnings
                const updatedItem = { ...item };
                if (field === "brand") updatedItem.brand = value;
                else if (field === "productNo") updatedItem.productNo = value;
                else if (field === "name") updatedItem.name = value;
                else if (field === "hsnCode") updatedItem.hsnCode = value;
                else if (field === "uom") updatedItem.uom = value;
                else if (field === "quantity") updatedItem.quantity = value;
                else if (field === "unitPrice") updatedItem.unitPrice = value;
                else if (field === "gstRate") updatedItem.gstRate = value;

                return updatedItem;
            });
            return { ...prev, products: updatedProducts };
        });
    };

    // --- Components
    const UnifiedSalesDashboard = () => {
        // Synchronize with URL tab parameter if valid
        const urlTab = new URLSearchParams(location.search).get("tab");
        const initialTab = ["total", "my", "clients", "assign", "quotation", "leadStatus"].includes(urlTab)
            ? urlTab
            : (urlTab === "quotations" || urlTab === "quotation") ? "quotation" : "total";
                          
        const [activeSalesTab, setActiveSalesTab] = useState(initialTab);
        const currentUser = users.find(u => u.name === currentUserName);
        const currentUserId = currentUser?._id;

        const counts = {
            qualified: dashboardCounts.qualifiedLeads || 0,
            total: dashboardCounts.leads || 0,
            my: dashboardCounts.myLeads || 0,
            assign: dashboardCounts.assignedLeads || 0,
            won: dashboardCounts.wonQuotes || 0,
            lost: dashboardCounts.lostQuotes || 0,
            pendingQuotes: dashboardCounts.submittedQuotes || 0
        };

        const tabs = [
            { id: 'total', name: 'Global Pool', icon: <List size={18} /> },
            { id: 'my', name: 'My Portfolio', icon: <Eye size={18} /> },
            { id: 'clients', name: 'Client Registry', icon: <Users size={18} /> },
            { id: 'assign', name: 'Assignments', icon: <CheckCircle size={18} /> },
            { id: 'quotation', name: 'Financial Pipeline', icon: <CreditCard size={18} /> },
            { id: 'leadStatus', name: 'Market Intelligence', icon: <TrendingUp size={18} /> }
        ];

        const Section = ({ title, data, color, count, icon }) => (
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-all group-card">
                <div className={` ${color} text-white px-10 py-6 flex justify-between items-center relative overflow-hidden`}>
                    <div className="absolute right-0 top-0 opacity-10 translate-x-1/4 -translate-y-1/4">
                         <div className="text-9xl font-black">{title.charAt(0)}</div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black uppercase tracking-widest">{title}</h3>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 mt-1">Real-time Feed</p>
                    </div>
                    <div className="relative z-10 flex flex-col items-end">
                        <span className="text-4xl font-black drop-shadow-md">{count}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Entries</span>
                    </div>
                </div>
                <div className="p-2">
                    <TableView 
                        data={data} 
                        type="Leads" 
                        statusColors={statusColors}
                        rolePermissions={rolePermissions}
                        userRole={userRole}
                        openViewModal={openViewModal}
                        openModal={openModal}
                        handleDelete={handleDelete}
                        currentUserId={currentUserId}
                        currentUserName={currentUserName}
                        loading={loading}
                        openFollowUpModal={openFollowUpModal}
                    />
                </div>
            </div>
        );

        return (
            <div className="max-w-[1600px] mx-auto p-4 md:p-12 space-y-10">
                {/* Sales Pulse Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-2xl border border-gray-50 dark:border-gray-700/50">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/40 text-white">
                            <TrendingUp size={32} />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                                Sales <span className="text-blue-600">Command</span>
                            </h2>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                Live Business Intelligence Hub
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                        <button 
                            onClick={() => openModal()} 
                            className="flex-1 lg:flex-none px-8 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:shadow-2xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                        >
                            <PlusCircle size={20} className="group-hover:rotate-90 transition-transform" />
                            INITIATE NEW LEAD
                        </button>
                    </div>
                </div>

                {/* Professional Navigation Matrix */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-gray-100 dark:bg-gray-900/50 p-2 rounded-[2rem]">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSalesTab(tab.id)}
                            className={`flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-[1.5rem] transition-all duration-300 relative overflow-hidden ${activeSalesTab === tab.id
                                ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-white shadow-xl scale-105 z-10"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50"
                            }`}
                        >
                            <div className={`${activeSalesTab === tab.id ? "text-blue-600" : "text-gray-400"}`}>
                                {tab.icon}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.15em]">{tab.name}</span>
                            {activeSalesTab === tab.id && (
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-full mb-1"></div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Dashboard Intelligence Content */}
                <div className="transition-all duration-500 transform">
                    {activeSalesTab === 'total' && (
                        <Section title="Global Leads" data={leads} color="bg-gradient-to-r from-yellow-500 to-orange-500" count={counts.total} />
                    )}

                    {activeSalesTab === 'my' && (
                        <Section title="My Portfolio" data={leads.filter(l => l.assignedTo?._id === currentUserId || l.assignedTo === currentUserId || l.source === currentUserName)} color="bg-gradient-to-r from-blue-500 to-indigo-600" count={counts.my} />
                    )}

                    {activeSalesTab === 'clients' && (
                        <div className="space-y-6">
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Portfolio Registry</h3>
                            <ClientTableView 
                                clients={clients} 
                                searchClientQuery={searchClientQuery} 
                                searchClientGroup={searchClientGroup}
                                leads={leads}
                                openClientViewModal={openClientViewModal}
                                setEditingClient={setEditingClient}
                                setClientFormData={setClientFormData}
                                setClientIsSecret={setClientIsSecret}
                                setClientAllowedUsers={setClientAllowedUsers}
                                setShowClientModal={setShowClientModal}
                                handleDeleteClient={handleDeleteClient}
                                loading={loading}
                                pagination={{ currentPage: clientPage, totalPages: clientTotalPages, totalItems: totalClients }}
                                onPageChange={(p) => fetchData(p, 'clients')}
                            />
                        </div>
                    )}

                    {activeSalesTab === 'assign' && (
                        <Section title="Targeted Leads" data={leads.filter(l => !!l.assignedTo)} color="bg-gradient-to-r from-purple-500 to-pink-600" count={counts.assign} />
                    )}

                    {activeSalesTab === 'quotation' && (
                        <div className="space-y-10">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-2xl border border-gray-50 dark:border-gray-700 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-5">
                                        <CreditCard size={120} />
                                    </div>
                                    <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-widest mb-10 flex items-center gap-3">
                                        <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                                        Financial Health Analytics
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                                        <div className="bg-red-50 dark:bg-red-900/10 p-8 rounded-[2rem] border border-red-100 dark:border-red-900/20 group hover:shadow-lg transition-all">
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600">
                                                    <Clock size={24} />
                                                </div>
                                                <span className="text-4xl font-black text-red-600 dark:text-red-400">{counts.pendingQuotes}</span>
                                            </div>
                                            <p className="text-xs uppercase font-black text-red-500 tracking-[0.2em]">Pending Review</p>
                                        </div>
                                        <div className="bg-green-50 dark:bg-green-900/10 p-8 rounded-[2rem] border border-green-100 dark:border-green-900/20 group hover:shadow-lg transition-all">
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600">
                                                    <CheckCircle size={24} />
                                                </div>
                                                <span className="text-4xl font-black text-green-600 dark:text-green-400">{counts.qualified}</span>
                                            </div>
                                            <p className="text-xs uppercase font-black text-green-500 tracking-[0.2em]">Qualified Pipeline</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-blue-500/20 flex flex-col justify-center relative overflow-hidden">
                                    <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                                    <h4 className="text-xs font-black uppercase opacity-60 tracking-[0.3em] mb-4">Closing Velocity</h4>
                                    <p className="text-7xl font-black mb-4 tracking-tighter">
                                        {Math.round((counts.won / (counts.total || 1)) * 100)}<span className="text-3xl opacity-50">%</span>
                                    </p>
                                    <p className="text-sm font-bold opacity-80 leading-relaxed">
                                        Conversion rate performing <span className="text-white font-black underline decoration-2">above average</span>.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Proposal Registry</h3>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Manage your commercial offers</p>
                                    </div>
                                    <div className="relative w-full md:w-96 group">
                                        <input
                                            type="text"
                                            placeholder="Search by ID, Client, or Amount..."
                                            value={searchQuotationQuery}
                                            onChange={(e) => setSearchQuotationQuery(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 focus:ring-4 focus:ring-blue-500/10 outline-none dark:text-white transition-all shadow-sm font-medium"
                                        />
                                        <Eye size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                </div>
                                <QuotationTableView 
                                    quotations={quotations}
                                    searchQuotationQuery={searchQuotationQuery}
                                    openQuotationModal={openQuotationModal}
                                    handleDeleteQuotation={handleDeleteQuotation}
                                    loading={loading}
                                    userRole={userRole}
                                    onConvertToPI={handleConvertToPI}
                                    pagination={{ currentPage: quotationPage, totalPages: quotationTotalPages, totalItems: totalQuotations }}
                                    onPageChange={(p) => fetchData(p, 'quotations')}
                                    openFollowUpModal={openFollowUpModal}
                                />
                            </div>
                        </div>
                    )}

                    {activeSalesTab === 'leadStatus' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-2xl border border-gray-50 dark:border-gray-700">
                                <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-widest mb-10 flex items-center gap-3">
                                    <div className="w-2 h-8 bg-purple-600 rounded-full"></div>
                                    Market Finalization Index
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="bg-indigo-50 dark:bg-indigo-900/10 p-8 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/20 text-center">
                                        <p className="text-6xl font-black text-indigo-600 dark:text-indigo-400 mb-2 tracking-tighter">{counts.won}</p>
                                        <p className="text-[10px] uppercase font-black text-indigo-500 tracking-[0.2em]">Closed - Won</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/30 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700/50 text-center">
                                        <p className="text-6xl font-black text-gray-400 dark:text-gray-500 mb-2 tracking-tighter">{counts.lost}</p>
                                        <p className="text-[10px] uppercase font-black text-gray-500 tracking-[0.2em]">Closed - Lost</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-2xl border border-gray-50 dark:border-gray-700 flex items-center justify-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="text-center relative z-10">
                                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 mb-6 shadow-inner">
                                        <TrendingUp size={48} />
                                    </div>
                                    <p className="text-8xl font-black text-gray-900 dark:text-white tracking-tighter mb-2">{counts.qualified}</p>
                                    <p className="text-[10px] font-black uppercase text-blue-500 tracking-[0.4em]">High-Value Opportunities</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const isSalesView = (userRole?.toLowerCase() === 'sales' || userRole?.toLowerCase() === 'services') && !(new URLSearchParams(location.search).get("action") === "update");

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            {isSalesView ? (
                <UnifiedSalesDashboard />
            ) : (
                <div className="p-6 md:p-12">
                    <div className="max-w-7xl mx-auto space-y-8">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-6">
                            <div>
                                <h2 className="text-4xl font-extrabold text-gray-800 dark:text-white tracking-tight flex items-center gap-3">
                                    <span className="text-blue-600">TeamInspire</span> <span className="text-gray-300 font-light text-2xl">| Lead Management</span>
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 mt-2">
                                    Organize leads, track clients, and grow your business.
                                </p>
                            </div>
                            <div className="flex gap-3">


                                {activeTab !== 'my_leads' && (rolePermissions?.modulePermissions?.['Manage Groups']?.view || userRole === "admin") && (
                                    <button onClick={() => openGroupModal()} className="px-4 py-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-bold rounded-xl hover:bg-purple-200 transition-colors">
                                        + Add Group
                                    </button>
                                )}

                                {activeTab !== 'my_leads' && (rolePermissions?.modulePermissions?.['View All Clients']?.view || userRole === "admin") && (
                                    <button onClick={() => {
                                        setShowClientModal(true);
                                        setEditingClient(null);
                                        setClientFormData({ group: "", clientName: "", legalEntityName: "", billingAddress: { addressLine1: "", addressLine2: "", city: "", distt: "", state: "", zipCode: "", country: "" }, gstVatNo: "", contactPerson1: { name: "", designation: "", phone: "", email: "" }, contactPerson2: { name: "", designation: "", phone: "", email: "" }, isDispatchAddressSame: false, dispatchAddress: { addressLine1: "", addressLine2: "", city: "", distt: "", state: "", zipCode: "", country: "" } });
                                        setClientIsSecret(false);
                                        setClientAllowedUsers([]);
                                    }} className="px-4 py-2 bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 font-bold rounded-xl hover:bg-teal-200 transition-colors">
                                        + Add Client
                                    </button>
                                )}

                                {(rolePermissions?.modulePermissions?.['View All Leads']?.view || rolePermissions?.modulePermissions?.['Lead Management']?.view || userRole === "admin" || userRole?.toLowerCase() === "sales" || userRole?.toLowerCase() === "services") && (
                                    <button onClick={() => openModal()} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95">
                                        + Add Lead
                                    </button>
                                )}
                            </div>
                        </div>

                    {/* Tabs */}
                    {activeTab !== 'my_leads' && (
                        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                            {[
                                "leads",
                                (rolePermissions?.modulePermissions?.['View All Clients']?.view || userRole === "admin") && !(userRole?.toLowerCase() === 'sales' || userRole?.toLowerCase() === 'services') ? "clients" : null,
                                (rolePermissions?.modulePermissions?.['Manage Groups']?.view || userRole === "admin") ? "groups" : null,
                                "quotations",
                                "proformas"
                            ].filter(Boolean).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-2.5 rounded-lg text-sm font-bold capitalize transition-all flex items-center gap-2 ${activeTab === tab
                                        ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                                        }`}
                                >
                                    <span>
                                        {tab === "my_leads" ? "My Leads" : tab === "leads" ? "View All Leads" : tab === "clients" ? "View All Clients" : tab === "groups" ? "Manage Groups" : tab === "quotations" ? "Quotation Management" : tab === "proformas" ? "PI Management" : ""}
                                    </span>
                                    <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${activeTab === tab ? "bg-blue-100 text-blue-600" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                                        {tab === "leads" ? totalLeads : tab === "clients" ? totalClients : tab === "groups" ? groups.length : tab === "quotations" ? totalQuotations : tab === "proformas" ? totalProformas : 0}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Content */}

                    {(activeTab === "leads" || activeTab === "my_leads") && (
                        <div>
                            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    {activeTab === 'my_leads' ? "My Leads" : "All Potential Leads"}
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full">
                                        {totalLeads}
                                    </span>
                                </h3>
                                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-start sm:justify-end">
                                    <select
                                        value={activeTab === 'my_leads' ? myLeadsFilterType : leadFilterType}
                                        onChange={(e) => activeTab === 'my_leads' ? setMyLeadsFilterType(e.target.value) : setLeadFilterType(e.target.value)}
                                        className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white shadow-sm transition-all font-semibold"
                                    >
                                        {activeTab === 'my_leads' ? (
                                            <>
                                                <option value="all">All My Leads</option>
                                                <option value="created">Created by Me</option>
                                                <option value="assigned">Assigned to Me</option>
                                                <option value="assignedByMe">Assigned by Me</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="all">All Leads</option>
                                                <option value="created">Created by Me</option>
                                                <option value="assigned">Assigned to Me</option>
                                                <option value="assignedByMe">Assigned by Me</option>
                                            </>
                                        )}
                                    </select>
                                    
                                    {(userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'superadmin' || rolePermissions?.modulePermissions?.['View All Leads']?.view) && (
                                        <select
                                            value={activeTab === 'my_leads' ? myLeadsStaffFilter : staffFilter}
                                            onChange={(e) => activeTab === 'my_leads' ? setMyLeadsStaffFilter(e.target.value) : setStaffFilter(e.target.value)}
                                            className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white shadow-sm transition-all font-semibold max-w-[150px] truncate"
                                        >
                                            <option value="all">All Staff</option>
                                            {users.map(u => (
                                                <option key={u._id} value={u._id}>{u.name}</option>
                                            ))}
                                        </select>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={activeTab === 'my_leads' ? myLeadsStartDate : leadStartDate}
                                            onChange={(e) => activeTab === 'my_leads' ? setMyLeadsStartDate(e.target.value) : setLeadStartDate(e.target.value)}
                                            className="px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white shadow-sm transition-all"
                                            title="Start Date"
                                        />
                                        <span className="text-gray-400 text-sm">to</span>
                                        <input
                                            type="date"
                                            value={activeTab === 'my_leads' ? myLeadsEndDate : leadEndDate}
                                            onChange={(e) => activeTab === 'my_leads' ? setMyLeadsEndDate(e.target.value) : setLeadEndDate(e.target.value)}
                                            className="px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white shadow-sm transition-all"
                                            title="End Date"
                                        />
                                    </div>
                                    <select
                                        value={activeTab === 'my_leads' ? myLeadsStatusFilter : leadStatusFilter}
                                        onChange={(e) => activeTab === 'my_leads' ? setMyLeadsStatusFilter(e.target.value) : setLeadStatusFilter(e.target.value)}
                                        className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white shadow-sm transition-all font-semibold"
                                    >
                                            <option value="all">All Status</option>
                                            <option value="New">New</option>
                                            <option value="Qualified">Qualified</option>
                                            <option value="Quotation Submitted">Quotation Submitted</option>
                                            <option value="Contacted">Contacted</option>
                                            <option value="Follow Up">Follow Up</option>
                                            <option value="Won">Won</option>
                                            <option value="Lost">Lost</option>
                                        </select>
                                        <select
                                            value={activeTab === 'my_leads' ? myLeadsFollowUpFilter : leadFollowUpFilter}
                                            onChange={(e) => activeTab === 'my_leads' ? setMyLeadsFollowUpFilter(e.target.value) : setLeadFollowUpFilter(e.target.value)}
                                            className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white shadow-sm transition-all font-semibold"
                                        >
                                            <option value="all">All Follow-ups</option>
                                            <option value="true">With Follow-up</option>
                                            <option value="false">Without Follow-up</option>
                                        </select>
                                        <div className="relative flex items-center">
                                            <input
                                                type="text"
                                                placeholder={(activeTab === 'my_leads' ? (isMyLeadsSearchExpanded || searchMyLeadQuery) : (isLeadsSearchExpanded || searchLeadQuery)) ? "Search Leads..." : ""}
                                                value={activeTab === 'my_leads' ? searchMyLeadQuery : searchLeadQuery}
                                                onChange={(e) => activeTab === 'my_leads' ? setSearchMyLeadQuery(e.target.value) : setSearchLeadQuery(e.target.value)}
                                                onFocus={() => activeTab === 'my_leads' ? setIsMyLeadsSearchExpanded(true) : setIsLeadsSearchExpanded(true)}
                                                onBlur={() => {
                                                    const val = activeTab === 'my_leads' ? searchMyLeadQuery : searchLeadQuery;
                                                    if (!val) {
                                                        if (activeTab === 'my_leads') setIsMyLeadsSearchExpanded(false);
                                                        else setIsLeadsSearchExpanded(false);
                                                    }
                                                }}
                                                className={`h-10 pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white shadow-sm transition-all duration-300 ease-in-out ${
                                                    (activeTab === 'my_leads' ? (isMyLeadsSearchExpanded || searchMyLeadQuery) : (isLeadsSearchExpanded || searchLeadQuery))
                                                        ? "w-48 sm:w-64 opacity-100"
                                                        : "w-10 pl-10 pr-0 opacity-60 cursor-pointer hover:opacity-100"
                                                }`}
                                            />
                                            <span className="absolute left-3 pointer-events-none text-gray-400">🔍</span>
                                        </div>
                                    </div>
                                </div>
                            <TableView 
                                data={leads} 
                                type="Leads" 
                                statusColors={statusColors}
                                rolePermissions={rolePermissions}
                                userRole={userRole}
                                openViewModal={openViewModal}
                                openModal={openModal}
                                handleDelete={handleDelete}
                                currentUserId={currentUserId}
                                currentUserName={currentUserName}
                                pagination={{
                                    totalLeads,
                                    totalPages,
                                    currentPage: page
                                }}
                                onPageChange={(p) => fetchData(p)}
                                loading={loading}
                                onWhatsAppClick={handleWhatsAppClick}
                                openFollowUpModal={openFollowUpModal}
                            />
                        </div>
                    )}

                    {activeTab === "clients" && (
                        <div className="animate-fade-in">
                            <div className="flex flex-col sm:flex-row justify-between items-end mb-8 gap-6 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="space-y-1">
                                    <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                                        Client Portfolio
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full">
                                            {totalClients}
                                        </span>
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400 font-medium">Manage and monitor all active business relationships.</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                                    <div className="relative group">
                                        <select
                                            value={searchClientGroup}
                                            onChange={(e) => setSearchClientGroup(e.target.value)}
                                            className="w-full sm:w-48 pl-4 pr-10 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 outline-none dark:text-white transition-all shadow-inner font-medium appearance-none cursor-pointer"
                                        >
                                            <option value="">All Groups</option>
                                            {groups.map(g => (
                                                <option key={g._id} value={g.name}>{g.name}</option>
                                            ))}
                                        </select>
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</span>
                                    </div>
                                    <div className="relative group">
                                        <select
                                            value={searchClientAllotment}
                                            onChange={(e) => setSearchClientAllotment(e.target.value)}
                                            className="w-full sm:w-44 pl-4 pr-10 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 outline-none dark:text-white transition-all shadow-inner font-medium appearance-none cursor-pointer"
                                        >
                                            <option value="">Group Status</option>
                                            <option value="allotted">Group Allotted</option>
                                            <option value="unallotted">Group Not Allotted</option>
                                        </select>
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</span>
                                    </div>
                                    <div className="relative w-full sm:w-80 group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">🔍</span>
                                        <input
                                            type="text"
                                            placeholder="Search by Name, ID, or Location..."
                                            value={searchClientQuery}
                                            onChange={(e) => setSearchClientQuery(e.target.value)}
                                            className="w-full pl-12 pr-6 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none dark:text-white transition-all shadow-inner"
                                        />
                                    </div>
                                </div>
                            </div>
                            <ClientTableView 
                                clients={clients}
                                searchClientQuery={searchClientQuery}
                                searchClientGroup={searchClientGroup}
                                searchClientAllotment={searchClientAllotment}
                                leads={leads}
                                openClientViewModal={openClientViewModal}
                                setEditingClient={setEditingClient}
                                setClientFormData={setClientFormData}
                                setClientIsSecret={setClientIsSecret}
                                setClientAllowedUsers={setClientAllowedUsers}
                                setShowClientModal={setShowClientModal}
                                handleDeleteClient={handleDeleteClient}
                                loading={loading}
                                pagination={{
                                    currentPage: clientPage,
                                    totalPages: clientTotalPages,
                                    totalItems: totalClients
                                }}
                                onPageChange={(p) => fetchData(p, 'clients')}
                            />
                        </div>
                    )}

                    {activeTab === "groups" && (
                        <div className="animate-fade-in">
                            <div className="flex flex-col sm:flex-row justify-between items-end mb-8 gap-6 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                                        Market Segmentation
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full">
                                            {groups.length}
                                        </span>
                                    </h3>
                                    <div className="flex items-center gap-2 text-gray-500 font-medium">
                                        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                        Organize and categorize your leads by industry or region.
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                                        <input
                                            type="text"
                                            placeholder="Find Category..."
                                            value={searchGroupQuery}
                                            onChange={(e) => setSearchGroupQuery(e.target.value)}
                                            className="w-full sm:w-64 pl-12 pr-6 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-indigo-500 outline-none dark:text-white transition-all shadow-inner font-medium"
                                        />
                                    </div>
                                </div>
                            </div>

                            <GroupTableView 
                                groups={groups}
                                searchGroupQuery={searchGroupQuery}
                                leads={leads}
                                openGroupModal={openGroupModal}
                                handleGroupDelete={handleGroupDelete}
                                pagination={{
                                    currentPage: groupPage,
                                    totalPages: Math.ceil(groups.filter(g => g.name.toLowerCase().includes(searchGroupQuery.toLowerCase())).length / 3),
                                    totalItems: groups.filter(g => g.name.toLowerCase().includes(searchGroupQuery.toLowerCase())).length
                                }}
                                onPageChange={(p) => setGroupPage(p)}
                            />
                        </div>
                    )}

                    {activeTab === "quotations" && (
                        <div className="animate-fade-in">
                            <div className="flex flex-col sm:flex-row justify-between items-end mb-8 gap-6 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                                        Proposal Management
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full">
                                            {totalQuotations}
                                        </span>
                                    </h3>
                                    <div className="flex items-center gap-2 text-gray-500 font-medium">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                        Track and manage all issued commercial offers.
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">🔍</span>
                                        <input
                                            type="text"
                                            placeholder="Search Proposal ID..."
                                            value={searchQuotationQuery}
                                            onChange={(e) => setSearchQuotationQuery(e.target.value)}
                                            className="w-full sm:w-72 pl-12 pr-6 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none dark:text-white transition-all shadow-inner font-medium"
                                        />
                                    </div>
                                    
                                    {(userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'superadmin' || rolePermissions?.modulePermissions?.['Quotation Management']?.view) && (
                                        <div className="relative group">
                                            <select
                                                value={quotationStaffFilter}
                                                onChange={(e) => setQuotationStaffFilter(e.target.value)}
                                                className="w-full sm:w-48 pl-4 pr-10 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 outline-none dark:text-white transition-all shadow-inner font-medium appearance-none cursor-pointer max-w-[150px] truncate"
                                            >
                                                <option value="all">All Staff</option>
                                                {users.map(u => (
                                                    <option key={u._id} value={u._id}>{u.name}</option>
                                                ))}
                                            </select>
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</span>
                                        </div>
                                    )}
                                    <div className="relative group">
                                        <select
                                            value={quotationFollowUpFilter}
                                            onChange={(e) => setQuotationFollowUpFilter(e.target.value)}
                                            className="w-full sm:w-48 pl-4 pr-10 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 outline-none dark:text-white transition-all shadow-inner font-medium appearance-none cursor-pointer"
                                        >
                                            <option value="all">All Follow-ups</option>
                                            <option value="true">With Follow-up</option>
                                            <option value="false">Without Follow-up</option>
                                        </select>
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</span>
                                    </div>
                                    <button 
                                        onClick={() => openQuotationModal()} 
                                        className="px-8 py-3.5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95 whitespace-nowrap flex items-center gap-2"
                                    >
                                        <span>+</span> New Proposal
                                    </button>
                                </div>
                            </div>
                            
                            <QuotationTableView 
                                quotations={quotations}
                                searchQuotationQuery={searchQuotationQuery}
                                openQuotationModal={openQuotationModal}
                                handleDeleteQuotation={handleDeleteQuotation}
                                loading={loading}
                                userRole={userRole}
                                printQuotation={printQuotation}
                                downloadQuotation={downloadQuotation}
                                onConvertToPI={handleConvertToPI}
                                pagination={{
                                    currentPage: quotationPage,
                                    totalPages: quotationTotalPages,
                                    totalItems: totalQuotations
                                }}
                                onPageChange={(p) => fetchData(p, 'quotations')}
                                onWhatsAppClick={handleWhatsAppClick}
                                openFollowUpModal={openFollowUpModal}
                            />
                        </div>
                    )}
 
                    {activeTab === "proformas" && (
                        <div className="animate-fade-in">
                            <div className="flex flex-col sm:flex-row justify-between items-end mb-8 gap-6 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                                        PI Management
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full">
                                            {totalProformas}
                                        </span>
                                    </h3>
                                    <div className="flex items-center gap-2 text-gray-500 font-medium">
                                        <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
                                        Track and manage all converted Proforma Invoices.
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-500 transition-colors">🔍</span>
                                        <input
                                            type="text"
                                            placeholder="Search PI ID..."
                                            value={searchProformaQuery}
                                            onChange={(e) => setSearchProformaQuery(e.target.value)}
                                            className="w-full sm:w-72 pl-12 pr-6 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none dark:text-white transition-all shadow-inner font-medium"
                                        />
                                    </div>
                                    
                                    {(userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'superadmin' || rolePermissions?.modulePermissions?.['Quotation Management']?.view) && (
                                        <div className="relative group">
                                            <select
                                                value={proformaStaffFilter}
                                                onChange={(e) => setProformaStaffFilter(e.target.value)}
                                                className="w-full sm:w-48 pl-4 pr-10 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-teal-500 outline-none dark:text-white transition-all shadow-inner font-medium appearance-none cursor-pointer max-w-[150px] truncate"
                                            >
                                                <option value="all">All Staff</option>
                                                {users.map(u => (
                                                    <option key={u._id} value={u._id}>{u.name}</option>
                                                ))}
                                            </select>
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</span>
                                        </div>
                                    )}
                                    <div className="relative group">
                                        <select
                                            value={proformaFollowUpFilter}
                                            onChange={(e) => setProformaFollowUpFilter(e.target.value)}
                                            className="w-full sm:w-48 pl-4 pr-10 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-teal-500 outline-none dark:text-white transition-all shadow-inner font-medium appearance-none cursor-pointer"
                                        >
                                            <option value="all">All Follow-ups</option>
                                            <option value="true">With Follow-up</option>
                                            <option value="false">Without Follow-up</option>
                                        </select>
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</span>
                                    </div>
                                </div>
                            </div>
 
                            <QuotationTableView 
                                quotations={proformas}
                                searchQuotationQuery={searchProformaQuery}
                                openQuotationModal={openQuotationModal}
                                handleDeleteQuotation={handleDeleteQuotation}
                                loading={loading}
                                userRole={userRole}
                                printQuotation={printQuotation}
                                downloadQuotation={downloadQuotation}
                                onConvertToPI={null}
                                isPIView={true}
                                pagination={{
                                    currentPage: proformaPage,
                                    totalPages: proformaTotalPages,
                                    totalItems: totalProformas
                                }}
                                onPageChange={(p) => fetchData(p, 'proformas')}
                                onWhatsAppClick={handleWhatsAppClick}
                                openFollowUpModal={openFollowUpModal}
                            />
                        </div>

                    )}
                    </div>
                </div>
            )}

            {/* Lead Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                            <h3 className="font-bold text-gray-800 dark:text-white">{editingLead ? "Edit Lead" : "Add New Lead"}</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="checkbox"
                                    id="tempClient"
                                    checked={formData.isTemporaryClient || false}
                                    onChange={(e) => setFormData(prev => ({ ...prev, isTemporaryClient: e.target.checked, group: e.target.checked ? "" : prev.group }))}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="tempClient" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Add Temporary Client (No Group)
                                </label>
                            </div>

                            <select
                                name="group"
                                value={formData.group}
                                onChange={handleChange}
                                required={!formData.isTemporaryClient}
                                disabled={formData.isTemporaryClient || isMetaLoading}
                                className={`w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white ${formData.isTemporaryClient || isMetaLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <option value="">{isMetaLoading ? "Loading Groups..." : "Select Group *"}</option>
                                {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
                            </select>

                            <ClientSearchSelect
                                clients={formData.isTemporaryClient ? [] : modalClients}
                                value={formData.name}
                                onChange={(name, client) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        name: name,
                                        phone: client?.contactPerson1?.phone || (client ? "" : prev.phone),
                                        email: client?.contactPerson1?.email || (client ? "" : prev.email)
                                    }));
                                }}
                                disabled={!formData.group && !formData.isTemporaryClient}
                            />

                            <input 
                                type="tel"
                                name="phone" 
                                value={formData.phone} 
                                onChange={handleChange} 
                                required 
                                maxLength={10}
                                placeholder="Phone (10 Digits) *" 
                                className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" 
                            />
                            <input name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />

                            <div className="grid grid-cols-2 gap-4">
                                <select name="leadType" value={formData.leadType} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white">
                                    <option value="" disabled hidden>Select Lead Type</option>
                                    <option value="Equipment">Equipment</option>
                                    <option value="Spare">Spare</option>
                                    <option value="Service & AMC">Service & AMC</option>
                                </select>

                                <select 
                                    name="status" 
                                    value={formData.status} 
                                    onChange={handleChange} 
                                    required 
                                    className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                                >
                                    {(() => {
                                        const getStatusRank = (status) => {
                                            switch (status) {
                                                case "New": return 0;
                                                case "Contacted": return 1;
                                                case "Qualified": return 2;
                                                case "Quotation Submitted": return 3;
                                                case "Won": return 4;
                                                case "Lost": return 4;
                                                default: return 0;
                                            }
                                        };
                                        const currentRank = editingLead ? getStatusRank(editingLead.status) : 0;
                                        const isAdminOrCreator = userRole === "admin" || (editingLead && (String(editingLead.createdBy?._id || editingLead.createdBy) === String(currentUserId) || editingLead.source === currentUserName));
                                        
                                        // Helper to check if disabled
                                        const isStatusDisabled = (targetRank) => {
                                            if (userRole === "admin") return false; // Admin can move freely
                                            if (!editingLead) return false; // New leads can start anywhere (usually New)
                                            return targetRank < currentRank;
                                        };

                                        return (
                                            <>
                                                <option value="New" disabled={isStatusDisabled(0)}>New</option>
                                                <option value="Contacted" disabled={isStatusDisabled(1)}>Contacted</option>
                                                <option value="Qualified" disabled={isStatusDisabled(2)}>Qualified</option>
                                                <option value="Quotation Submitted" disabled={isStatusDisabled(3)}>Quotation Submitted</option>
                                                <option value="Won" disabled={!(userRole === "admin" || editingLead?.hasPI || editingLead?.status === "Won" || editingLead?.status === "Lost")}>Won (Client)</option>
                                                <option value="Lost" disabled={!(userRole === "admin" || editingLead?.hasPI || editingLead?.status === "Won" || editingLead?.status === "Lost")}>Lost</option>
                                            </>
                                        );
                                    })()}
                                </select>
                            </div>

                            {(userRole === "admin" || userRole?.toLowerCase() === "sales" || userRole?.toLowerCase() === "services" || (editingLead && (String(editingLead.createdBy?._id || editingLead.createdBy) === String(currentUserId) || editingLead.source === currentUserName))) && (
                                <select name="assignedTo" value={formData.assignedTo} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white">
                                    <option value="">Lead Assign *</option>
                                    {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                                </select>
                            )}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Remarks</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowRemarksHistory(!showRemarksHistory)}
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                    >
                                        {showRemarksHistory ? "Hide History" : "Show History"}
                                    </button>
                                </div>

                                {showRemarksHistory && (
                                    <div className="max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600 space-y-2 animate-fade-in">
                                        {editingLead && editingLead.remarks && editingLead.remarks.length > 0 ? (
                                            editingLead.remarks.map((remark, idx) => (
                                                <div key={idx} className="text-sm border-b last:border-0 border-gray-200 dark:border-gray-500 pb-1 last:pb-0">
                                                    <p className="text-gray-800 dark:text-gray-200">{remark.text}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                                                        {format(new Date(remark.createdAt), "dd MMM yyyy HH:mm")}
                                                    </p>
                                                </div>
                                            ))
                                        ) : (
                                            editingLead?.notes ? (
                                                <div className="text-sm">
                                                    <p className="text-gray-800 dark:text-gray-200">{editingLead.notes}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 text-right">Legacy Note</p>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-400 text-center">No remarks yet.</p>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                            <textarea name="notes" value={formData.notes} onChange={handleChange} required placeholder="Add a new remark..." rows="3" className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white resize-none"></textarea>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600 dark:text-gray-300">Cancel</button>
                                <button type="submit" disabled={isSubmittingLead} className={`px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 ${isSubmittingLead ? 'opacity-50 cursor-wait' : ''}`}>
                                    {isSubmittingLead ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Group Modal */}
            {isGroupModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-fade-in">
                        <h3 className="font-bold text-xl text-gray-800 dark:text-white">{editingGroup ? "Edit Group" : "Add New Group"}</h3>
                        <p className="text-sm text-gray-500">{editingGroup ? "Update the group name." : "Create a group to categorize your leads."}</p>
                        <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group Name (e.g., Real Estate)" className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />

                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800">
                            <input
                                type="checkbox"
                                checked={groupIsSecret}
                                onChange={(e) => setGroupIsSecret(e.target.checked)}
                                className="w-5 h-5 rounded text-red-600 focus:ring-red-500"
                            />
                            <div>
                                <label className="font-semibold text-gray-800 dark:text-white">Secret Group</label>
                                <p className="text-xs text-gray-500">Only allowed users can see this group.</p>
                            </div>
                        </div>

                        {groupIsSecret && (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Allowed Users</label>
                                <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-700">
                                    {users.map(u => (
                                        <div key={u._id} className="flex items-center gap-2 py-1">
                                            <input
                                                type="checkbox"
                                                checked={groupAllowedUsers.includes(u._id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setGroupAllowedUsers([...groupAllowedUsers, u._id]);
                                                    } else {
                                                        setGroupAllowedUsers(groupAllowedUsers.filter(id => id !== u._id));
                                                    }
                                                }}
                                                className="w-4 h-4 text-blue-600 rounded"
                                            />
                                            <span className="text-sm text-gray-800 dark:text-gray-200">{u.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!groupIsSecret && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={groupVisible}
                                    onChange={(e) => setGroupVisible(e.target.checked)}
                                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                    <label className="font-semibold text-gray-700 dark:text-gray-300">Visible to All</label>
                                    <p className="text-xs text-gray-500">Uncheck to hide from non-admin users.</p>
                                </div>
                            </div>
                        )}
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsGroupModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300">Cancel</button>
                            <button onClick={handleGroupSubmit} className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700">{editingGroup ? "Update" : "Create Group"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Lead Modal */}
            {isViewModalOpen && viewingLead && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                👁️ View Lead Details
                                {viewingLead.leadNumber && (
                                    <span className="text-xs font-mono font-bold bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
                                        #{viewingLead.leadNumber}
                                    </span>
                                )}
                            </h3>
                            <button onClick={closeViewModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-2xl">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Name</label>
                                    <p className="font-medium text-gray-900 dark:text-white">{viewingLead.name}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(viewingLead.status)}`}>
                                        {viewingLead.status}
                                    </span>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Phone</label>
                                    <p className="font-medium text-gray-900 dark:text-white">{viewingLead.phone}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                                    <p className="font-medium text-gray-900 dark:text-white">{viewingLead.email || "-"}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Group</label>
                                    <p className="font-medium text-gray-900 dark:text-white">{viewingLead.group?.name || "-"}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Assigned by</label>
                                    <p className="font-medium text-gray-900 dark:text-white">{viewingLead.source}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Lead Type</label>
                                    <p className="font-medium text-gray-900 dark:text-white">{viewingLead.leadType || "General"}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Assigned To</label>
                                    <p className="font-medium text-gray-900 dark:text-white">{viewingLead.assignedTo?.name || "-"}</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Remarks History</label>
                                <div className="max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3">
                                    {viewingLead.remarks && viewingLead.remarks.length > 0 ? (
                                        viewingLead.remarks.map((remark, idx) => (
                                            <div key={idx} className="text-sm border-b last:border-0 border-gray-200 dark:border-gray-500 pb-2 last:pb-0">
                                                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{remark.text}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">
                                                    {format(new Date(remark.createdAt), "dd MMM yyyy HH:mm")}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        viewingLead.notes ? (
                                            <div className="text-sm">
                                                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{viewingLead.notes}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">Legacy Note</p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 text-center">No remarks found.</p>
                                        )
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Follow-up History</label>
                                <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3">
                                    {viewingLead.followUps && viewingLead.followUps.length > 0 ? (
                                        [...viewingLead.followUps]
                                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                                            .map((fu, idx) => (
                                                <div key={idx} className="text-sm border-b last:border-0 border-gray-200 dark:border-gray-500 pb-2 last:pb-0 space-y-1">
                                                    <div className="flex justify-between items-center text-xs font-bold text-orange-600 dark:text-orange-400">
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={12} />
                                                            Scheduled: {format(new Date(fu.date), "dd MMM yyyy HH:mm")}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">
                                                            By: {fu.createdBy?.name || "System"} | Added: {format(new Date(fu.createdAt), "dd MMM HH:mm")}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{fu.remark}</p>
                                                </div>
                                            ))
                                    ) : (
                                        <p className="text-sm text-gray-400 text-center">No scheduled follow-ups.</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button onClick={closeViewModal} className="px-6 py-2 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Client Modal */}
            {isClientViewModalOpen && viewingClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                👁️ Client Details
                                <button onClick={() => printClientDetails(viewingClient)} className="ml-2 text-gray-500 hover:text-blue-600" title="Print">🖨️</button>
                            </h3>
                            <button onClick={closeClientViewModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-2xl">&times;</button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Client Name</label>
                                    <p className="font-medium text-gray-900 dark:text-white">{viewingClient.clientName}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Group</label>
                                    <p className="font-medium text-gray-900 dark:text-white">{viewingClient.group?.name || "-"}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Legal Entity Name</label>
                                    <p className="font-medium text-gray-900 dark:text-white">{viewingClient.legalEntityName}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">GST / VAT No</label>
                                    <p className="font-medium text-gray-900 dark:text-white">{viewingClient.gstVatNo}</p>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                                <h4 className="font-semibold text-gray-800 dark:text-white mb-3">📍 Billing Address</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {viewingClient.billingAddress?.addressLine1}{viewingClient.billingAddress?.addressLine2 && `, ${viewingClient.billingAddress.addressLine2}`}<br />
                                    {viewingClient.billingAddress?.city}, {viewingClient.billingAddress?.distt}<br />
                                    {viewingClient.billingAddress?.state} - {viewingClient.billingAddress?.zipCode}<br />
                                    {viewingClient.billingAddress?.country}
                                </p>
                            </div>

                            {viewingClient.dispatchAddress && (
                                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                                    <h4 className="font-semibold text-gray-800 dark:text-white mb-3">🚚 Dispatch Address</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                        {viewingClient.isDispatchAddressSame ? "Same as Billing Address" : (
                                            <>
                                                {viewingClient.dispatchAddress?.addressLine1}{viewingClient.dispatchAddress?.addressLine2 && `, ${viewingClient.dispatchAddress.addressLine2}`}<br />
                                                {viewingClient.dispatchAddress?.city}, {viewingClient.dispatchAddress?.distt}<br />
                                                {viewingClient.dispatchAddress?.state} - {viewingClient.dispatchAddress?.zipCode}<br />
                                                {viewingClient.dispatchAddress?.country}
                                            </>
                                        )}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 dark:border-gray-700 pt-4">
                                <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-white mb-3">👤 Contact Person 1</h4>
                                    <div className="text-sm space-y-1">
                                        <p><span className="text-gray-500">Name:</span> <span className="text-gray-900 dark:text-white font-medium">{viewingClient.contactPerson1?.name}</span></p>
                                        <p><span className="text-gray-500">Role:</span> <span className="text-gray-900 dark:text-white">{viewingClient.contactPerson1?.designation}</span></p>
                                        <p><span className="text-gray-500">Phone:</span> <span className="text-gray-900 dark:text-white">{viewingClient.contactPerson1?.phone}</span></p>
                                        <p><span className="text-gray-500">Email:</span> <span className="text-gray-900 dark:text-white">{viewingClient.contactPerson1?.email}</span></p>
                                    </div>
                                </div>
                                {viewingClient.contactPerson2?.name && (
                                    <div>
                                        <h4 className="font-semibold text-gray-800 dark:text-white mb-3">👤 Contact Person 2</h4>
                                        <div className="text-sm space-y-1">
                                            <p><span className="text-gray-500">Name:</span> <span className="text-gray-900 dark:text-white font-medium">{viewingClient.contactPerson2?.name}</span></p>
                                            <p><span className="text-gray-500">Role:</span> <span className="text-gray-900 dark:text-white">{viewingClient.contactPerson2?.designation}</span></p>
                                            <p><span className="text-gray-500">Phone:</span> <span className="text-gray-900 dark:text-white">{viewingClient.contactPerson2?.phone}</span></p>
                                            <p><span className="text-gray-500">Email:</span> <span className="text-gray-900 dark:text-white">{viewingClient.contactPerson2?.email}</span></p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end pt-4">
                                <button onClick={closeClientViewModal} className="px-6 py-2 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Client Modal */}
            {showClientModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl my-auto animate-fade-in relative">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 rounded-t-2xl">
                            <h3 className="font-bold text-gray-800 dark:text-white">{editingClient ? "Edit Client" : "Add New Client"}</h3>
                            <button onClick={() => setShowClientModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-2xl">&times;</button>
                        </div>

                        <div className="p-8">
                            <form onSubmit={handleClientSubmit} className="space-y-6">
                                {/* Group Selection */}
                                <div>
                                    <select
                                        name="group"
                                        value={clientFormData.group}
                                        onChange={handleClientChange}
                                        className="input-field-styled w-full"
                                        required
                                    >
                                        <option value="">Select Group *</option>
                                        {groups.map(g => (
                                            <option key={g._id} value={g._id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input name="clientName" placeholder="Client Name *" value={clientFormData.clientName} onChange={handleClientChange} required className="input-field-styled" />
                                    <input name="legalEntityName" placeholder="Legal Entity Name *" value={clientFormData.legalEntityName} onChange={handleClientChange} required className="input-field-styled" />
                                </div>

                                {/* Secret Client Toggle */}
                                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800">
                                    <input
                                        type="checkbox"
                                        checked={clientIsSecret}
                                        onChange={(e) => setClientIsSecret(e.target.checked)}
                                        className="w-5 h-5 rounded text-red-600 focus:ring-red-500"
                                    />
                                    <div>
                                        <label className="font-semibold text-gray-800 dark:text-white">Secret Client</label>
                                        <p className="text-xs text-gray-500">Only allowed users can see this client.</p>
                                    </div>
                                </div>

                                {clientIsSecret && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Allowed Users</label>
                                        <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-700">
                                            {users.map(u => (
                                                <div key={u._id} className="flex items-center gap-2 py-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={clientAllowedUsers.includes(u._id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setClientAllowedUsers([...clientAllowedUsers, u._id]);
                                                            } else {
                                                                setClientAllowedUsers(clientAllowedUsers.filter(id => id !== u._id));
                                                            }
                                                        }}
                                                        className="w-4 h-4 text-blue-600 rounded"
                                                    />
                                                    <span className="text-sm text-gray-800 dark:text-gray-200">{u.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Visibility Toggle (only if not secret) */}
                                {!clientIsSecret && (
                                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                        <input
                                            type="checkbox"
                                            name="isVisible"
                                            checked={clientFormData.isVisible !== false}
                                            onChange={handleClientChange}
                                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <div>
                                            <label className="font-semibold text-gray-700 dark:text-gray-300">Visible to All Users</label>
                                            <p className="text-xs text-gray-500">If unchecked, only admins can view this client.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Billing Address */}
                                <div className="flex justify-between items-center border-b dark:border-gray-700 pb-2 mb-2">
                                    <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-200">Billing Address</h3>
                                    <button
                                        type="button"
                                        onClick={() => setManualBilling(!manualBilling)}
                                        className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                    >
                                        {manualBilling ? "Switch to Selection" : "Enter Manually (+)"}
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input name="addressLine1" placeholder="Address Line 1 *" value={clientFormData.billingAddress.addressLine1} onChange={(e) => handleClientChange(e, 'billingAddress')} required className="input-field-styled" />
                                    <input name="addressLine2" placeholder="Address Line 2" value={clientFormData.billingAddress.addressLine2} onChange={(e) => handleClientChange(e, 'billingAddress')} className="input-field-styled" />

                                    {manualBilling ? (
                                        <>
                                            <input name="city" placeholder="City *" value={clientFormData.billingAddress.city} onChange={(e) => handleClientChange(e, 'billingAddress')} required className="input-field-styled" />
                                            <input name="distt" placeholder="District *" value={clientFormData.billingAddress.distt} onChange={(e) => handleClientChange(e, 'billingAddress')} required className="input-field-styled" />
                                            <input name="state" placeholder="State *" value={clientFormData.billingAddress.state} onChange={(e) => handleClientChange(e, 'billingAddress')} required className="input-field-styled" />
                                        </>
                                    ) : (
                                        <>
                                            {/* State Select */}
                                            <div className="flex flex-col">
                                                <select
                                                    name="state"
                                                    value={clientFormData.billingAddress.state}
                                                    onChange={(e) => handleClientChange(e, 'billingAddress')}
                                                    required
                                                    className="input-field-styled"
                                                >
                                                    <option value="">Select State *</option>
                                                    {Object.keys(locationData).sort().map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* District Select */}
                                            <div className="flex flex-col">
                                                <select
                                                    name="distt"
                                                    value={clientFormData.billingAddress.distt}
                                                    onChange={(e) => handleClientChange(e, 'billingAddress')}
                                                    required
                                                    className="input-field-styled"
                                                    disabled={!clientFormData.billingAddress.state}
                                                >
                                                    <option value="">Select District *</option>
                                                    {clientFormData.billingAddress.state && locationData[clientFormData.billingAddress.state] &&
                                                        Object.keys(locationData[clientFormData.billingAddress.state]).sort().map(dist => (
                                                            <option key={dist} value={dist}>{dist}</option>
                                                        ))
                                                    }
                                                </select>
                                            </div>

                                            {/* City Input */}
                                            <div className="flex flex-col">
                                                <input
                                                    type="text"
                                                    name="city"
                                                    placeholder="City *"
                                                    value={clientFormData.billingAddress.city}
                                                    onChange={(e) => handleClientChange(e, 'billingAddress')}
                                                    required
                                                    className="input-field-styled"
                                                />
                                            </div>
                                        </>
                                    )}

                                    <input name="zipCode" placeholder="ZIP Code *" value={clientFormData.billingAddress.zipCode} onChange={(e) => handleClientChange(e, 'billingAddress')} required className="input-field-styled" />
                                    <input 
                                        type="text"
                                        name="country" 
                                        value="India" 
                                        readOnly
                                        className="input-field-styled bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-70"
                                    />
                                </div>

                                <div className="w-full">
                                    <input name="gstVatNo" placeholder="GST / VAT No. *" value={clientFormData.gstVatNo} onChange={handleClientChange} required className="input-field-styled w-full" />
                                </div>

                                {/* Contact Person 1 */}
                                <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-200 border-b dark:border-gray-700 pb-2">Contact Person 1</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input name="name" placeholder="Name *" value={clientFormData.contactPerson1.name} onChange={(e) => handleClientChange(e, 'contactPerson1')} required className="input-field-styled" />
                                    <input 
                                        type="text"
                                        name="designation" 
                                        placeholder="Designation *" 
                                        value={clientFormData.contactPerson1.designation} 
                                        onChange={(e) => handleClientChange(e, 'contactPerson1')} 
                                        required 
                                        className="input-field-styled" 
                                    />
                                    <input name="phone" placeholder="Phone *" value={clientFormData.contactPerson1.phone} onChange={(e) => handleClientChange(e, 'contactPerson1')} required className="input-field-styled" />
                                    <input name="email" placeholder="Email *" value={clientFormData.contactPerson1.email} onChange={(e) => handleClientChange(e, 'contactPerson1')} required className="input-field-styled" />
                                </div>

                                {/* Contact Person 2 */}
                                <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-200 border-b dark:border-gray-700 pb-2">Contact Person 2</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input name="name" placeholder="Name" value={clientFormData.contactPerson2.name} onChange={(e) => handleClientChange(e, 'contactPerson2')} className="input-field-styled" />
                                    <input 
                                        type="text"
                                        name="designation" 
                                        placeholder="Designation" 
                                        value={clientFormData.contactPerson2.designation} 
                                        onChange={(e) => handleClientChange(e, 'contactPerson2')} 
                                        className="input-field-styled" 
                                    />
                                    <input name="phone" placeholder="Phone" value={clientFormData.contactPerson2.phone} onChange={(e) => handleClientChange(e, 'contactPerson2')} className="input-field-styled" />
                                    <input name="email" placeholder="Email" value={clientFormData.contactPerson2.email} onChange={(e) => handleClientChange(e, 'contactPerson2')} className="input-field-styled" />
                                </div>

                                {/* Dispatch Address */}
                                <div className="flex items-center gap-2 mt-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                    <input
                                        type="checkbox"
                                        name="isDispatchAddressSame"
                                        checked={clientFormData.isDispatchAddressSame}
                                        onChange={handleClientChange}
                                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <label className="text-gray-700 dark:text-gray-300 font-medium">Is Dispatching Address same as Billing?</label>
                                </div>

                                {!clientFormData.isDispatchAddressSame && (
                                    <>
                                        <div className="flex justify-between items-center border-b dark:border-gray-700 pb-2 mb-2">
                                            <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-200">Dispatch Address</h3>
                                            <button
                                                type="button"
                                                onClick={() => setManualDispatch(!manualDispatch)}
                                                className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                            >
                                                {manualDispatch ? "Switch to Selection" : "Enter Manually (+)"}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input name="addressLine1" placeholder="Address Line 1 *" value={clientFormData.dispatchAddress.addressLine1} onChange={(e) => handleClientChange(e, 'dispatchAddress')} required className="input-field-styled" />
                                            <input name="addressLine2" placeholder="Address Line 2" value={clientFormData.dispatchAddress.addressLine2} onChange={(e) => handleClientChange(e, 'dispatchAddress')} className="input-field-styled" />

                                            {manualDispatch ? (
                                                <>
                                                    <input name="state" placeholder="State *" value={clientFormData.dispatchAddress.state} onChange={(e) => handleClientChange(e, 'dispatchAddress')} required className="input-field-styled" />
                                                    <input name="distt" placeholder="District *" value={clientFormData.dispatchAddress.distt} onChange={(e) => handleClientChange(e, 'dispatchAddress')} required className="input-field-styled" />
                                                    <input name="city" placeholder="City *" value={clientFormData.dispatchAddress.city} onChange={(e) => handleClientChange(e, 'dispatchAddress')} required className="input-field-styled" />
                                                </>
                                            ) : (
                                                <>
                                                    {/* State Select */}
                                                    <div className="flex flex-col">
                                                        <select
                                                            name="state"
                                                            value={clientFormData.dispatchAddress.state}
                                                            onChange={(e) => handleClientChange(e, 'dispatchAddress')}
                                                            required
                                                            className="input-field-styled"
                                                        >
                                                            <option value="">Select State *</option>
                                                            {Object.keys(locationData).sort().map(state => (
                                                                <option key={state} value={state}>{state}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* District Select */}
                                                    <div className="flex flex-col">
                                                        <select
                                                            name="distt"
                                                            value={clientFormData.dispatchAddress.distt}
                                                            onChange={(e) => handleClientChange(e, 'dispatchAddress')}
                                                            required
                                                            className="input-field-styled"
                                                            disabled={!clientFormData.dispatchAddress.state}
                                                        >
                                                            <option value="">Select District *</option>
                                                            {clientFormData.dispatchAddress.state && locationData[clientFormData.dispatchAddress.state] &&
                                                                Object.keys(locationData[clientFormData.dispatchAddress.state]).sort().map(dist => (
                                                                    <option key={dist} value={dist}>{dist}</option>
                                                                ))
                                                            }
                                                        </select>
                                                    </div>

                                                    {/* City Input */}
                                                    <div className="flex flex-col">
                                                        <input
                                                            type="text"
                                                            name="city"
                                                            placeholder="City *"
                                                            value={clientFormData.dispatchAddress.city}
                                                            onChange={(e) => handleClientChange(e, 'dispatchAddress')}
                                                            required
                                                            className="input-field-styled"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            <input name="zipCode" placeholder="ZIP Code *" value={clientFormData.dispatchAddress.zipCode} onChange={(e) => handleClientChange(e, 'dispatchAddress')} required className="input-field-styled" />
                                            <input 
                                                type="text"
                                                name="country" 
                                                value="India" 
                                                readOnly
                                                className="input-field-styled bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-70"
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <button type="button" onClick={() => setShowClientModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                                    <button type="submit" className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                    <style>{`
                        .input-field-styled {
                            width: 100%;
                            padding: 0.5rem 1rem;
                            border-radius: 0.5rem;
                            border-width: 1px;
                            --tw-border-opacity: 1;
                            border-color: rgb(229 231 235 / var(--tw-border-opacity));
                            --tw-bg-opacity: 1;
                            background-color: rgb(249 250 251 / var(--tw-bg-opacity));
                            outline: 2px solid transparent;
                            outline-offset: 2px;
                        }
                        .dark .input-field-styled {
                            --tw-bg-opacity: 1;
                            background-color: rgb(55 65 81 / var(--tw-bg-opacity));
                            --tw-border-opacity: 1;
                            border-color: rgb(75 85 99 / var(--tw-border-opacity));
                            color: white;
                        }
                        .input-field-styled:focus {
                            --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
                            --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
                            box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
                            --tw-ring-opacity: 1;
                            --tw-ring-color: rgb(59 130 246 / var(--tw-ring-opacity));
                        }
                    `}</style>
                </div>
            )}
            {/* Quotation Modal */}
            {isQuotationModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-7xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">📝</span>
                                <h3 className="font-bold text-xl text-gray-800 dark:text-white">
                                    {editingQuotation
                                        ? (editingQuotation.quotationNumber?.startsWith("PI") ? "✏️ Edit Proforma Invoice" : "✏️ Edit Quotation")
                                        : "Create New Quotation"
                                    }
                                </h3>
                            </div>
                            <button onClick={closeQuotationModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-2xl">&times;</button>
                        </div>

                        <form onSubmit={handleQuotationSubmit} className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
                            <div className="flex-1 p-6 overflow-y-auto space-y-6 min-w-0">
                            {/* Header Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Lead</label>
                                    <select
                                        value={quotationFormData.lead}
                                        onChange={(e) => {
                                            const selectedLeadId = e.target.value;
                                            const l = eligibleLeads.find(lead => lead._id === selectedLeadId);
                                            setQuotationFormData(prev => ({
                                                ...prev,
                                                lead: selectedLeadId,
                                                leadNumber: l ? l.leadNumber : "",
                                                // Clear to trigger auto-fill useEffect
                                                billTo: { name: "", address: "", gstin: "" },
                                                shipTo: { name: "", address: "", gstin: "" }
                                            }));
                                        }}
                                        required
                                        disabled={!!editingQuotation}
                                        className={`w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-teal-500 outline-none dark:text-white ${editingQuotation ? 'opacity-60 cursor-not-allowed bg-gray-200 dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}`}
                                    >
                                        <option value="">Select a Lead...</option>
                                        {eligibleLeads.filter(l => l.status === 'Qualified' || l.status === 'Won' || (editingQuotation && (l._id === editingQuotation.lead?._id || l._id === editingQuotation.lead))).map(l => (
                                            <option key={l._id} value={l._id}>{l.leadNumber ? `${l.leadNumber} - ` : ""}{l.name} - {l.group?.name || 'No Group'}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Lead Number (Auto-fill)</label>
                                    <input
                                        type="text"
                                        value={quotationFormData.leadNumber || ""}
                                        readOnly
                                        className="w-full px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 border border-transparent focus:outline-none cursor-not-allowed dark:text-white font-mono"
                                        placeholder="Lead No."
                                    />
                                </div>
                            </div>


                            {/* Address Details (Editable) */}
                            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">Client Billing Information</h4>
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            const l = leads.find(lead => lead._id === quotationFormData.lead);
                                            if (l) {
                                                // Trigger auto-fill logic manually by clearing name
                                                setQuotationFormData(prev => ({
                                                    ...prev,
                                                    billTo: { ...prev.billTo, name: "" }
                                                }));
                                            } else {
                                                toast.error("Please select a lead first.");
                                            }
                                        }}
                                        className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold uppercase hover:bg-blue-200 transition-colors"
                                    >
                                        🔄 Refresh from Registry
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Bill To</label>
                                        <input
                                            type="text"
                                            placeholder="Client Billing Name"
                                            value={quotationFormData.billTo?.name || ""}
                                            onChange={(e) => setQuotationFormData(prev => ({ ...prev, billTo: { ...prev.billTo, name: e.target.value } }))}
                                            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm font-bold"
                                        />
                                        <textarea
                                            placeholder="Address"
                                            rows="2"
                                            value={quotationFormData.billTo?.address || ""}
                                            onChange={(e) => setQuotationFormData(prev => ({ ...prev, billTo: { ...prev.billTo, address: e.target.value } }))}
                                            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="GSTIN"
                                            value={quotationFormData.billTo?.gstin || ""}
                                            onChange={(e) => setQuotationFormData(prev => ({ ...prev, billTo: { ...prev.billTo, gstin: e.target.value } }))}
                                            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Ship To</label>
                                        <input
                                            type="text"
                                            placeholder="Consignee Name"
                                            value={quotationFormData.shipTo?.name || ""}
                                            onChange={(e) => setQuotationFormData(prev => ({ ...prev, shipTo: { ...prev.shipTo, name: e.target.value } }))}
                                            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm font-bold"
                                        />
                                        <textarea
                                            placeholder="Address"
                                            rows="2"
                                            value={quotationFormData.shipTo?.address || ""}
                                            onChange={(e) => setQuotationFormData(prev => ({ ...prev, shipTo: { ...prev.shipTo, address: e.target.value } }))}
                                            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="GSTIN"
                                            value={quotationFormData.shipTo?.gstin || ""}
                                            onChange={(e) => setQuotationFormData(prev => ({ ...prev, shipTo: { ...prev.shipTo, gstin: e.target.value } }))}
                                            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Products Table */}
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                                <h4 className="font-bold text-gray-800 dark:text-white">Items</h4>


                                {quotationFormData.products.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 text-sm">No items added yet. Click "+ Add Item" to start.</div>
                                ) : (
                                    <div className="space-y-4">
                                        {quotationFormData.products.map((item, index) => (
                                            <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 relative">
                                                <button type="button" onClick={() => removeQuotationItem(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-lg">&times;</button>

                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                                    <div className="md:col-span-2">
                                                        <label className="text-xs font-semibold text-gray-500 uppercase">Product (Auto-fill)</label>
                                                        <ProductSearchSelect
                                                            value={item.product}
                                                            onChange={(productObj) => handleQuotationItemChange(index, "product_obj", productObj)}
                                                            placeholder="Search Product by Name or Code..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-gray-500 uppercase">Brand</label>
                                                        <input
                                                            type="text"
                                                            value={item.brand || ""}
                                                            onChange={(e) => handleQuotationItemChange(index, "brand", e.target.value)}
                                                            placeholder="Brand"
                                                            className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-gray-500 uppercase">Part/Model No</label>
                                                        <input
                                                            type="text"
                                                            value={item.productNo || ""}
                                                            onChange={(e) => handleQuotationItemChange(index, "productNo", e.target.value)}
                                                            placeholder="Part Code"
                                                            className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="mb-3">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase">Description</label>
                                                    <input
                                                        type="text"
                                                        value={item.name || ""}
                                                        onChange={(e) => handleQuotationItemChange(index, "name", e.target.value)}
                                                        placeholder="Description"
                                                        className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                                    <div>
                                                        <label className="text-xs font-semibold text-gray-500 uppercase">HSN Code</label>
                                                        <input
                                                            type="text"
                                                            value={item.hsnCode || ""}
                                                            onChange={(e) => handleQuotationItemChange(index, "hsnCode", e.target.value)}
                                                            className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm text-center"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-gray-500 uppercase">UOM</label>
                                                        <input
                                                            type="text"
                                                            value={item.uom || ""}
                                                            onChange={(e) => handleQuotationItemChange(index, "uom", e.target.value)}
                                                            className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm text-center"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-gray-500 uppercase">Qty</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={(e) => handleQuotationItemChange(index, "quantity", parseFloat(e.target.value))}
                                                            className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm text-center"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-gray-500 uppercase">Unit Rate (₹)</label>
                                                        <input
                                                            type="number"
                                                            value={item.unitPrice}
                                                            onChange={(e) => handleQuotationItemChange(index, "unitPrice", parseFloat(e.target.value))}
                                                            className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm text-right"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-gray-500 uppercase">GST Rate (%)</label>
                                                        <input
                                                            type="number"
                                                            value={item.gstRate !== undefined ? item.gstRate : 18}
                                                            onChange={(e) => handleQuotationItemChange(index, "gstRate", parseFloat(e.target.value))}
                                                            className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm text-center"
                                                        />
                                                    </div>
                                                    <div className="bg-gray-50 dark:bg-gray-900 rounded p-1 text-right">
                                                        <label className="text-xs font-semibold text-gray-500 uppercase block">Total (₹)</label>
                                                        <span className="font-bold text-gray-800 dark:text-white text-sm">
                                                            {((item.quantity * item.unitPrice) * (1 + ((item.gstRate !== undefined ? item.gstRate : 18) / 100))).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}


                                {/* Add Item Button (Bottom) */}
                                <div className="flex justify-center mt-4">
                                    <button type="button" onClick={addQuotationItem} className="px-6 py-2 bg-teal-100 text-teal-700 rounded-full hover:bg-teal-200 text-sm font-bold shadow-sm transition-all">
                                        + Add New Item
                                    </button>
                                </div>

                                {/* Additional Charges */}
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className="text-sm text-gray-600 dark:text-gray-400">Installation Charges</label>
                                        <input
                                            type="number"
                                            value={quotationFormData.additionalCharges?.installation || 0}
                                            onChange={(e) => setQuotationFormData(prev => ({
                                                ...prev,
                                                additionalCharges: { ...(prev.additionalCharges || {}), installation: parseFloat(e.target.value) || 0 }
                                            }))}
                                            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-600 dark:text-gray-400">Freight/Cartage</label>
                                        <input
                                            type="number"
                                            value={quotationFormData.additionalCharges?.freight || 0}
                                            onChange={(e) => setQuotationFormData(prev => ({
                                                ...prev,
                                                additionalCharges: { ...(prev.additionalCharges || {}), freight: parseFloat(e.target.value) || 0 }
                                            }))}
                                            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 flex justify-end items-center gap-4">
                                    <span className="text-gray-500 dark:text-gray-400">Estimated Total (Inc. GST):</span>
                                    <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                                        ₹{(() => {
                                            const itemsTotal = quotationFormData.products.reduce((acc, item) => {
                                                const taxable = (item.quantity * item.unitPrice);
                                                const gst = taxable * ((item.gstRate !== undefined ? item.gstRate : 18) / 100);
                                                return acc + taxable + gst;
                                            }, 0);
                                            const charges = (quotationFormData.additionalCharges?.installation || 0) + (quotationFormData.additionalCharges?.freight || 0);
                                            const chargesGst = charges * 0.18;
                                            return (itemsTotal + charges + chargesGst).toFixed(2);
                                        })()}
                                    </span>
                                </div>
                            </div>



                            {/* Terms & Conditions (Editable) */}
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 space-y-3">
                                <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm uppercase">Terms & Conditions</h4>
                                <div className="flex flex-col gap-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Delivery Lead Time</label>
                                            <input
                                                type="text"
                                                value={quotationFormData.terms?.deliveryLeadTime || ""}
                                                onChange={(e) => setQuotationFormData(prev => ({ ...prev, terms: { ...prev.terms, deliveryLeadTime: e.target.value } }))}
                                                className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Payment Terms</label>
                                            <select
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    let termText = "";
                                                    if (val === "100% Advance") termText = "100% advance along with Purchase Order.";
                                                    else if (val === "Payable against Delivery Immediately") termText = "Payable against Delivery Immediately.";
                                                    else if (val === "30 days from Invoice") termText = "30 days from Invoice.";
                                                    else if (val === "45 days from Invoice") termText = "45 days from Invoice.";
                                                    else if (val === "50% Advance & Balance before dispatch") termText = "50% Advance & Balance before dispatch.";
                                                    else if (val === "50% Advance & Balance upon Delivery") termText = "50% Advance & Balance upon Delivery.";
                                                    else if (val === "70% Advance & Balance upon Delivery") termText = "70% Advance & Balance upon Delivery.";
                                                    else if (val === "As per Terms") termText = "";

                                                    setQuotationFormData((prev) => ({
                                                        ...prev,
                                                        termDetails: { ...prev.termDetails, paymentOption: val },
                                                        terms: { ...prev.terms, payment: termText }
                                                    }));
                                                }}
                                                className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm mb-2"
                                            >
                                                <option value="">Select Payment Term...</option>
                                                <option value="100% Advance">100% Advance</option>
                                                <option value="Payable against Delivery Immediately">Payable against Delivery Immediately</option>
                                                <option value="30 days from Invoice">30 days from Invoice</option>
                                                <option value="45 days from Invoice">45 days from Invoice</option>
                                                <option value="50% Advance & Balance before dispatch">50% Advance & Balance before dispatch</option>
                                                <option value="50% Advance & Balance upon Delivery">50% Advance & Balance upon Delivery</option>
                                                <option value="70% Advance & Balance upon Delivery">70% Advance & Balance upon Delivery</option>
                                                <option value="As per Terms">As per Terms</option>
                                            </select>

                                            <input
                                                type="text"
                                                value={quotationFormData.terms?.payment || ""}
                                                onChange={(e) => setQuotationFormData(prev => ({ ...prev, terms: { ...prev.terms, payment: e.target.value } }))}
                                                className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                                placeholder="Payment Terms Description"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Warranty</label>
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <select
                                                value={quotationFormData.termDetails?.warrantyMonths || "12"}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const type = quotationFormData.termDetails?.warrantyType || "Onsite";
                                                    const warrantyText = val === "0"
                                                        ? "No warranty applicable. No warranty on spare parts. Consumables, Wear and tear items, including rubber parts and bulbs, are not covered under warranty."
                                                        : `${val} months from the date of TeamInspire Invoice for Equipments. (${type}). No warranty on spare parts. Consumables, Wear and tear items, including rubber parts and bulbs, are not covered under warranty.`;
                                                    setQuotationFormData((prev) => ({
                                                        ...prev,
                                                        termDetails: { ...prev.termDetails, warrantyMonths: val },
                                                        terms: { ...prev.terms, warranty: warrantyText }
                                                    }));
                                                }}
                                                className="w-20 px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                            >
                                                {[0, 6, 12, 18, 24].map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">months from invoice date.</span>

                                            <select
                                                value={quotationFormData.termDetails?.warrantyType || "Onsite"}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const months = quotationFormData.termDetails?.warrantyMonths || "12";
                                                    setQuotationFormData((prev) => ({
                                                        ...prev,
                                                        termDetails: { ...prev.termDetails, warrantyType: val },
                                                        terms: { ...prev.terms, warranty: `${months} months from the date of TeamInspire Invoice for Equipments. (${val}). No warranty on spare parts. Consumables, Wear and tear items, including rubber parts and bulbs, are not covered under warranty.` }
                                                    }));
                                                }}
                                                className="w-28 px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                            >
                                                <option value="Onsite">Onsite</option>
                                                <option value="Offsite">Offsite</option>
                                            </select>
                                        </div>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 italic bg-white dark:bg-gray-800/50 p-2 rounded border border-indigo-50/50 dark:border-gray-700">{quotationFormData.terms?.warranty}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Delivery Terms</label>
                                            <input
                                                type="text"
                                                value={quotationFormData.terms?.deliveryTerms || ""}
                                                onChange={(e) => setQuotationFormData(prev => ({ ...prev, terms: { ...prev.terms, deliveryTerms: e.target.value } }))}
                                                className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Validity</label>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={quotationFormData.termDetails?.validityDays || "30"}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setQuotationFormData((prev) => ({
                                                            ...prev,
                                                            termDetails: { ...prev.termDetails, validityDays: val },
                                                            terms: { ...prev.terms, validity: `${val} Days from the date of PI.` }
                                                        }));
                                                    }}
                                                    className="w-24 px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                                >
                                                    {[15, 30, 60].map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Days from the date of PI.</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Remarks (T&C Item 12 - Optional)</label>
                                        <input
                                            type="text"
                                            value={quotationFormData.terms?.remark || ""}
                                            onChange={(e) => setQuotationFormData(prev => ({ ...prev, terms: { ...prev.terms, remark: e.target.value } }))}
                                            placeholder="Enter any custom remarks or notes for T&C section..."
                                            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => {
                                    // Construct temporary quotation object for preview
                                    const leadDoc = leads.find(l => l._id === quotationFormData.lead) || {};
                                    // Calculate totals for preview
                                    const processedPreviewProducts = quotationFormData.products.map(p => {
                                        const taxable = p.quantity * p.unitPrice;
                                        const gst = taxable * ((p.gstRate !== undefined ? p.gstRate : 18) / 100);
                                        return {
                                            ...p,
                                            // Handle potential missing product link if manually entered (though product id is there if selected)
                                            product: p.product ? products.find(prod => prod._id === p.product) : null,
                                            taxableAmount: taxable,
                                            gstAmount: gst,
                                            total: taxable + gst
                                        };
                                    });
                                    const itemsTotal = processedPreviewProducts.reduce((acc, p) => acc + p.total, 0);
                                    const charges = (quotationFormData.additionalCharges?.installation || 0) + (quotationFormData.additionalCharges?.freight || 0);
                                    const chargesGst = charges * 0.18;
                                    const grandTotal = itemsTotal + charges + chargesGst;

                                    const previewData = {
                                        quotationNumber: "PREVIEW",
                                        createdAt: new Date(),
                                        lead: leadDoc,
                                        billTo: quotationFormData.billTo,
                                        shipTo: quotationFormData.shipTo,
                                        products: processedPreviewProducts,
                                        additionalCharges: quotationFormData.additionalCharges || { installation: 0, freight: 0 },
                                        grandTotal: grandTotal,
                                        roundOff: 0,
                                        terms: quotationFormData.terms
                                    };
                                    printQuotation(previewData);
                                }} 
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition"
                                >
                                    Preview
                                </button>
                                <button
                                    type="button"
                                    onClick={closeQuotationModal}
                                    className="px-6 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingQuotation}
                                    className="px-8 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg transition transform active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmittingQuotation ? "Saving..." : (editingQuotation ? (editingQuotation.quotationNumber?.startsWith("PI") ? "Update PI" : "Update Quotation") : "Submit & Send")}
                                </button>
                            </div>
                            </div>

                            {/* Right Pane: Split 60% Remarks / 40% PO Details */}
                            <div className="w-full lg:w-[420px] xl:w-[460px] border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col overflow-hidden">
                                {/* === TOP 60%: Lead Remarks History === */}
                                <div style={{ flex: '0 0 60%' }} className="flex flex-col overflow-hidden border-b border-gray-200 dark:border-gray-700">
                                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center gap-2">
                                        <span>💬</span>
                                        <h4 className="font-bold text-gray-800 dark:text-white text-xs uppercase tracking-wider">Lead Remarks History</h4>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                        {activeQuotationLead ? (
                                            <>
                                                {/* Lead Info Summary Card */}
                                                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-2">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Active Lead</span>
                                                        <h5 className="font-bold text-gray-900 dark:text-white text-sm">{activeQuotationLead.name}</h5>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-50 dark:border-gray-700/50">
                                                        <div>
                                                            <span className="text-gray-400 block">Lead No.</span>
                                                            <span className="font-mono text-gray-700 dark:text-gray-300 font-bold">{activeQuotationLead.leadNumber || "-"}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400 block">Status</span>
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getStatusColor(activeQuotationLead.status)}`}>{activeQuotationLead.status}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Remarks Timeline */}
                                                <div className="space-y-2">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block pl-1">Timeline History</span>
                                                    <div className="relative border-l-2 border-teal-100 dark:border-teal-900 ml-3 pl-4 space-y-3">
                                                        {(() => {
                                                            const timelineEntries = [];
                                                            if (activeQuotationLead.notes) {
                                                                timelineEntries.push({ text: activeQuotationLead.notes, type: 'initial', createdAt: activeQuotationLead.createdAt });
                                                            }
                                                            if (activeQuotationLead.remarks && activeQuotationLead.remarks.length > 0) {
                                                                activeQuotationLead.remarks.forEach(rem => {
                                                                    timelineEntries.push({ text: rem.text, type: 'remark', createdAt: rem.createdAt });
                                                                });
                                                            }
                                                            timelineEntries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                                                            if (timelineEntries.length === 0) {
                                                                return <p className="text-xs text-gray-400 italic">No notes or remarks registered.</p>;
                                                            }
                                                            return timelineEntries.map((entry, idx) => (
                                                                <div key={idx} className="relative group">
                                                                    <span className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 border-teal-500 bg-white dark:bg-gray-800 transition-all group-hover:scale-125"></span>
                                                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-1 transition-all group-hover:shadow-md">
                                                                        <p className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{entry.text}</p>
                                                                        <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium">
                                                                            <span className="uppercase text-[9px] px-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                                                                                {entry.type === 'initial' ? 'Initial Note' : 'Remark'}
                                                                            </span>
                                                                            <span>{entry.createdAt ? format(new Date(entry.createdAt), "dd MMM yyyy HH:mm") : "-"}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ));
                                                        })()}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2">
                                                <span className="text-3xl">📝</span>
                                                <div>
                                                    <h5 className="font-bold text-gray-700 dark:text-gray-300 text-sm">No Lead Selected</h5>
                                                    <p className="text-xs text-gray-400 max-w-[180px] mt-1 font-medium">Select a qualified lead on the left to review their remarks history.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* === BOTTOM 40%: PO Details (only for PI) === */}
                                <div style={{ flex: '0 0 40%' }} className="flex flex-col overflow-hidden bg-gradient-to-b from-indigo-50/60 to-purple-50/40 dark:from-indigo-950/20 dark:to-purple-950/10">
                                    <div className="px-4 py-3 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span>🧾</span>
                                            <h4 className="font-bold text-indigo-700 dark:text-indigo-300 text-xs uppercase tracking-wider">PO Details</h4>
                                        </div>
                                        {editingQuotation?.quotationNumber?.startsWith("PI") && (
                                            <span className="text-[9px] font-black bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full uppercase tracking-widest">Proforma Invoice</span>
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4">
                                        {editingQuotation ? (
                                            <div className="space-y-3">
                                                {!editingQuotation?.quotationNumber?.startsWith("PI") && (
                                                    <p className="text-xs text-gray-400 italic bg-white dark:bg-gray-800 rounded-lg p-3 border border-dashed border-gray-200 dark:border-gray-700">
                                                        💡 PO details will be available after converting this quotation to a Proforma Invoice (PI).
                                                    </p>
                                                )}
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">PO Number</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Enter Purchase Order No."
                                                        value={quotationFormData.poNumber || ""}
                                                        onChange={e => setQuotationFormData(prev => ({ ...prev, poNumber: e.target.value }))}
                                                        disabled={!editingQuotation?.quotationNumber?.startsWith("PI")}
                                                        className="w-full px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800/50 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed placeholder-gray-300"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">PO Date</label>
                                                    <input
                                                        type="date"
                                                        value={quotationFormData.poDate || ""}
                                                        onChange={e => setQuotationFormData(prev => ({ ...prev, poDate: e.target.value }))}
                                                        disabled={!editingQuotation?.quotationNumber?.startsWith("PI")}
                                                        className="w-full px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800/50 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                                    />
                                                </div>
                                                {editingQuotation?.quotationNumber?.startsWith("PI") && (
                                                    <button
                                                        type="button"
                                                        onClick={handleSavePODetails}
                                                        disabled={isSubmittingQuotation}
                                                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                                    >
                                                        {isSubmittingQuotation ? "Saving..." : "💾 Save PO Details"}
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2">
                                                <span className="text-2xl">🧾</span>
                                                <p className="text-xs text-gray-400 font-medium">Open an existing quotation to enter PO details.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* WhatsApp Disabled Feature Modal */}
            {isWhatsAppModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in border border-gray-100 dark:border-gray-700 transform transition-all duration-300 hover:scale-[1.01]">
                        
                        {/* Gradient Decorative Header */}
                        <div className="bg-gradient-to-r from-green-500 via-emerald-600 to-teal-700 h-2 w-full"></div>
                        
                        <div className="p-8 space-y-6 text-center">
                            
                            {/* Animated Glowing Icon Wrapper */}
                            <div className="mx-auto w-20 h-20 bg-green-50 dark:bg-green-950/40 rounded-full flex items-center justify-center border-4 border-green-100 dark:border-green-900/30 relative">
                                <span className="absolute inset-0 rounded-full bg-green-400/20 dark:bg-green-500/10 animate-ping"></span>
                                <svg 
                                    className="w-10 h-10 text-green-500 dark:text-green-400 relative z-10" 
                                    viewBox="0 0 24 24" 
                                    fill="currentColor"
                                >
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                            </div>

                            {/* Text Details */}
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                    WhatsApp Messaging Locked
                                </h3>
                                <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest bg-green-50 dark:bg-green-950/40 py-1.5 px-3 rounded-full w-fit mx-auto border border-green-100 dark:border-green-900/30">
                                    Premium Feature Add-on
                                </p>
                            </div>

                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                                Direct WhatsApp communication for <span className="font-bold text-gray-800 dark:text-gray-200">{whatsAppLead?.name || "this lead"}</span> is currently disabled in your workspace.
                            </p>

                            {/* Features list */}
                            <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 text-left space-y-2">
                                <div className="flex items-center gap-2.5 text-xs text-gray-600 dark:text-gray-300 font-semibold">
                                    <span className="text-green-500 font-bold">✓</span> Direct 1-Click Client Messaging
                                </div>
                                <div className="flex items-center gap-2.5 text-xs text-gray-600 dark:text-gray-300 font-semibold">
                                    <span className="text-green-500 font-bold">✓</span> Automated Quotation PDF Sharing
                                </div>
                                <div className="flex items-center gap-2.5 text-xs text-gray-600 dark:text-gray-300 font-semibold">
                                    <span className="text-green-500 font-bold">✓</span> Real-Time Read Receipts & History
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex flex-col gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsWhatsAppModalOpen(false);
                                        toast.error("Contacting Support: Please speak with your administration or email tech-support@company.com to upgrade your subscription plan.");
                                    }}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-black rounded-2xl shadow-lg shadow-green-500/20 hover:-translate-y-0.5 transition-all duration-200 active:scale-95 text-sm"
                                >
                                    Enable WhatsApp Feature
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsWhatsAppModalOpen(false)}
                                    className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-2xl transition-all duration-200 active:scale-95 text-sm"
                                >
                                    Dismiss
                                </button>
                            </div>
                            
                        </div>
                    </div>
                </div>
            )}

            {/* Follow-up Modal */}
            {isFollowUpModalOpen && followUpItem && (() => {
                const itemStatus = followUpType === "quotation" ? followUpItem.lead?.status : followUpItem.status;
                const isWonOrLost = itemStatus === "Won" || itemStatus === "Lost";
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in border border-gray-100 dark:border-gray-700 transform transition-all duration-300">
                            {/* Decorative Top Bar */}
                            <div className="bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 h-2 w-full"></div>
                            
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/30">
                                <h3 className="font-black text-gray-800 dark:text-white flex items-center gap-2 text-lg">
                                    <Flag className="text-red-500 fill-red-500" size={20} />
                                    {followUpType === "quotation" ? "Quotation Follow-up" : "Lead Follow-up"}
                                </h3>
                                <button onClick={closeFollowUpModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-2xl transition-colors">&times;</button>
                            </div>
                            
                            <div className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                                {/* Summary Details */}
                                <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">
                                        {followUpType === "quotation" ? "Proposal Details" : "Lead Details"}
                                    </label>
                                    <p className="font-bold text-gray-900 dark:text-white text-base">
                                        {followUpType === "quotation" ? `${followUpItem.billTo?.name || "Proposal"}` : followUpItem.name}
                                    </p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                                        {followUpType === "quotation" ? `#${followUpItem.quotationNumber}` : followUpItem.leadNumber}
                                    </p>
                                </div>

                                {/* Follow-up History (Show History list) */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">Follow-up History</label>
                                    <div className="max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 space-y-3">
                                        {followUpItem.followUps && followUpItem.followUps.length > 0 ? (
                                            [...followUpItem.followUps]
                                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                                .map((fu, idx) => (
                                                    <div key={idx} className="text-xs border-b last:border-0 border-gray-200 dark:border-gray-700 pb-2 last:pb-0 space-y-1">
                                                        <div className="flex justify-between items-center font-bold text-orange-600 dark:text-orange-400">
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={11} />
                                                                F/U: {format(new Date(fu.date), "dd MMM yyyy HH:mm")}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">
                                                                By: {fu.createdBy?.name || "System"} | {format(new Date(fu.createdAt), "dd MMM HH:mm")}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-medium">{fu.remark}</p>
                                                    </div>
                                                ))
                                        ) : (
                                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center italic font-medium">No follow-ups recorded yet.</p>
                                        )}
                                    </div>
                                </div>

                                {/* New Follow-up Input Form */}
                                {isWonOrLost ? (
                                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700/50 space-y-3">
                                        <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 text-center space-y-2">
                                            <p className="text-sm font-bold text-red-700 dark:text-red-300 flex items-center justify-center gap-2">
                                                <span>⚠️ Follow-up Scheduling Disabled</span>
                                            </p>
                                            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                                                This lead is marked as <span className="font-extrabold uppercase">{itemStatus}</span>. Scheduling new follow-ups is disabled, but you can still view the past history.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={closeFollowUpModal}
                                            className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-2xl transition-all duration-200 active:scale-95 text-sm"
                                        >
                                            Close Window
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleFollowUpSubmit} className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Scheduled Date & Time *</label>
                                            <input
                                                type="datetime-local"
                                                required
                                                value={followUpDate}
                                                onChange={(e) => setFollowUpDate(e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                            />
                                        </div>
                                        
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Remark *</label>
                                                <span className={`text-[11px] font-bold ${(() => {
                                                    const wc = followUpRemark.trim().split(/\s+/).filter(Boolean).length;
                                                    return wc > 100 ? "text-red-500" : wc >= 90 ? "text-amber-500" : "text-gray-400 dark:text-gray-500";
                                                })()}`}>
                                                    Words: {followUpRemark.trim().split(/\s+/).filter(Boolean).length} / 100
                                                </span>
                                            </div>
                                            <textarea
                                                required
                                                rows={3}
                                                placeholder="Write follow-up details (maximum 100 words)..."
                                                value={followUpRemark}
                                                onChange={(e) => setFollowUpRemark(e.target.value)}
                                                className={`w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 outline-none transition-all resize-none ${(() => {
                                                    const wc = followUpRemark.trim().split(/\s+/).filter(Boolean).length;
                                                    return wc > 100 ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "border-gray-200 dark:border-gray-700 focus:ring-orange-500";
                                                })()}`}
                                            />
                                            {(() => {
                                                const wc = followUpRemark.trim().split(/\s+/).filter(Boolean).length;
                                                if (wc > 100) {
                                                    return (
                                                        <p className="text-[11px] text-red-500 font-semibold mt-1">
                                                            ⚠️ Error: Word limit exceeded! Please shorten by {wc - 100} word{wc - 100 > 1 ? "s" : ""}.
                                                        </p>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                        
                                        <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                                            <button
                                                type="button"
                                                onClick={closeFollowUpModal}
                                                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-2xl transition-all duration-200 active:scale-95 text-sm"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSubmittingFollowUp || followUpRemark.trim().split(/\s+/).filter(Boolean).length > 100 || !followUpRemark.trim()}
                                                className="flex-1 py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black rounded-2xl shadow-lg shadow-orange-500/20 hover:-translate-y-0.5 transition-all duration-200 active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                                            >
                                                {isSubmittingFollowUp ? "Saving..." : "Add Follow-up"}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};


export default TeamInspire;
