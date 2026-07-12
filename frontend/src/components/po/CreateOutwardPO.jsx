import React, { useState, useEffect } from "react";
import API from "../../api/api";
import toast from "react-hot-toast";
import Skeleton from "../common/Skeleton";
import { Maximize2, Minimize2 } from "lucide-react";

const ProductSearchSelect = React.memo(({ value, onChange, placeholder = "Search Product..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

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
                    <Skeleton type="table" count={1} />
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
                                onChange(p);
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

const ShipperSearchSelect = React.memo(({ shippers, value, onChange, placeholder = "Search Shipper..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    
    useEffect(() => {
        if (value && value !== "ADD_NEW") {
            const sh = shippers.find(s => s._id === value);
            if (sh) setSearchTerm(sh.billingName);
        } else if (value === "ADD_NEW" || value === "") {
            setSearchTerm("");
        }
    }, [value, shippers]);

    const filtered = shippers.filter(s => s.billingName.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="relative">
            <input
                type="text"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-teal-500 outline-none dark:text-white transition-all"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsOpen(true);
                    if (e.target.value === "") onChange({ target: { value: "" } });
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            />
            {isOpen && (
                <div className="absolute z-50 w-full max-h-60 overflow-y-auto bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg mt-1">
                    <div
                        className="px-4 py-2 text-sm font-bold text-teal-600 cursor-pointer border-b border-gray-100 dark:border-gray-600 hover:bg-teal-50 dark:hover:bg-gray-600"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            onChange({ target: { value: "ADD_NEW" } });
                            setIsOpen(false);
                        }}
                    >
                        + Add New Shipper
                    </div>
                    {filtered.map(s => (
                        <div
                            key={s._id}
                            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-0"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onChange({ target: { value: s._id } });
                                setSearchTerm(s.billingName);
                                setIsOpen(false);
                            }}
                        >
                            {s.billingName}
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="px-4 py-2 text-sm text-gray-500">No shippers found.</div>
                    )}
                </div>
            )}
        </div>
    );
});

export default function CreateOutwardPO({ onClose, onSuccess, poToEdit }) {
    const [shippers, setShippers] = useState([]);
    const [isAddShipperModalOpen, setIsAddShipperModalOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [newShipperForm, setNewShipperForm] = useState({ billingName: "", address: "", gstin: "", consigneeName: "" });
    const [submitting, setSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        shipper: poToEdit ? (poToEdit.shipper?._id || poToEdit.shipper) : "",
        poNumber: poToEdit ? poToEdit.poNumber : "Auto-generated on Save",
        billTo: { 
            name: poToEdit?.shipper?.billingName || "", 
            address: poToEdit?.shipper?.address || "", 
            gstin: poToEdit?.shipper?.gstin || "" 
        },
        shipTo: { 
            name: poToEdit?.shipper?.consigneeName || "", 
            address: poToEdit?.shipper?.address || "", 
            gstin: poToEdit?.shipper?.gstin || "" 
        },
        products: poToEdit ? (poToEdit.products || []) : [],
        additionalCharges: { 
            installation: poToEdit ? (poToEdit.installationCharges || 0) : 0, 
            freight: poToEdit ? (poToEdit.freightCartage || 0) : 0 
        },
        terms: poToEdit?.terms || {
            deliveryLeadTime: "Stock items are subject to prior sales against subject to Force Majeure Clause.",
            payment: "",
            warranty: "12 months from the date of TeamInspire Invoice for Equipments. (Onsite). No warranty on spare parts. Consumables, Wear and tear items, including rubber parts and bulbs, are not covered under warranty.",
            deliveryTerms: "warehouse, Delhi is subject to prior sales and Force Majeure Clause.",
            validity: "30 Days from the date of PI.",
            remark: ""
        },
        termDetails: poToEdit?.termDetails || {
            paymentOption: "",
            warrantyMonths: "12",
            warrantyType: "Onsite",
            validityDays: "30"
        }
    });

    useEffect(() => {
        fetchShippers();
    }, []);

    const fetchShippers = async () => {
        try {
            const res = await API.get("/shippers");
            setShippers(res.data || []);
        } catch (err) {
            console.error("Error fetching shippers", err);
        }
    };

    const handleShipperSelect = (e) => {
        const shipperId = e.target.value;
        const shipper = shippers.find(s => s._id === shipperId);
        
        if (shipperId === "ADD_NEW") {
            setIsAddShipperModalOpen(true);
            setFormData(prev => ({ ...prev, shipper: "" }));
            return;
        }

        setFormData(prev => ({
            ...prev,
            shipper: shipperId,
            billTo: {
                name: shipper ? shipper.billingName : "",
                address: shipper ? shipper.address : "",
                gstin: shipper ? shipper.gstin : ""
            },
            shipTo: {
                name: shipper ? (shipper.consigneeName || "") : "",
                address: shipper ? shipper.address : "",
                gstin: shipper ? shipper.gstin : ""
            }
        }));
    };

    const handleAddShipperSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await API.post("/shippers", newShipperForm);
            toast.success("Shipper added successfully!");
            setShippers([res.data, ...shippers]);
            
            // Auto-select the newly added shipper
            setFormData(prev => ({
                ...prev,
                shipper: res.data._id,
                billTo: {
                    name: res.data.billingName,
                    address: res.data.address,
                    gstin: res.data.gstin || ""
                },
                shipTo: {
                    name: res.data.consigneeName || "",
                    address: res.data.address,
                    gstin: res.data.gstin || ""
                }
            }));
            
            setIsAddShipperModalOpen(false);
            setNewShipperForm({ billingName: "", address: "", gstin: "", consigneeName: "" });
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to add shipper");
        }
    };

    const addProductItem = () => {
        setFormData(prev => ({
            ...prev,
            products: [...prev.products, {
                product: "",
                productNo: "",
                name: "",
                brand: "",
                hsnCode: "",
                uom: "",
                quantity: 1,
                unitPrice: 0,
                gstRate: 18,
                total: 0
            }]
        }));
    };

    const removeProductItem = (index) => {
        setFormData(prev => ({
            ...prev,
            products: prev.products.filter((_, i) => i !== index)
        }));
    };

    const handleProductItemChange = (index, field, value) => {
        setFormData(prev => {
            const updated = [...prev.products];
            
            if (field === "product_obj") {
                if (value) {
                    updated[index] = {
                        ...updated[index],
                        product: value._id,
                        productNo: value.productNo,
                        name: value.name,
                        brand: value.brand,
                        hsnCode: value.hsnCode || "",
                        uom: value.uom || "Nos",
                        unitPrice: value.retailPriceINR || 0,
                        gstRate: value.gstRate || 18,
                        total: (value.retailPriceINR || 0) * (updated[index].quantity || 1)
                    };
                } else {
                    updated[index].product = "";
                }
            } else {
                updated[index][field] = value;
                if (['quantity', 'unitPrice'].includes(field)) {
                    updated[index].total = updated[index].quantity * updated[index].unitPrice;
                }
            }
            return { ...prev, products: updated };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.shipper) {
            return toast.error("Please select a Shipper");
        }
        
        if (formData.products.length === 0) {
            return toast.error("Please add at least one item");
        }

        const itemsTotal = formData.products.reduce((acc, item) => {
            const taxable = (item.quantity * item.unitPrice);
            const gst = taxable * ((item.gstRate !== undefined ? item.gstRate : 18) / 100);
            return acc + taxable + gst;
        }, 0);
        
        const estTotal = itemsTotal + (formData.additionalCharges.installation || 0) + (formData.additionalCharges.freight || 0);

        setSubmitting(true);
        try {
            const payload = {
                shipper: formData.shipper,
                products: formData.products,
                installationCharges: formData.additionalCharges.installation,
                freightCartage: formData.additionalCharges.freight,
                estimatedTotal: estTotal,
                terms: formData.terms,
                termDetails: formData.termDetails
            };

            if (poToEdit) {
                await API.put(`/purchase-orders/${poToEdit._id}`, payload);
                toast.success("Outward PO Updated Successfully!");
            } else {
                await API.post("/purchase-orders/outward", payload);
                toast.success("Outward PO Created Successfully!");
            }
            
            onSuccess();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to save Outward PO");
        } finally {
            setSubmitting(false);
        }
    };

    const itemsTotal = formData.products.reduce((acc, item) => {
        const taxable = (item.quantity * item.unitPrice);
        const gst = taxable * ((item.gstRate !== undefined ? item.gstRate : 18) / 100);
        return acc + taxable + gst;
    }, 0);
    const estimatedTotal = itemsTotal + (formData.additionalCharges.installation || 0) + (formData.additionalCharges.freight || 0);

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in ${isFullScreen ? 'p-0' : ''}`}>
            <div className={`bg-white dark:bg-gray-800 shadow-2xl overflow-hidden animate-slide-up flex flex-col ${isFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-7xl max-h-[90vh] rounded-2xl'}`}>
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📝</span>
                        <h3 className="font-bold text-xl text-gray-800 dark:text-white">
                            {poToEdit ? "Edit Outward PO" : "Create Outward PO"}
                        </h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={() => setIsFullScreen(!isFullScreen)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-transform hover:scale-110">
                            {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                        </button>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-2xl transition-transform hover:scale-110">&times;</button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
                    <div className="flex-1 p-6 overflow-y-auto space-y-6">
                        
                        {/* Header Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Shipper</label>
                                <ShipperSearchSelect
                                    shippers={shippers}
                                    value={formData.shipper}
                                    onChange={handleShipperSelect}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Outward PO No (Auto-fill)</label>
                                <input
                                    type="text"
                                    value={formData.poNumber}
                                    readOnly
                                    className="w-full px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 border border-transparent focus:outline-none cursor-not-allowed dark:text-white font-mono"
                                />
                            </div>
                        </div>

                        {/* Address Details */}
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">Shipper Billing Information</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Bill From</label>
                                    <input
                                        type="text"
                                        placeholder="Shipper Billing Name"
                                        value={formData.billTo.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, billTo: { ...prev.billTo, name: e.target.value } }))}
                                        className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm font-bold"
                                    />
                                    <textarea
                                        placeholder="Address"
                                        rows="2"
                                        value={formData.billTo.address}
                                        onChange={(e) => setFormData(prev => ({ ...prev, billTo: { ...prev.billTo, address: e.target.value } }))}
                                        className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                    />
                                    <input
                                        type="text"
                                        placeholder="GSTIN"
                                        value={formData.billTo.gstin}
                                        onChange={(e) => setFormData(prev => ({ ...prev, billTo: { ...prev.billTo, gstin: e.target.value } }))}
                                        className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Ship To</label>
                                    <input
                                        type="text"
                                        placeholder="Consignee Name"
                                        value={formData.shipTo.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, shipTo: { ...prev.shipTo, name: e.target.value } }))}
                                        className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm font-bold"
                                    />
                                    <textarea
                                        placeholder="Address"
                                        rows="2"
                                        value={formData.shipTo.address}
                                        onChange={(e) => setFormData(prev => ({ ...prev, shipTo: { ...prev.shipTo, address: e.target.value } }))}
                                        className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                    />
                                    <input
                                        type="text"
                                        placeholder="GSTIN"
                                        value={formData.shipTo.gstin}
                                        onChange={(e) => setFormData(prev => ({ ...prev, shipTo: { ...prev.shipTo, gstin: e.target.value } }))}
                                        className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Products Table */}
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                            <h4 className="font-bold text-gray-800 dark:text-white mb-2">Items</h4>
                            {formData.products.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-sm">No items added yet. Click "+ Add Item" to start.</div>
                            ) : (
                                <div className="space-y-4">
                                    {formData.products.map((item, index) => (
                                        <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 relative animate-fade-in transition-all">
                                            <button type="button" onClick={() => removeProductItem(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-lg transition-colors">&times;</button>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                                <div className="md:col-span-2">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase">Product (Auto-fill)</label>
                                                    <ProductSearchSelect
                                                        value={item.product}
                                                        onChange={(productObj) => handleProductItemChange(index, "product_obj", productObj)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-gray-500 uppercase">Brand</label>
                                                    <input
                                                        type="text"
                                                        value={item.brand || ""}
                                                        onChange={(e) => handleProductItemChange(index, "brand", e.target.value)}
                                                        placeholder="Brand"
                                                        className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-gray-500 uppercase">Part/Model No</label>
                                                    <input
                                                        type="text"
                                                        value={item.productNo || ""}
                                                        onChange={(e) => handleProductItemChange(index, "productNo", e.target.value)}
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
                                                    onChange={(e) => handleProductItemChange(index, "name", e.target.value)}
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
                                                        onChange={(e) => handleProductItemChange(index, "hsnCode", e.target.value)}
                                                        className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm text-center"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-gray-500 uppercase">UOM</label>
                                                    <input
                                                        type="text"
                                                        value={item.uom || ""}
                                                        onChange={(e) => handleProductItemChange(index, "uom", e.target.value)}
                                                        className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm text-center"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-gray-500 uppercase">Qty</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => handleProductItemChange(index, "quantity", parseFloat(e.target.value))}
                                                        className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm text-center"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-gray-500 uppercase">Unit Rate (₹)</label>
                                                    <input
                                                        type="number"
                                                        value={item.unitPrice}
                                                        onChange={(e) => handleProductItemChange(index, "unitPrice", parseFloat(e.target.value))}
                                                        className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm text-right"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-gray-500 uppercase">GST Rate (%)</label>
                                                    <input
                                                        type="number"
                                                        value={item.gstRate !== undefined ? item.gstRate : 18}
                                                        onChange={(e) => handleProductItemChange(index, "gstRate", parseFloat(e.target.value))}
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

                            <div className="flex justify-center mt-4">
                                <button type="button" onClick={addProductItem} className="px-6 py-2 bg-teal-100 text-teal-700 rounded-full hover:bg-teal-200 text-sm font-bold shadow-sm transition-all hover:scale-105">
                                    + Add New Item
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="text-sm text-gray-600 dark:text-gray-400">Installation Charges</label>
                                    <input
                                        type="number"
                                        value={formData.additionalCharges.installation}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            additionalCharges: { ...prev.additionalCharges, installation: parseFloat(e.target.value) || 0 }
                                        }))}
                                        className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600 dark:text-gray-400">Freight/Cartage</label>
                                    <input
                                        type="number"
                                        value={formData.additionalCharges.freight}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            additionalCharges: { ...prev.additionalCharges, freight: parseFloat(e.target.value) || 0 }
                                        }))}
                                        className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 flex justify-end items-center gap-4">
                                <span className="text-gray-500 dark:text-gray-400">Estimated Total (Inc. GST):</span>
                                <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                                    ₹{estimatedTotal.toFixed(2)}
                                </span>
                            </div>
                        </div>
                        
                        {/* Terms & Conditions (Detailed) */}
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 space-y-3">
                            <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm uppercase">Terms & Conditions</h4>
                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Delivery Lead Time</label>
                                        <input
                                            type="text"
                                            value={formData.terms?.deliveryLeadTime || ""}
                                            onChange={(e) => setFormData(prev => ({ ...prev, terms: { ...prev.terms, deliveryLeadTime: e.target.value } }))}
                                            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Payment Terms</label>
                                        <select
                                            value={formData.termDetails?.paymentOption || ""}
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

                                                setFormData((prev) => ({
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
                                            value={formData.terms?.payment || ""}
                                            onChange={(e) => setFormData(prev => ({ ...prev, terms: { ...prev.terms, payment: e.target.value } }))}
                                            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                            placeholder="Payment Terms Description"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Warranty</label>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <select
                                            value={formData.termDetails?.warrantyMonths || "12"}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const type = formData.termDetails?.warrantyType || "Onsite";
                                                const warrantyText = val === "0"
                                                    ? "No warranty applicable. No warranty on spare parts. Consumables, Wear and tear items, including rubber parts and bulbs, are not covered under warranty."
                                                    : `${val} months from the date of TeamInspire Invoice for Equipments. (${type}). No warranty on spare parts. Consumables, Wear and tear items, including rubber parts and bulbs, are not covered under warranty.`;
                                                setFormData((prev) => ({
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
                                            value={formData.termDetails?.warrantyType || "Onsite"}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const months = formData.termDetails?.warrantyMonths || "12";
                                                setFormData((prev) => ({
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
                                    <p className="text-xs text-gray-400 dark:text-gray-500 italic bg-white dark:bg-gray-800/50 p-2 rounded border border-indigo-50/50 dark:border-gray-700">{formData.terms?.warranty}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Delivery Terms</label>
                                        <input
                                            type="text"
                                            value={formData.terms?.deliveryTerms || ""}
                                            onChange={(e) => setFormData(prev => ({ ...prev, terms: { ...prev.terms, deliveryTerms: e.target.value } }))}
                                            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Validity</label>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={formData.termDetails?.validityDays || "30"}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setFormData((prev) => ({
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
                                        value={formData.terms?.remark || ""}
                                        onChange={(e) => setFormData(prev => ({ ...prev, terms: { ...prev.terms, remark: e.target.value } }))}
                                        placeholder="Enter any custom remarks or notes for T&C section..."
                                        className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                    
                    {/* Submit */}
                    <div className="flex justify-end gap-3 pt-6 pb-4 px-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-8 py-2.5 bg-gradient-to-tr from-teal-600 to-emerald-600 text-white font-black uppercase tracking-wider text-xs rounded-xl hover:scale-105 active:scale-95 shadow-lg shadow-teal-500/20 transition disabled:opacity-50 disabled:scale-100 cursor-pointer"
                        >
                            {submitting ? "Saving..." : (poToEdit ? "Update Outward PO" : "Save Outward PO")}
                        </button>
                    </div>
                </form>
            </div>

            {/* Add New Shipper Modal */}
            {isAddShipperModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-teal-50 dark:bg-gray-700">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white">Add New Shipper</h3>
                            <button onClick={() => setIsAddShipperModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xl">&times;</button>
                        </div>
                        <form onSubmit={handleAddShipperSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shipper Billing Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={newShipperForm.billingName}
                                    onChange={(e) => setNewShipperForm(prev => ({ ...prev, billingName: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address *</label>
                                <textarea
                                    required
                                    rows="2"
                                    value={newShipperForm.address}
                                    onChange={(e) => setNewShipperForm(prev => ({ ...prev, address: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GST No.</label>
                                <input
                                    type="text"
                                    value={newShipperForm.gstin}
                                    onChange={(e) => setNewShipperForm(prev => ({ ...prev, gstin: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsAddShipperModalOpen(false)} className="px-4 py-2 rounded font-medium text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 rounded font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors">
                                    Save Shipper
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <style>{`
                .animate-fade-in { animation: fadeIn 0.3s ease-out; }
                .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            `}</style>
        </div>
    );
}
