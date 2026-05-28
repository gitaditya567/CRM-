import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import toast from "react-hot-toast";

import { format } from "date-fns";

const ProductHistory = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);

    // Fetch products
    const fetchProducts = async (page = 1) => {
        setLoading(true);
        try {
            console.log(`Fetching recent products (Page ${page})...`);
            const res = await API.get(`/products/recent?page=${page}&limit=5`);
            console.log("Recent products response:", res.data);
            
            // Handle paginated response
            if (res.data && Array.isArray(res.data.products)) {
                setProducts(res.data.products);
                setTotalPages(res.data.pages || 1);
                setTotalProducts(res.data.total || 0);
                setCurrentPage(res.data.page || 1);
            } else if (Array.isArray(res.data)) {
                // Fallback for non-paginated response if any
                setProducts(res.data);
                setTotalPages(1);
                setTotalProducts(res.data.length);
            } else {
                console.error("API did not return expected format:", res.data);
                setProducts([]);
            }
        } catch (err) {
            toast.error("Failed to fetch products: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch handled by search effect below

    // Delete handler
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) return;

        try {
            await API.delete(`/products/${id}`);
            // If we're on the last page and delete the only item, go to previous page
            if (products.length === 1 && currentPage > 1) {
                fetchProducts(currentPage - 1);
            } else {
                fetchProducts(currentPage);
            }
            toast.success("Product deleted successfully");
        } catch (err) {
            console.error("Delete failed", err);
            toast.error("Failed to delete product");
        }
    };

    const [searchQuery, setSearchQuery] = useState("");

    // Search handler
    const performSearch = async (query) => {
        if (!query.trim()) {
            fetchProducts();
            return;
        }

        setLoading(true);
        try {
            const res = await API.get(`/products/search/${encodeURIComponent(query)}`);
            setProducts(res.data || []);
        } catch (err) {
            if (err.response?.status === 404) {
                setProducts([]);
            } else {
                console.error("Search failed", err);
            }
        } finally {
            setLoading(false);
        }
    };

    // Auto-search effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery) {
                performSearch(searchQuery);
            } else {
                // If cleared, fetch default recent products
                fetchProducts(1);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const clearSearch = () => {
        setSearchQuery("");
        fetchProducts();
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">

            <div className="p-6 md:p-12">
                <div className="max-w-6xl mx-auto space-y-6">

                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">
                                Product History
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400">
                                Manage recently added products (Spare Parts & Equipment).
                            </p>
                        </div>

                        {/* Search Bar */}
                        <form onSubmit={(e) => e.preventDefault()} className="flex gap-2 w-full md:w-auto relative">
                            <div className="relative w-full md:w-72">
                                <input
                                    type="text"
                                    placeholder="Search by name, code, brand..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={clearSearch}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                                        title="Clear search"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            <button
                                type="submit"
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition-all active:scale-95"
                            >
                                Search
                            </button>
                        </form>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-all">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">BRAND</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">PRODUCT NAME / DESCRIPTION</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">PART CODE</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">DATE ADDED</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">DEALER PRICE (INR)</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">RETAILER PRICE (INR)</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center text-gray-500">Loading...</td>
                                        </tr>
                                    ) : products.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center text-gray-500">No products found.</td>
                                        </tr>
                                    ) : (
                                        products.map((p) => (
                                            <tr key={p._id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 font-medium">
                                                    {p.brand}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={p.name || p.description}>
                                                    {p.name || p.description}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white font-mono">
                                                    {p.productNo}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">{format(new Date(p.createdAt), "dd MMM yyyy")}</span>
                                                        <span className="text-[10px] opacity-70">{format(new Date(p.createdAt), "HH:mm:ss")}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                                                    ₹{p.dealerPriceINR || 0}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                                                    ₹{p.retailPriceINR || 0}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                    <button
                                                        onClick={() => navigate(`/edit-product/${p._id}`)}
                                                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors mr-4"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(p._id)}
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                        title="Delete Product"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {!loading && (
                            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600 flex flex-col md:flex-row justify-between items-center gap-4">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {searchQuery 
                                        ? `Found ${products.length} matching items` 
                                        : `Showing ${products.length} of ${totalProducts} items (Page ${currentPage} of ${totalPages})`
                                    }
                                </span>

                                {/* Pagination Controls */}
                                {!searchQuery && totalPages > 1 && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => fetchProducts(currentPage - 1)}
                                            disabled={currentPage === 1 || loading}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Previous
                                        </button>
                                        
                                        <div className="flex gap-1">
                                            {[...Array(totalPages)].map((_, i) => {
                                                const pageNum = i + 1;
                                                // Show only nearby pages if totalPages is large
                                                if (
                                                    totalPages > 7 && 
                                                    pageNum !== 1 && 
                                                    pageNum !== totalPages && 
                                                    Math.abs(pageNum - currentPage) > 2
                                                ) {
                                                    if (Math.abs(pageNum - currentPage) === 3) return <span key={pageNum} className="px-2">...</span>;
                                                    return null;
                                                }
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => fetchProducts(pageNum)}
                                                        className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                                                            currentPage === pageNum
                                                                ? "bg-blue-600 text-white shadow-md"
                                                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
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
                                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ProductHistory;
