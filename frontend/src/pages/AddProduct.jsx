import React, { useState, useEffect, useRef } from "react";
import API from "../api/api";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

const DEFAULT_BRANDS = [];

const DEFAULT_CURRENCIES = ["USD", "EUR", "HKD", "GBP", "INR"];

const AddProduct = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [productType, setProductType] = useState("Spare Part");
    const [formData, setFormData] = useState({
        brand: "",
        productNo: "", // Maps to Part Code / Model Code
        name: "", // Maps to Part Name / Equipment Name
        description: "",
        hsnCode: "",
        currency: "USD",
        priceUSD: "",
        dealerPriceINR: "",
        retailPriceINR: "",
    });

    const [brands, setBrands] = useState(DEFAULT_BRANDS);
    const [currencies, setCurrencies] = useState(DEFAULT_CURRENCIES);

    // Removed isCustomBrand state
    const [isCustomCurrency, setIsCustomCurrency] = useState(false);

    // Custom Dropdown State
    const [isBrandOpen, setIsBrandOpen] = useState(false);
    const brandRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (brandRef.current && !brandRef.current.contains(event.target)) {
                setIsBrandOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch Meta Data (Existing Brands/Currencies)
    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const res = await API.get("/products/meta");
                if (res.data) {
                    const fetchedBrands = res.data.brands || [];
                    const fetchedCurrencies = res.data.currencies || [];

                    // Merge and sort Brands
                    const mergedBrands = Array.from(new Set([...DEFAULT_BRANDS, ...fetchedBrands])).sort();
                    setBrands(mergedBrands);

                    // Merge Currencies (keep default order roughly, or sort)
                    const mergedCurrencies = Array.from(new Set([...DEFAULT_CURRENCIES, ...fetchedCurrencies]));
                    setCurrencies(mergedCurrencies);
                }
            } catch (err) {
                console.error("Failed to fetch product meta data:", err);
            }
        };
        fetchMeta();
    }, []);


    useEffect(() => {
        if (isEdit) {
            const fetchProduct = async () => {
                setLoading(true);
                try {
                    const res = await API.get(`/products/${id}`);
                    const data = res.data;

                    // Normalize type
                    const pType = data.type === "Equipment" ? "Equipment" : "Spare Part";
                    setProductType(pType);

                    // Robust Data Loading: If name is missing but description exists, use description as name
                    const loadedName = data.name || data.description || "";
                    const loadedDescription = data.description || "";

                    setFormData({
                        brand: data.brand || "",
                        productNo: data.productNo || "",
                        name: loadedName,
                        description: loadedDescription,
                        hsnCode: data.hsnCode || "",
                        currency: data.currency || "USD",
                        priceUSD: data.priceUSD || "",
                        dealerPriceINR: data.dealerPriceINR || "",
                        retailPriceINR: data.retailPriceINR || "",
                    });

                    // If the fetched brand is not in our current list, it will naturally show up in the searchable input.

                    if (data.currency && !currencies.includes(data.currency)) {
                        setIsCustomCurrency(true);
                    }
                } catch (err) {
                    console.error("Fetch Error:", err);
                    toast.error("Failed to fetch product details");
                    navigate("/product-history");
                } finally {
                    setLoading(false);
                }
            };
            fetchProduct();
        }
    }, [id, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Prepare payload
            const payload = {
                type: productType,
                ...formData
            };

            // Clean up number fields
            if (!payload.dealerPriceINR) delete payload.dealerPriceINR;
            if (!payload.retailPriceINR) delete payload.retailPriceINR;

            if (isEdit) {
                await API.put(`/products/${id}`, payload);
                setLoading(false); // Update UI state before blocking dialog
                toast.success("✅ Product updated successfully!");
                navigate("/product-history");
            } else {
                await API.post("/products/create", payload);
                setLoading(false);
                
                // Keep the current brand and currency for adding more products from the same line
                toast.success("✅ Product added successfully!");
                
                // Reset form for next entry
                setFormData(prev => ({
                    ...prev,
                    productNo: "",
                    name: "",
                    description: "",
                    hsnCode: "",
                    priceUSD: "",
                    dealerPriceINR: "",
                    retailPriceINR: "",
                }));
            }
        } catch (err) {
            console.error("Add Product Error:", err);
            setLoading(false);
            toast.error(err.response?.data?.message || "❌ Failed to add product");
        }
    };

    const handleDeleteBrand = async (brandToDelete, e) => {
        if (e) e.stopPropagation();

        if (!brandToDelete) return;

        if (window.confirm(`Are you sure you want to delete "${brandToDelete}"?`)) {
            try {
                // If it's a custom brand, delete from backend
                if (!DEFAULT_BRANDS.includes(brandToDelete)) {
                    await API.delete(`/products/brand/${encodeURIComponent(brandToDelete)}`);
                }

                // Always remove from local list (session)
                setBrands(prev => prev.filter(b => b !== brandToDelete));

                // If the deleted brand was selected, clear it
                if (formData.brand === brandToDelete) {
                    setFormData(prev => ({ ...prev, brand: "" }));
                }

                toast.error(`Brand '${brandToDelete}' removed.`);

            } catch (err) {
                console.error("Delete Brand Error:", err);
                toast.error("Failed to delete brand.");
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">

            <div className="p-6 md:p-12">
                <div className="max-w-4xl mx-auto">

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-all">

                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
                            <h2 className="text-3xl font-extrabold tracking-tight">
                                {isEdit ? `Edit Product: ${formData.name}` : "Add New Product"}
                            </h2>
                            <p className="opacity-90 mt-2 text-blue-100">
                                {isEdit ? "Update product details." : "Enter details to add a new item to the inventory."}
                            </p>
                        </div>

                        <div className="p-8">
                            {/* Type Switcher */}
                            <div className="flex gap-4 mb-8 bg-gray-100 dark:bg-gray-700 p-1.5 rounded-xl w-fit">
                                {(!isEdit || productType === "Spare Part") && (
                                    <button
                                        type="button"
                                        onClick={() => !isEdit && setProductType("Spare Part")}
                                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${productType === "Spare Part"
                                            ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-md cursor-default"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                            }`}
                                    >
                                        Spare Part
                                    </button>
                                )}
                                {(!isEdit || productType === "Equipment") && (
                                    <button
                                        type="button"
                                        onClick={() => !isEdit && setProductType("Equipment")}
                                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${productType === "Equipment"
                                            ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-md cursor-default"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                            }`}
                                    >
                                        Equipment
                                    </button>
                                )}
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">

                                {/* Field Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    {/* Brand */}
                                    <div ref={brandRef}>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Brand</label>
                                        </div>

                                        <div className="relative">
                                            <div className="relative w-full">
                                                <input
                                                    type="text"
                                                    name="brand"
                                                    value={formData.brand}
                                                    onChange={(e) => {
                                                        handleChange(e);
                                                        setIsBrandOpen(true);
                                                    }}
                                                    onFocus={() => setIsBrandOpen(true)}
                                                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white pr-10"
                                                    placeholder="Select or type Brand..."
                                                    autoComplete="off"
                                                />
                                                <div 
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                                                    onClick={() => setIsBrandOpen(!isBrandOpen)}
                                                >
                                                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${isBrandOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>

                                            {isBrandOpen && (
                                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto">
                                                    {brands.filter(b => b.toLowerCase().includes(formData.brand.toLowerCase())).map((brand) => (
                                                        <div
                                                            key={brand}
                                                            className="flex justify-between items-center px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-700 dark:text-gray-200"
                                                            onClick={() => {
                                                                setFormData({ ...formData, brand });
                                                                setIsBrandOpen(false);
                                                            }}
                                                        >
                                                            <span>{brand}</span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleDeleteBrand(brand, e)}
                                                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                                                                title="Remove from list"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L10 10 5.707 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {brands.filter(b => b.toLowerCase() === formData.brand.toLowerCase()).length === 0 && formData.brand && (
                                                        <div 
                                                            className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-blue-600 dark:text-blue-400 font-semibold border-t border-gray-100 dark:border-gray-700"
                                                            onClick={() => {
                                                                const newBrand = formData.brand.trim();
                                                                if (newBrand) {
                                                                    if (!brands.includes(newBrand)) {
                                                                        setBrands([...brands, newBrand].sort());
                                                                    }
                                                                    setFormData({ ...formData, brand: newBrand });
                                                                    setIsBrandOpen(false);
                                                                }
                                                            }}
                                                        >
                                                            + Add "{formData.brand}"
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Code */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {productType === "Spare Part" ? "Part Code" : "Model Code"} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            name="productNo"
                                            value={formData.productNo}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                            placeholder={productType === "Spare Part" ? "Unique Part Code" : "Unique Model Code"}
                                            required
                                        />
                                    </div>

                                    {/* Name */}
                                    <div className={productType === "Equipment" ? "" : "md:col-span-2"}>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {productType === "Spare Part" ? "Part Name" : "Equipment Name"} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                            placeholder="Product Name"
                                            required
                                        />
                                    </div>

                                    {/* Description (Equipment Only) */}
                                    {productType === "Equipment" && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                            <input
                                                name="description"
                                                value={formData.description}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                                placeholder="Brief description"
                                            />
                                        </div>
                                    )}

                                    {/* HSN Code */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">HSN Code</label>
                                        <input
                                            name="hsnCode"
                                            value={formData.hsnCode}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                            placeholder="HSN Code"
                                        />
                                    </div>

                                    {/* Currency */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
                                            {isCustomCurrency && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setIsCustomCurrency(false); setFormData(prev => ({ ...prev, currency: "USD" })); }}
                                                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                                                >
                                                    Select from List
                                                </button>
                                            )}
                                        </div>

                                        {!isCustomCurrency ? (
                                            <select
                                                name="currency"
                                                value={formData.currency}
                                                onChange={(e) => {
                                                    if (e.target.value === "OTHER_CUSTOM") {
                                                        setIsCustomCurrency(true);
                                                        setFormData({ ...formData, currency: "" });
                                                    } else {
                                                        handleChange(e);
                                                    }
                                                }}
                                                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                            >
                                                {currencies.map((c) => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                                <option value="OTHER_CUSTOM" className="font-semibold text-blue-600 dark:text-blue-400">+ Add New Currency</option>
                                            </select>
                                        ) : (
                                            <input
                                                name="currency"
                                                value={formData.currency}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                                placeholder="Enter Currency (e.g., AUD)"
                                                required
                                                autoFocus
                                            />
                                        )}
                                    </div>

                                    {/* Price */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price ({formData.currency})</label>
                                        <input
                                            type="number"
                                            name="priceUSD"
                                            value={formData.priceUSD}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                            placeholder="0.00"
                                            step="0.01"
                                        />
                                    </div>

                                    {/* Dealer Price (Optional) */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dealer Price (INR) <span className="text-xs text-gray-400">(Optional)</span></label>
                                        <input
                                            type="number"
                                            name="dealerPriceINR"
                                            value={formData.dealerPriceINR}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                            placeholder="0.00"
                                            step="0.01"
                                        />
                                    </div>

                                    {/* Retail Price (Optional) */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Retail Price (INR) <span className="text-xs text-gray-400">(Optional)</span></label>
                                        <input
                                            type="number"
                                            name="retailPriceINR"
                                            value={formData.retailPriceINR}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                            placeholder="0.00"
                                            step="0.01"
                                        />
                                    </div>

                                </div>

                                {/* Actions */}
                                <div className="flex justify-end pt-6 border-t border-gray-100 dark:border-gray-700">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {loading ? "Saving..." : (isEdit ? "Update Product" : "Save Product")}
                                    </button>
                                </div>

                            </form>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AddProduct;
