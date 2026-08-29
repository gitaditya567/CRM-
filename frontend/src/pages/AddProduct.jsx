import React, { useState, useEffect, useRef } from "react";
import API from "../api/api";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";

const DEFAULT_BRANDS = [];
const DEFAULT_CURRENCIES = ["USD", "EUR", "HKD", "GBP", "INR"];
const DEFAULT_UOMS = ["Nos", "PCS", "SET", "MTR", "KG", "LTR", "BOX", "PAIR", "PKT", "ROLL", "UNIT"];

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
        uom: "Nos",
        currency: "USD",
        priceUSD: "",
        dealerPriceINR: "",
        retailPriceINR: "",
    });

    const [brands, setBrands] = useState(DEFAULT_BRANDS);
    const [currencies, setCurrencies] = useState(DEFAULT_CURRENCIES);
    const [uoms, setUoms] = useState(DEFAULT_UOMS);

    const [isCustomCurrency, setIsCustomCurrency] = useState(false);
    const [isCustomUom, setIsCustomUom] = useState(false);

    // Custom Dropdown State for Brand
    const [isBrandOpen, setIsBrandOpen] = useState(false);
    const brandRef = useRef(null);

    // Part Search & Selection State for Live Stock & Stock Operations
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [liveStock, setLiveStock] = useState(null);
    const [liveStockLoading, setLiveStockLoading] = useState(false);
    const searchRef = useRef(null);

    // Modals state
    const [showAddStockModal, setShowAddStockModal] = useState(false);
    const [showLedgerModal, setShowLedgerModal] = useState(false);
    const [ledgerData, setLedgerData] = useState([]);
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [ledgerSearch, setLedgerSearch] = useState("");

    // Add Stock Form State
    const [stockForm, setStockForm] = useState({
        piNo: "",
        invoiceNo: "",
        date: new Date().toISOString().split("T")[0],
        quantity: "",
        unitPrice: "",
        supplier: "",
        remarks: ""
    });
    const [stockSubmitting, setStockSubmitting] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (brandRef.current && !brandRef.current.contains(event.target)) {
                setIsBrandOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSearchDropdown(false);
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

                    const mergedBrands = Array.from(new Set([...DEFAULT_BRANDS, ...fetchedBrands])).sort();
                    setBrands(mergedBrands);

                    const mergedCurrencies = Array.from(new Set([...DEFAULT_CURRENCIES, ...fetchedCurrencies]));
                    setCurrencies(mergedCurrencies);
                }
            } catch (err) {
                console.error("Failed to fetch product meta data:", err);
            }
        };
        fetchMeta();
    }, []);

    // Fetch Live Stock for a product ID or productNo
    const fetchLiveStock = async (productId) => {
        if (!productId) return;
        setLiveStockLoading(true);
        try {
            const res = await API.get(`/products/${productId}/live-stock`);
            setLiveStock(res.data);
            if (res.data?.product) {
                setSelectedProduct(res.data.product);
            }
        } catch (err) {
            console.error("Failed to fetch live stock:", err);
        } finally {
            setLiveStockLoading(false);
        }
    };

    // Load Product details when in Edit mode
    useEffect(() => {
        if (isEdit) {
            const fetchProduct = async () => {
                setLoading(true);
                try {
                    const res = await API.get(`/products/${id}`);
                    const data = res.data;

                    const pType = data.type === "Equipment" ? "Equipment" : "Spare Part";
                    setProductType(pType);

                    const loadedName = data.name || data.description || "";
                    const loadedDescription = data.description || "";
                    const loadedUom = data.uom || "Nos";

                    setFormData({
                        brand: data.brand || "",
                        productNo: data.productNo || "",
                        name: loadedName,
                        description: loadedDescription,
                        hsnCode: data.hsnCode || "",
                        uom: loadedUom,
                        currency: data.currency || "USD",
                        priceUSD: data.priceUSD || "",
                        dealerPriceINR: data.dealerPriceINR || "",
                        retailPriceINR: data.retailPriceINR || "",
                    });

                    if (data.currency && !currencies.includes(data.currency)) {
                        setIsCustomCurrency(true);
                    }
                    if (loadedUom && !DEFAULT_UOMS.includes(loadedUom)) {
                        setIsCustomUom(true);
                    }

                    // Also fetch live stock for this product
                    fetchLiveStock(id);
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

    // ⚡ Real-Time Live Stock Match: As user types Brand Name / Part Name / Part Code in the Form
    useEffect(() => {
        if (isEdit) return; // In edit mode, product is already fixed by ID

        const hasInput = (formData.brand && formData.brand.trim().length >= 1) ||
                         (formData.name && formData.name.trim().length >= 2) ||
                         (formData.productNo && formData.productNo.trim().length >= 2);

        if (!hasInput) {
            if (!selectedProduct) {
                setLiveStock(null);
            }
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const params = new URLSearchParams();
                if (formData.brand) params.append("brand", formData.brand.trim());
                if (formData.name) params.append("name", formData.name.trim());
                if (formData.productNo) params.append("productNo", formData.productNo.trim());

                const res = await API.get(`/products/by-query/live-stock?${params.toString()}`);
                if (res.data) {
                    setLiveStock(res.data);
                    if (res.data.product?._id) {
                        setSelectedProduct(res.data.product);
                    }
                }
            } catch (err) {
                // If not in DB yet, preview as new item with 0 stock
                setLiveStock({
                    product: {
                        name: formData.name || "Product Name",
                        brand: formData.brand || "Brand",
                        productNo: formData.productNo || "Code",
                        uom: formData.uom || "Nos",
                        type: productType
                    },
                    onHand: 0,
                    reserved: 0,
                    incoming: 0,
                    inOpenQuotes: 0,
                    availableToSell: 0,
                    uom: formData.uom || "Nos",
                    isNew: true
                });
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [formData.brand, formData.name, formData.productNo, formData.uom, isEdit, productType]);

    // Top Search Bar autocomplete for existing parts
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!searchQuery || searchQuery.trim().length < 2) {
                setSearchResults([]);
                setIsSearching(false);
                return;
            }
            setIsSearching(true);
            try {
                const res = await API.get(`/products/search/${encodeURIComponent(searchQuery.trim())}`);
                setSearchResults(res.data || []);
                setShowSearchDropdown(true);
            } catch (err) {
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectSearchedProduct = (product) => {
        setSelectedProduct(product);
        setShowSearchDropdown(false);
        setSearchQuery(`${product.productNo} - ${product.name}`);
        
        // Also populate form with this product's data for easy review or edit
        setFormData({
            brand: product.brand || "",
            productNo: product.productNo || "",
            name: product.name || product.description || "",
            description: product.description || "",
            hsnCode: product.hsnCode || "",
            uom: product.uom || "Nos",
            currency: product.currency || "USD",
            priceUSD: product.priceUSD || "",
            dealerPriceINR: product.dealerPriceINR || "",
            retailPriceINR: product.retailPriceINR || "",
        });

        fetchLiveStock(product._id);
    };

    const handleClearSelectedProduct = () => {
        setSelectedProduct(null);
        setLiveStock(null);
        setSearchQuery("");
        setSearchResults([]);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                type: productType,
                ...formData
            };

            if (!payload.dealerPriceINR) delete payload.dealerPriceINR;
            if (!payload.retailPriceINR) delete payload.retailPriceINR;

            if (isEdit) {
                const res = await API.put(`/products/${id}`, payload);
                setLoading(false);
                toast.success("✅ Product updated successfully!");
                if (res.data?.product) {
                    fetchLiveStock(id);
                }
                navigate("/product-history");
            } else {
                const res = await API.post("/products/create", payload);
                setLoading(false);
                toast.success("✅ Product added successfully!");
                
                if (res.data?.product) {
                    setSelectedProduct(res.data.product);
                    fetchLiveStock(res.data.product._id);
                }

                // Reset form for next entry while keeping brand and currency
                setFormData(prev => ({
                    ...prev,
                    productNo: "",
                    name: "",
                    description: "",
                    hsnCode: "",
                    uom: prev.uom || "Nos",
                    priceUSD: "",
                    dealerPriceINR: "",
                    retailPriceINR: "",
                }));
            }
        } catch (err) {
            console.error("Add Product Error:", err);
            setLoading(false);
            toast.error(err.response?.data?.message || "❌ Failed to save product");
        }
    };

    const handleDeleteBrand = async (brandToDelete, e) => {
        if (e) e.stopPropagation();
        if (!brandToDelete) return;

        if (window.confirm(`Are you sure you want to delete "${brandToDelete}"?`)) {
            try {
                if (!DEFAULT_BRANDS.includes(brandToDelete)) {
                    await API.delete(`/products/brand/${encodeURIComponent(brandToDelete)}`);
                }
                setBrands(prev => prev.filter(b => b !== brandToDelete));
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

    // Open Stock Modal
    const handleOpenAddStock = () => {
        const target = selectedProduct || (liveStock?.product?._id ? liveStock.product : null) || (id ? { _id: id } : null);
        if (!target) {
            toast.error("Please enter/select a saved part first to add stock.");
            return;
        }
        setStockForm({
            piNo: "",
            invoiceNo: "",
            date: new Date().toISOString().split("T")[0],
            quantity: "",
            unitPrice: selectedProduct?.priceUSD || formData.priceUSD || "",
            supplier: "",
            remarks: ""
        });
        setShowAddStockModal(true);
    };

    // Submit Stock Addition
    const handleAddStockSubmit = async (e) => {
        e.preventDefault();
        const targetId = selectedProduct?._id || liveStock?.product?._id || id;
        if (!targetId) {
            toast.error("Please save or select the product first to record stock in ledger.");
            return;
        }
        if (!stockForm.quantity || Number(stockForm.quantity) <= 0) {
            toast.error("Please enter a valid quantity greater than 0.");
            return;
        }

        setStockSubmitting(true);
        try {
            await API.post(`/products/${targetId}/add-stock`, stockForm);
            toast.success("✅ Stock added to ledger successfully!");
            setShowAddStockModal(false);
            // Refresh live stock
            fetchLiveStock(targetId);
            if (showLedgerModal) {
                fetchLedger(targetId);
            }
        } catch (err) {
            console.error("Add Stock Error:", err);
            toast.error(err.response?.data?.message || "Failed to add stock.");
        } finally {
            setStockSubmitting(false);
        }
    };

    // Fetch and Open Ledger Modal
    const fetchLedger = async (productId) => {
        const targetId = productId || selectedProduct?._id || liveStock?.product?._id || id;
        if (!targetId) {
            toast.error("Please enter/select a saved part first to view ledger.");
            return;
        }
        setLedgerLoading(true);
        setShowLedgerModal(true);
        try {
            const res = await API.get(`/products/${targetId}/ledger`);
            setLedgerData(res.data || []);
        } catch (err) {
            console.error("Fetch Ledger Error:", err);
            toast.error("Failed to load stock ledger.");
            setLedgerData([]);
        } finally {
            setLedgerLoading(false);
        }
    };

    // Active Display Data for the Live Card (Priority: Live Form Input > Found DB Product)
    const isMatchedInDB = !!(selectedProduct?._id || liveStock?.product?._id || id);
    const activeName = formData.name || selectedProduct?.name || liveStock?.product?.name || "Enter Part Name...";
    const activeBrand = formData.brand || selectedProduct?.brand || liveStock?.product?.brand || "Brand";
    const activeProductNo = formData.productNo || selectedProduct?.productNo || liveStock?.product?.productNo || "Part Code";
    const activeUOM = formData.uom || selectedProduct?.uom || liveStock?.product?.uom || "Nos";
    const activeOnHand = liveStock ? liveStock.onHand : (selectedProduct?.quantity || 0);
    const activeReserved = liveStock ? liveStock.reserved : 0;
    const activeIncoming = liveStock ? liveStock.incoming : 0;
    const activeInOpenQuotes = liveStock ? liveStock.inOpenQuotes : 0;
    const activeAvailable = liveStock ? liveStock.availableToSell : (activeOnHand - activeReserved);

    const filteredLedger = ledgerData.filter(entry => {
        if (!ledgerSearch.trim()) return true;
        const q = ledgerSearch.toLowerCase();
        return (
            (entry.piNo && entry.piNo.toLowerCase().includes(q)) ||
            (entry.invoiceNo && entry.invoiceNo.toLowerCase().includes(q)) ||
            (entry.supplier && entry.supplier.toLowerCase().includes(q)) ||
            (entry.remarks && entry.remarks.toLowerCase().includes(q)) ||
            (entry.entryType && entry.entryType.toLowerCase().includes(q))
        );
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <div className="p-4 md:p-8 lg:p-10">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* Quick Part Finder / Search Bar to inspect stock & select item */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-4 md:p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-800 dark:text-white">Live Product & Stock Lookup</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Search by Part Code or Name to load existing item, or enter details below for live tracking</p>
                            </div>
                        </div>

                        {/* Search Input Box */}
                        <div className="relative w-full md:w-96" ref={searchRef}>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
                                    placeholder="Type part code (e.g. BRG-6204) or name..."
                                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-600 outline-none text-sm transition-all"
                                />
                                {isSearching ? (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : searchQuery ? (
                                    <button
                                        type="button"
                                        onClick={handleClearSelectedProduct}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        ✕
                                    </button>
                                ) : null}
                            </div>

                            {/* Search Dropdown Results */}
                            {showSearchDropdown && searchResults.length > 0 && (
                                <div className="absolute z-30 w-full mt-1.5 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                                    {searchResults.map((item) => (
                                        <div
                                            key={item._id}
                                            onClick={() => handleSelectSearchedProduct(item)}
                                            className="p-3 hover:bg-blue-50/70 dark:hover:bg-blue-900/30 cursor-pointer transition-colors flex justify-between items-center"
                                        >
                                            <div>
                                                <div className="font-semibold text-sm text-gray-900 dark:text-white">
                                                    {item.name || item.description}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 flex gap-2 mt-0.5">
                                                    <span className="font-mono font-medium text-blue-600 dark:text-blue-400">{item.productNo}</span>
                                                    {item.brand && <span>• {item.brand}</span>}
                                                    <span>• {item.uom || "Nos"}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.quantity > 0 ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}>
                                                    {item.quantity || 0} {item.uom || "Nos"}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content Grid: Left Form (7 cols) + Right Live Stock (5 cols) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                        {/* LEFT COLUMN: Add / Edit Product Form */}
                        <div className="lg:col-span-7">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-all">

                                {/* Header with Vibrant Gradient */}
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 md:p-8 text-white">
                                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                                        {isEdit ? `Edit Product: ${formData.name}` : "Add New Product"}
                                    </h2>
                                    <p className="opacity-90 mt-1.5 text-blue-100 text-sm">
                                        {isEdit ? "Update product details & unit of measurement." : "Enter Brand & Part details below to see live stock updates instantly."}
                                    </p>
                                </div>

                                <div className="p-6 md:p-8">
                                    {/* Type Switcher: Spare Part / Equipment */}
                                    <div className="flex gap-2 mb-8 bg-gray-100 dark:bg-gray-700 p-1.5 rounded-xl w-fit">
                                        {(!isEdit || productType === "Spare Part") && (
                                            <button
                                                type="button"
                                                onClick={() => !isEdit && setProductType("Spare Part")}
                                                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${productType === "Spare Part"
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
                                                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${productType === "Equipment"
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                            {/* Brand */}
                                            <div ref={brandRef}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                        Brand
                                                    </label>
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
                                                        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto">
                                                            {brands.filter(b => b.toLowerCase().includes(formData.brand.toLowerCase())).map((brand) => (
                                                                <div
                                                                    key={brand}
                                                                    className="flex justify-between items-center px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-700 dark:text-gray-200 text-sm"
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
                                                                    className="px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-blue-600 dark:text-blue-400 font-semibold border-t border-gray-100 dark:border-gray-700 text-sm"
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
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                    {productType === "Spare Part" ? "Part Code" : "Model Code"} <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    name="productNo"
                                                    value={formData.productNo}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-mono"
                                                    placeholder={productType === "Spare Part" ? "Unique Part Code" : "Unique Model Code"}
                                                    required
                                                />
                                            </div>

                                            {/* Name */}
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
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

                                            {/* UM (Unit of Measurement) Dropdown */}
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                        Unit of Measurement (UM) <span className="text-red-500">*</span>
                                                    </label>
                                                    {isCustomUom && (
                                                        <button
                                                            type="button"
                                                            onClick={() => { setIsCustomUom(false); setFormData(prev => ({ ...prev, uom: "Nos" })); }}
                                                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium"
                                                        >
                                                            Select Preset
                                                        </button>
                                                    )}
                                                </div>

                                                {!isCustomUom ? (
                                                    <select
                                                        name="uom"
                                                        value={formData.uom}
                                                        onChange={(e) => {
                                                            if (e.target.value === "CUSTOM_UOM") {
                                                                setIsCustomUom(true);
                                                                setFormData({ ...formData, uom: "" });
                                                            } else {
                                                                handleChange(e);
                                                            }
                                                        }}
                                                        className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-medium"
                                                    >
                                                        {uoms.map((u) => (
                                                            <option key={u} value={u}>{u}</option>
                                                        ))}
                                                        <option value="CUSTOM_UOM" className="font-semibold text-blue-600 dark:text-blue-400">+ Custom Unit...</option>
                                                    </select>
                                                ) : (
                                                    <input
                                                        name="uom"
                                                        value={formData.uom}
                                                        onChange={handleChange}
                                                        className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-medium"
                                                        placeholder="Enter Unit (e.g., Meter, Barrel)"
                                                        required
                                                        autoFocus
                                                    />
                                                )}
                                            </div>

                                            {/* HSN Code */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">HSN Code</label>
                                                <input
                                                    name="hsnCode"
                                                    value={formData.hsnCode}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                                    placeholder="HSN Code"
                                                />
                                            </div>

                                            {/* Description (for Equipment or Spare Part) */}
                                            {productType === "Equipment" && (
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                                    <input
                                                        name="description"
                                                        value={formData.description}
                                                        onChange={handleChange}
                                                        className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                                        placeholder="Brief equipment description"
                                                    />
                                                </div>
                                            )}

                                            {/* Currency */}
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Currency</label>
                                                    {isCustomCurrency && (
                                                        <button
                                                            type="button"
                                                            onClick={() => { setIsCustomCurrency(false); setFormData(prev => ({ ...prev, currency: "USD" })); }}
                                                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium"
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
                                                        className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-medium"
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

                                            {/* Price (in Currency) */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Price ({formData.currency})</label>
                                                <input
                                                    type="number"
                                                    name="priceUSD"
                                                    value={formData.priceUSD}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-mono"
                                                    placeholder="0.00"
                                                    step="0.01"
                                                />
                                            </div>

                                            {/* Dealer Price (Optional) */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                    Dealer Price (INR) <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    name="dealerPriceINR"
                                                    value={formData.dealerPriceINR}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-mono"
                                                    placeholder="0.00"
                                                    step="0.01"
                                                />
                                            </div>

                                            {/* Retail Price (Optional) */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                    Retail Price (INR) <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    name="retailPriceINR"
                                                    value={formData.retailPriceINR}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-mono"
                                                    placeholder="0.00"
                                                    step="0.01"
                                                />
                                            </div>

                                        </div>

                                        {/* Submit Action */}
                                        <div className="flex justify-end pt-6 border-t border-gray-100 dark:border-gray-700">
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed text-sm tracking-wide"
                                            >
                                                {loading ? "Saving..." : (isEdit ? "Update Product" : "Save Product")}
                                            </button>
                                        </div>

                                    </form>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Live Stock Screen (Matching Reference Mockup with Instant Form Sync) */}
                        <div className="lg:col-span-5 sticky top-8">
                            <div className="bg-[#0f172a] dark:bg-[#090d16] text-white rounded-2xl shadow-2xl p-6 border border-gray-800/80 transition-all flex flex-col space-y-5">

                                {/* Top Header: LIVE STOCK */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                                            LIVE STOCK
                                        </span>
                                        {liveStockLoading ? (
                                            <span className="text-xs text-blue-400 animate-pulse font-mono">Syncing...</span>
                                        ) : isMatchedInDB ? (
                                            <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-semibold">
                                                ● In Catalog
                                            </span>
                                        ) : (
                                            <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full font-semibold">
                                                ● Live Form Preview
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-lg md:text-xl font-extrabold text-white leading-tight">
                                        {activeName}
                                    </h3>
                                    <p className="text-xs text-gray-400 font-mono">
                                        {activeBrand} · {activeProductNo}
                                    </p>
                                </div>

                                {/* Main Card: AVAILABLE TO SELL / SHORTAGE */}
                                <div className={`${activeAvailable < 0 ? 'bg-[#2a1015] border-red-500/50' : 'bg-[#0d2818] border-emerald-500/40'} border rounded-xl p-5 shadow-inner transition-colors`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`block text-[11px] font-extrabold uppercase tracking-wider ${activeAvailable < 0 ? 'text-red-400' : 'text-emerald-400/90'}`}>
                                            AVAILABLE TO SELL
                                        </span>
                                        {activeAvailable < 0 && (
                                            <span className="text-[10px] bg-red-500/25 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                                                Order Needed
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-4xl md:text-5xl font-black tracking-tight ${activeAvailable < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {activeAvailable >= 0 ? `+${activeAvailable}` : activeAvailable}
                                        </span>
                                        <span className={`text-sm font-semibold ${activeAvailable < 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                                            {activeUOM}
                                        </span>
                                    </div>
                                    {activeAvailable < 0 && (
                                        <p className="text-[11px] text-red-300/90 mt-2 font-medium flex items-center gap-1">
                                            ⚠️ Shortage: {Math.abs(activeAvailable)} {activeUOM} more parts order required!
                                        </p>
                                    )}
                                </div>

                                {/* 2x2 Metric Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    {/* ON HAND */}
                                    <div className="bg-[#151c2e] border border-gray-800 rounded-xl p-3.5">
                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                                            ON HAND
                                        </span>
                                        <span className="text-2xl font-bold text-white tracking-tight">
                                            {activeOnHand}
                                        </span>
                                    </div>

                                    {/* RESERVED */}
                                    <div className="bg-[#151c2e] border border-gray-800 rounded-xl p-3.5">
                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center justify-between">
                                            RESERVED
                                            {activeReserved > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
                                        </span>
                                        <span className="text-2xl font-bold text-white tracking-tight">
                                            {activeReserved}
                                        </span>
                                    </div>

                                    {/* INCOMING */}
                                    <div className="bg-[#151c2e] border border-gray-800 rounded-xl p-3.5">
                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                                            INCOMING
                                        </span>
                                        <span className="text-2xl font-bold text-white tracking-tight">
                                            {activeIncoming}
                                        </span>
                                    </div>

                                    {/* IN OPEN QUOTES */}
                                    <div className="bg-[#151c2e] border border-gray-800 rounded-xl p-3.5">
                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                                            IN OPEN QUOTES
                                        </span>
                                        <span className="text-2xl font-bold text-white tracking-tight">
                                            {activeInOpenQuotes}
                                        </span>
                                    </div>
                                </div>

                                {/* Calculation Formula Footer */}
                                <div className="border border-dashed border-gray-700/80 rounded-xl py-3 px-4 text-center text-xs font-mono text-gray-400 bg-gray-900/40">
                                    {activeOnHand} on hand – {activeReserved} reserved = <span className={activeAvailable < 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{activeAvailable >= 0 ? `+${activeAvailable}` : activeAvailable} available</span>
                                    {activeAvailable < 0 && (
                                        <span className="block text-[11px] text-amber-400 font-semibold mt-1 font-sans">
                                            ({Math.abs(activeAvailable)} {activeUOM} more parts order krne hai)
                                        </span>
                                    )}
                                </div>

                                {/* Quick Actions */}
                                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                                    {/* Add Part in Stock Button */}
                                    <button
                                        type="button"
                                        onClick={handleOpenAddStock}
                                        disabled={!isMatchedInDB}
                                        className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-xs flex items-center justify-center gap-2"
                                        title={!isMatchedInDB ? "Save product or select an existing one to add stock" : "Add stock to inventory"}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Part in Stock
                                    </button>

                                    {/* Show Ledger Button */}
                                    <button
                                        type="button"
                                        onClick={() => fetchLedger(selectedProduct?._id || liveStock?.product?._id || id)}
                                        disabled={!isMatchedInDB}
                                        className="py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold rounded-xl border border-gray-700 transition-all transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-xs flex items-center justify-center gap-2"
                                        title={!isMatchedInDB ? "Save product or select an existing one to view ledger" : "View complete transaction ledger"}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Show Ledger
                                    </button>
                                </div>

                            </div>
                        </div>

                    </div>

                </div>
            </div>

            {/* ================= MODAL 1: ADD PART IN STOCK ================= */}
            {showAddStockModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 dark:border-gray-700">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold">Add Part to Stock</h3>
                                <p className="text-xs text-blue-100 mt-1 font-mono">
                                    {activeProductNo} • {activeName}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAddStockModal(false)}
                                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body / Form */}
                        <form onSubmit={handleAddStockSubmit} className="p-6 space-y-4">

                            {/* Current Stock Banner */}
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl flex justify-between items-center text-xs">
                                <span className="text-gray-600 dark:text-gray-300 font-medium">Current Stock on Hand:</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400 font-mono text-sm">
                                    {activeOnHand} {activeUOM}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* PI No */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        PI No / Ref <span className="text-gray-400">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. PI-2026-001"
                                        value={stockForm.piNo}
                                        onChange={(e) => setStockForm({ ...stockForm, piNo: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>

                                {/* Invoice No */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Invoice No <span className="text-gray-400">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. INV-99214"
                                        value={stockForm.invoiceNo}
                                        onChange={(e) => setStockForm({ ...stockForm, invoiceNo: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>

                                {/* Date */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={stockForm.date}
                                        onChange={(e) => setStockForm({ ...stockForm, date: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    />
                                </div>

                                {/* Qty */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Quantity to Add ({activeUOM}) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="e.g. 50"
                                        value={stockForm.quantity}
                                        onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Supplier & Unit Price */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Supplier / Vendor <span className="text-gray-400">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Supplier name"
                                        value={stockForm.supplier}
                                        onChange={(e) => setStockForm({ ...stockForm, supplier: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Unit Rate / Price <span className="text-gray-400">(Optional)</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={stockForm.unitPrice}
                                        onChange={(e) => setStockForm({ ...stockForm, unitPrice: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Remarks */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    Remarks / Notes <span className="text-gray-400">(Optional)</span>
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="e.g. Shipment received in good condition"
                                    value={stockForm.remarks}
                                    onChange={(e) => setStockForm({ ...stockForm, remarks: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                ></textarea>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setShowAddStockModal(false)}
                                    className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={stockSubmitting}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {stockSubmitting ? "Adding..." : "Add to Stock & Record Ledger"}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

            {/* ================= MODAL 2: SHOW STOCK LEDGER ================= */}
            {showLedgerModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
                        {/* Ledger Header */}
                        <div className="bg-gradient-to-r from-gray-900 via-blue-950 to-gray-900 p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-300 border border-blue-400/30 rounded-full text-xs font-mono font-bold">
                                        STOCK LEDGER
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono">
                                        {activeProductNo}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold mt-1 text-white">
                                    {activeName}
                                </h3>
                                <p className="text-xs text-gray-400">
                                    Brand: {activeBrand} • Unit: {activeUOM} • Current On Hand: <span className="text-emerald-400 font-bold font-mono">{activeOnHand} {activeUOM}</span>
                                </p>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <button
                                    onClick={() => {
                                        setShowLedgerModal(false);
                                        handleOpenAddStock();
                                    }}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                                >
                                    + Add New Entry
                                </button>
                                <button
                                    onClick={() => setShowLedgerModal(false)}
                                    className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center gap-4">
                            <div className="relative w-full max-w-xs">
                                <input
                                    type="text"
                                    placeholder="Filter by PI, Invoice, Supplier..."
                                    value={ledgerSearch}
                                    onChange={(e) => setLedgerSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                Total Entries: <span className="font-bold text-gray-800 dark:text-gray-200">{filteredLedger.length}</span>
                            </div>
                        </div>

                        {/* Ledger Data Table */}
                        <div className="overflow-x-auto overflow-y-auto flex-1 p-4">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 dark:bg-gray-700/70 text-gray-600 dark:text-gray-300 uppercase tracking-wider font-bold border-b border-gray-200 dark:border-gray-600">
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">PI No</th>
                                        <th className="px-4 py-3">Invoice No</th>
                                        <th className="px-4 py-3 text-right">Qty Added</th>
                                        <th className="px-4 py-3 text-right">Balance Stock</th>
                                        <th className="px-4 py-3">Supplier / Added By</th>
                                        <th className="px-4 py-3">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {ledgerLoading ? (
                                        <tr>
                                            <td colSpan="8" className="px-4 py-12 text-center text-gray-500">
                                                Loading stock ledger transactions...
                                            </td>
                                        </tr>
                                    ) : filteredLedger.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="px-4 py-16 text-center text-gray-400">
                                                <div className="flex flex-col items-center justify-center space-y-2">
                                                    <span className="text-3xl">📦</span>
                                                    <p className="font-semibold text-gray-500">No stock ledger entries found.</p>
                                                    <p className="text-xs text-gray-400">Click "+ Add New Entry" or "Add Part in Stock" to add the first order batch.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLedger.map((entry) => (
                                            <tr key={entry._id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-800 dark:text-gray-200">
                                                    {format(new Date(entry.date || entry.createdAt), "dd MMM yyyy")}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        entry.entryType === "IN" 
                                                            ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                                                            : entry.entryType === "OUT"
                                                            ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300"
                                                            : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                                                    }`}>
                                                        {entry.entryType === "IN" ? "Stock In" : entry.entryType}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap font-mono font-medium text-blue-600 dark:text-blue-400">
                                                    {entry.piNo || "—"}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-700 dark:text-gray-300">
                                                    {entry.invoiceNo || "—"}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-green-600 dark:text-green-400 font-mono">
                                                    +{entry.quantity} {activeUOM}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right font-black text-gray-900 dark:text-white font-mono">
                                                    {entry.balanceAfter} {activeUOM}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                    {entry.supplier || entry.createdBy?.name || "System"}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate" title={entry.remarks}>
                                                    {entry.remarks || "—"}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                Current Active Physical Stock: <strong className="text-gray-800 dark:text-gray-100">{activeOnHand} {activeUOM}</strong>
                            </span>
                            <button
                                onClick={() => setShowLedgerModal(false)}
                                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold"
                            >
                                Close
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};

export default AddProduct;
