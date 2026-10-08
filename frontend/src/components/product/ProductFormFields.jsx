import React, { useState, useEffect, useRef } from "react";

// Shared Add / Edit Product form — used by the Add Product page and the
// "Add new product" popup in the Quotation form, so both always stay identical.

export const DEFAULT_CURRENCIES = ["USD", "EUR", "HKD", "GBP", "INR"];
export const DEFAULT_UOMS = ["Nos", "PCS", "SET", "MTR", "KG", "LTR", "BOX", "PAIR", "PKT", "ROLL", "UNIT"];

export const EMPTY_PRODUCT_FORM = {
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
};

// Same payload the Add Product page sends to /products/create
export const buildProductPayload = (productType, formData) => {
    const payload = { type: productType, ...formData };
    if (!payload.dealerPriceINR) delete payload.dealerPriceINR;
    if (!payload.retailPriceINR) delete payload.retailPriceINR;
    return payload;
};

const inputCls = "w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white";
const labelCls = "block text-sm font-semibold text-gray-700 dark:text-gray-300";

export const ProductTypeSwitch = ({ productType, setProductType, locked = false }) => (
    <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1.5 rounded-xl w-fit">
        {["Spare Part", "Equipment"].map((t) => (
            (!locked || productType === t) && (
                <button
                    key={t}
                    type="button"
                    onClick={() => !locked && setProductType(t)}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${productType === t
                        ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-md cursor-default"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                >
                    {t}
                </button>
            )
        ))}
    </div>
);

const ProductFormFields = ({
    productType,
    formData,
    setFormData,
    brands,
    setBrands,
    currencies,
    uoms,
    isCustomUom,
    setIsCustomUom,
    isCustomCurrency,
    setIsCustomCurrency,
    onDeleteBrand, // optional (brand, event) => void
}) => {
    const [isBrandOpen, setIsBrandOpen] = useState(false);
    const brandRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (brandRef.current && !brandRef.current.contains(event.target)) setIsBrandOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Brand */}
            <div ref={brandRef}>
                <div className="flex justify-between items-center mb-1">
                    <label className={labelCls}>Brand</label>
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
                            className={`${inputCls} pr-10`}
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
                                    {onDeleteBrand && (
                                        <button
                                            type="button"
                                            onClick={(e) => onDeleteBrand(brand, e)}
                                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                                            title="Remove from list"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L10 10 5.707 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    )}
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
                <label className={`${labelCls} mb-1`}>
                    {productType === "Spare Part" ? "Part Code" : "Model Code"} <span className="text-red-500">*</span>
                </label>
                <input
                    name="productNo"
                    value={formData.productNo}
                    onChange={handleChange}
                    className={`${inputCls} font-mono`}
                    placeholder={productType === "Spare Part" ? "Unique Part Code" : "Unique Model Code"}
                    required
                />
            </div>

            {/* Name */}
            <div className="md:col-span-2">
                <label className={`${labelCls} mb-1`}>
                    {productType === "Spare Part" ? "Part Name" : "Equipment Name"} <span className="text-red-500">*</span>
                </label>
                <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={inputCls}
                    placeholder="Product Name"
                    required
                />
            </div>

            {/* UM (Unit of Measurement) Dropdown */}
            <div>
                <div className="flex justify-between items-center mb-1">
                    <label className={labelCls}>
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
                        className={`${inputCls} font-medium`}
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
                        className={`${inputCls} font-medium`}
                        placeholder="Enter Unit (e.g., Meter, Barrel)"
                        required
                        autoFocus
                    />
                )}
            </div>

            {/* HSN Code */}
            <div>
                <label className={`${labelCls} mb-1`}>HSN Code</label>
                <input
                    name="hsnCode"
                    value={formData.hsnCode}
                    onChange={handleChange}
                    className={inputCls}
                    placeholder="HSN Code"
                />
            </div>

            {/* Description (for Equipment) */}
            {productType === "Equipment" && (
                <div className="md:col-span-2">
                    <label className={`${labelCls} mb-1`}>Description</label>
                    <input
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className={inputCls}
                        placeholder="Brief equipment description"
                    />
                </div>
            )}

            {/* Currency */}
            <div>
                <div className="flex justify-between items-center mb-1">
                    <label className={labelCls}>Currency</label>
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
                        className={`${inputCls} font-medium`}
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
                        className={inputCls}
                        placeholder="Enter Currency (e.g., AUD)"
                        required
                        autoFocus
                    />
                )}
            </div>

            {/* Price (in Currency) */}
            <div>
                <label className={`${labelCls} mb-1`}>Price ({formData.currency})</label>
                <input
                    type="number"
                    name="priceUSD"
                    value={formData.priceUSD}
                    onChange={handleChange}
                    className={`${inputCls} font-mono`}
                    placeholder="0.00"
                    step="0.01"
                />
            </div>

            {/* Dealer Price (Optional) */}
            <div>
                <label className={`${labelCls} mb-1`}>
                    Dealer Price (INR) <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                    type="number"
                    name="dealerPriceINR"
                    value={formData.dealerPriceINR}
                    onChange={handleChange}
                    className={`${inputCls} font-mono`}
                    placeholder="0.00"
                    step="0.01"
                />
            </div>

            {/* Retail Price (Optional) */}
            <div>
                <label className={`${labelCls} mb-1`}>
                    Retail Price (INR) <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                    type="number"
                    name="retailPriceINR"
                    value={formData.retailPriceINR}
                    onChange={handleChange}
                    className={`${inputCls} font-mono`}
                    placeholder="0.00"
                    step="0.01"
                />
            </div>

        </div>
    );
};

export default ProductFormFields;
