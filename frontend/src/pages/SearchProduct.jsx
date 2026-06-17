import React, { useState, useEffect } from "react";
import API from "../api/api";
import { useSettings } from "../context/SettingsContext";


const SearchProduct = () => {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);

  const role = localStorage.getItem("role");
  const ALL_KEYS = ["brand", "description", "productNo", "dealerPriceINR", "retailPriceINR", "quantity"];
  const { uiSettings } = useSettings();
  const visibleFields = ALL_KEYS.filter(f => {
    if (role === "admin" || role === "superadmin") return true; // Admin/Superadmin sees all columns
    if (["productNo", "brand", "description"].includes(f)) return true; // Core identity always visible
    if (!uiSettings || !uiSettings.productColumns) return true;
    return uiSettings.productColumns[f] !== false;
  });

  const userRole = (role || "").toLowerCase();
  const isOnlyINR = (userRole === "staff" || userRole === "sales") && visibleFields.every(f => ["dealerPriceINR", "retailPriceINR"].includes(f));

  const search = async (searchQuery) => {
    if (!searchQuery) {
      setProducts([]);
      return;
    }
    try {
      const res = await API.get(`/products/search/${encodeURIComponent(searchQuery)}`);
      // backend now returns an array of matches
      setProducts(res.data || []);
    } catch (err) {
      if (err.response?.status === 404) {
        setProducts([]);
      } else {
        console.error(err);
        // toast.error("Search failed"); // Optional: suppress alert for auto-search to be less annoying
      }
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      search(query);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const highlight = (text) => {
    if (!query || !text) return text || "";
    try {
      return text.replace(
        new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi"),
        match => `<mark>${match}</mark>`
      );
    } catch (e) {
      return text;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">

      <div className="p-6 md:p-12">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Search Header */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-extrabold text-gray-800 dark:text-white tracking-tight transition-colors">
              {isOnlyINR ? "Check Price (INR)" : "Product Search"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto transition-colors">
              {isOnlyINR ? "Enter Product Code to see the price." : "Enter a product number to find details instantly."}
            </p>
          </div>

          {/* Search Input Area */}
          <form onSubmit={(e) => { e.preventDefault(); search(query); }} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row gap-4 max-w-3xl mx-auto border border-gray-100 dark:border-gray-700 transition-colors">
            <input
              className="flex-1 px-6 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-600 text-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all"
              placeholder={isOnlyINR ? "Enter Product Code..." : "Enter Product No..."}
              onChange={e => setQuery(e.target.value)}
              value={query}
            />
            <button
              type="submit"
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all transform active:scale-95"
            >
              Search
            </button>
          </form>

          {/* Results Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-all">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    {visibleFields.includes("brand") && <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Brand</th>}
                    {visibleFields.includes("description") && <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[300px]">Product Name & Description</th>}
                    {visibleFields.includes("productNo") && <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Part Code</th>}
                    {visibleFields.includes("quantity") && <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qty</th>}
                    {visibleFields.includes("dealerPriceINR") && <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dealer Price</th>}
                    {visibleFields.includes("retailPriceINR") && <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Retail Price</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {products.length > 0 ? (
                    products.map(p => (
                      <tr key={p._id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group">
                        {visibleFields.includes("brand") && (
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs font-bold uppercase tracking-wider">
                              {p.brand || "Generic"}
                            </span>
                          </td>
                        )}

                        {visibleFields.includes("description") && (
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900 dark:text-gray-100 mb-1" dangerouslySetInnerHTML={{ __html: highlight(p.name || p.description || "N/A") }} />
                              {p.description && p.description !== p.name && (
                                <span className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: highlight(p.description) }} />
                              )}
                            </div>
                          </td>
                        )}

                        {visibleFields.includes("productNo") && (
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-1 rounded border border-blue-100 dark:border-blue-800">
                              {p.productNo || "---"}
                            </span>
                          </td>
                        )}

                        {visibleFields.includes("quantity") && (
                          <td className="px-6 py-4 text-center">
                            <span className={`font-bold ${p.quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {p.quantity || 0}
                            </span>
                          </td>
                        )}

                        {visibleFields.includes("dealerPriceINR") && (
                          <td className="px-6 py-4 text-right font-black text-gray-900 dark:text-white">
                            {p.dealerPriceINR ? `₹${Number(p.dealerPriceINR).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : "-"}
                          </td>
                        )}

                        {visibleFields.includes("retailPriceINR") && (
                          <td className="px-6 py-4 text-right font-black text-blue-600 dark:text-blue-400">
                            {p.retailPriceINR ? `₹${Number(p.retailPriceINR).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : "-"}
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={visibleFields.length} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3 opacity-40">
                          <span className="text-4xl">🔍</span>
                          <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">
                            {query ? "No matching products found" : "Enter a search term above"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SearchProduct;
