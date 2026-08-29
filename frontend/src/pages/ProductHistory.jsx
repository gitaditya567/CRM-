import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Edit2, Trash2, Plus, Search, Filter, RefreshCw } from "lucide-react";

const ProductHistory = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const [limit, setLimit] = useState(25);
    const [searchQuery, setSearchQuery] = useState("");
    const [brandFilter, setBrandFilter] = useState("All");
    const [typeFilter, setTypeFilter] = useState("All");
    const [brandsList, setBrandsList] = useState([]);

    // Fetch Brands metadata for filter dropdown
    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const res = await API.get("/products/meta");
                if (res.data?.brands) {
                    setBrandsList(res.data.brands);
                }
            } catch (err) {
                console.error("Failed to load brands:", err);
            }
        };
        fetchBrands();
    }, []);

    // Fetch Products with filters, search, and pagination
    const fetchProducts = async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("page", page);
            params.append("limit", limit);
            if (searchQuery.trim()) params.append("search", searchQuery.trim());
            if (brandFilter !== "All") params.append("brand", brandFilter);
            if (typeFilter !== "All") params.append("type", typeFilter);

            const res = await API.get(`/products/recent?${params.toString()}`);
            
            if (res.data && Array.isArray(res.data.products)) {
                setProducts(res.data.products);
                setTotalPages(res.data.pages || 1);
                setTotalProducts(res.data.total || 0);
                setCurrentPage(res.data.page || 1);
            } else if (Array.isArray(res.data)) {
                setProducts(res.data);
                setTotalPages(1);
                setTotalProducts(res.data.length);
            } else {
                setProducts([]);
            }
        } catch (err) {
            console.error("Failed to fetch products:", err);
            toast.error("Failed to fetch products: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch when filters, limit, or search change
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchProducts(1);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, brandFilter, typeFilter, limit]);

    // Delete handler
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) return;

        try {
            await API.delete(`/products/${id}`);
            toast.success("Product deleted successfully");
            if (products.length === 1 && currentPage > 1) {
                fetchProducts(currentPage - 1);
            } else {
                fetchProducts(currentPage);
            }
        } catch (err) {
            console.error("Delete failed", err);
            toast.error("Failed to delete product");
        }
    };

    const clearSearch = () => {
        setSearchQuery("");
        setBrandFilter("All");
        setTypeFilter("All");
        fetchProducts(1);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 py-6 px-4 md:px-8 font-sans">
            <div className="w-full space-y-6">

                {/* Header & Stats Banner */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                            Product History & Inventory
                            <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full font-mono">
                                {totalProducts} Total Items
                            </span>
                        </h2>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Complete catalog of all spare parts and equipment with real-time stock levels, pricing, and actions.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={() => navigate("/add-product")}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-md transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
                        >
                            <Plus size={15} /> Add New Product
                        </button>
                    </div>
                </div>

                {/* Filter & Search Bar Toolbar */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
                        {/* Search Input */}
                        <div className="relative w-full md:w-72">
                            <input
                                type="text"
                                placeholder="Search by name, code, brand..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Item Type Filter */}
                        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
                            <span className="text-gray-400 font-semibold">Type:</span>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="bg-transparent border-none outline-none font-bold text-gray-700 dark:text-gray-200 cursor-pointer"
                            >
                                <option value="All" className="dark:bg-gray-800">All Types</option>
                                <option value="Spare Part" className="dark:bg-gray-800">Spare Parts</option>
                                <option value="Equipment" className="dark:bg-gray-800">Equipment</option>
                            </select>
                        </div>

                        {/* Brand Filter */}
                        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
                            <span className="text-gray-400 font-semibold">Brand:</span>
                            <select
                                value={brandFilter}
                                onChange={(e) => setBrandFilter(e.target.value)}
                                className="bg-transparent border-none outline-none font-bold text-gray-700 dark:text-gray-200 cursor-pointer max-w-[140px]"
                            >
                                <option value="All" className="dark:bg-gray-800">All Brands</option>
                                {brandsList.map((b) => (
                                    <option key={b} value={b} className="dark:bg-gray-800">{b}</option>
                                ))}
                            </select>
                        </div>

                        {(searchQuery || brandFilter !== "All" || typeFilter !== "All") && (
                            <button
                                onClick={clearSearch}
                                className="text-xs text-red-500 hover:text-red-700 font-semibold cursor-pointer px-2 py-1"
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>

                    {/* Page Limit Selector */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 self-end md:self-auto">
                        <span>Show:</span>
                        <select
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 font-bold text-gray-800 dark:text-gray-200 cursor-pointer outline-none"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span>rows per page</span>
                    </div>
                </div>

                {/* Main Products Table */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-all">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1200px] text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100/90 dark:bg-gray-700/80 border-b border-gray-200 dark:border-gray-600 text-[11px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                    <th className="px-5 py-4 w-32 min-w-[110px]">BRAND</th>
                                    <th className="px-5 py-4 w-28 min-w-[95px]">TYPE</th>
                                    <th className="px-5 py-4 min-w-[280px]">PRODUCT NAME / DESCRIPTION</th>
                                    <th className="px-5 py-4 w-36 min-w-[130px]">PART CODE</th>
                                    <th className="px-5 py-4 w-28 min-w-[100px] text-center">STOCK (UM)</th>
                                    <th className="px-5 py-4 w-32 min-w-[110px]">DATE ADDED</th>
                                    <th className="px-5 py-4 w-32 min-w-[110px] text-right">DEALER PRICE</th>
                                    <th className="px-5 py-4 w-32 min-w-[110px] text-right">RETAILER PRICE</th>
                                    <th className="px-5 py-4 w-44 min-w-[160px] text-center sticky right-0 bg-gray-100/95 dark:bg-gray-700/95 z-10 shadow-[-4px_0_10px_rgba(0,0,0,0.06)]">
                                        ACTIONS
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-xs">
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-16 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center space-y-3">
                                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                                                <span className="font-bold uppercase tracking-wider text-xs text-gray-400">Loading catalog items...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : products.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-20 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center space-y-2">
                                                <span className="text-4xl">🔍</span>
                                                <p className="font-bold text-gray-700 dark:text-gray-300 text-sm">No products found matching your search.</p>
                                                <p className="text-xs text-gray-400">Try changing your search keywords or resetting filters.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    products.map((p) => (
                                        <tr key={p._id} className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors group">
                                            {/* Brand */}
                                            <td className="px-5 py-4 whitespace-nowrap font-bold text-gray-900 dark:text-gray-100">
                                                <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold">
                                                    {p.brand || "Generic"}
                                                </span>
                                            </td>

                                            {/* Type */}
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                    p.type === "Equipment" 
                                                        ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                                        : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                                }`}>
                                                    {p.type || "Spare Part"}
                                                </span>
                                            </td>

                                            {/* Name & Description */}
                                            <td className="px-5 py-4 text-gray-800 dark:text-gray-200">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-gray-900 dark:text-white leading-snug">
                                                        {p.name || p.description}
                                                    </span>
                                                    {p.description && p.description !== p.name && (
                                                        <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                                                            {p.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Part Code */}
                                            <td className="px-5 py-4 whitespace-nowrap font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                                <span className="bg-blue-50 dark:bg-blue-900/40 px-2 py-1 rounded border border-blue-100 dark:border-blue-800">
                                                    {p.productNo}
                                                </span>
                                            </td>

                                            {/* Stock & UM */}
                                            <td className="px-5 py-4 whitespace-nowrap text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-black font-mono inline-block ${
                                                    (p.quantity || 0) > 0
                                                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                                        : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                                                }`}>
                                                    {p.quantity || 0} {p.uom || "Nos"}
                                                </span>
                                            </td>

                                            {/* Date */}
                                            <td className="px-5 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400 font-medium">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-800 dark:text-gray-200">
                                                        {format(new Date(p.createdAt), "dd MMM yyyy")}
                                                    </span>
                                                    <span className="text-[10px] opacity-70">
                                                        {format(new Date(p.createdAt), "HH:mm")}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Dealer Price */}
                                            <td className="px-5 py-4 whitespace-nowrap text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                                ₹{p.dealerPriceINR ? Number(p.dealerPriceINR).toLocaleString("en-IN") : "0"}
                                            </td>

                                            {/* Retail Price */}
                                            <td className="px-5 py-4 whitespace-nowrap text-right font-black text-gray-900 dark:text-white font-mono">
                                                ₹{p.retailPriceINR ? Number(p.retailPriceINR).toLocaleString("en-IN") : "0"}
                                            </td>

                                            {/* Actions (Sticky Right Column with full Edit and Delete buttons) */}
                                            <td className="px-5 py-4 whitespace-nowrap text-center sticky right-0 bg-white dark:bg-gray-800 z-10 shadow-[-4px_0_10px_rgba(0,0,0,0.06)] group-hover:bg-blue-50/40 dark:group-hover:bg-gray-800">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => navigate(`/edit-product/${p._id}`)}
                                                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                                        title="Edit Product Details"
                                                    >
                                                        <Edit2 size={12} /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(p._id)}
                                                        className="px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                                        title="Delete Product"
                                                    >
                                                        <Trash2 size={12} /> Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Bar */}
                    {!loading && totalProducts > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-t border-gray-200 dark:border-gray-600 flex flex-col md:flex-row justify-between items-center gap-4">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                Showing <strong className="text-gray-900 dark:text-white font-bold">{products.length}</strong> of <strong className="text-gray-900 dark:text-white font-bold">{totalProducts}</strong> products (Page {currentPage} of {totalPages})
                            </span>

                            {/* Pagination Buttons */}
                            {totalPages > 1 && (
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => fetchProducts(1)}
                                        disabled={currentPage === 1 || loading}
                                        className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                    >
                                        First
                                    </button>
                                    <button
                                        onClick={() => fetchProducts(currentPage - 1)}
                                        disabled={currentPage === 1 || loading}
                                        className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                    >
                                        Prev
                                    </button>

                                    <div className="flex gap-1">
                                        {[...Array(totalPages)].map((_, i) => {
                                            const pageNum = i + 1;
                                            if (
                                                totalPages > 7 &&
                                                pageNum !== 1 &&
                                                pageNum !== totalPages &&
                                                Math.abs(pageNum - currentPage) > 2
                                            ) {
                                                if (Math.abs(pageNum - currentPage) === 3) return <span key={pageNum} className="px-1 text-gray-400 text-xs">...</span>;
                                                return null;
                                            }
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => fetchProducts(pageNum)}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                        currentPage === pageNum
                                                            ? "bg-blue-600 text-white shadow-sm"
                                                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                                    }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => fetchProducts(currentPage + 1)}
                                        disabled={currentPage === totalPages || loading}
                                        className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                    >
                                        Next
                                    </button>
                                    <button
                                        onClick={() => fetchProducts(totalPages)}
                                        disabled={currentPage === totalPages || loading}
                                        className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                    >
                                        Last
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ProductHistory;
