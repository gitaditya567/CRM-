import React, { useState, useEffect } from "react";
import { UploadCloud, FileText, Trash2, Download, RefreshCw, History, AlertTriangle, CheckCircle2, FileUp, Calendar, Clock, Database, User, Search, ArrowRight } from "lucide-react";
import API from "../api/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

const UploadExcel = () => {
    const [file, setFile] = useState(null);
    const [progress, setProgress] = useState(0);
    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewRows, setPreviewRows] = useState([]);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await API.get("/products/history");
            setHistory(res.data);
        } catch (err) {
            console.error("Failed to load history");
        }
    };

    const uploadFile = async () => {
        if (!file) {
            toast.error("Please select an Excel file first");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            setLoading(true);
            setErrors([]);

            const res = await API.post("/products/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                onUploadProgress: (e) => {
                    const percent = Math.round((e.loaded * 100) / e.total);
                    setProgress(percent);
                },
            });

            const countMsg = res.data.totalCount !== undefined ? ` (Total products: ${res.data.totalCount})` : "";
            toast.success("Upload Successful" + countMsg);
            setFile(null);
            setPreviewRows([]);
            fetchHistory();
        } catch (err) {
            console.error(err);
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                toast.error("Upload Failed");
            }
        } finally {
            setProgress(0);
            setLoading(false);
        }
    };

    const deleteHistory = async (id) => {
        if (!window.confirm("Are you sure you want to delete this history record?")) return;
        try {
            await API.delete(`/products/history/${id}`);
            fetchHistory();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to delete history");
        }
    };

    const downloadPdf = (item) => {
        const doc = new jsPDF();
        doc.text("Upload Receipt", 14, 20);

        doc.autoTable({
            startY: 30,
            head: [['Field', 'Value']],
            body: [
                ['File Name', item.fileName],
                ['Status', item.status],
                ['Date', new Date(item.createdAt).toLocaleDateString()],
                ['Time', new Date(item.createdAt).toLocaleTimeString()],
                ['Records', item.recordCount],
                ['Uploaded By', item.uploadedBy?.name || 'Unknown'],
                ['File Size', item.fileSize || 'N/A']
            ],
        });

        doc.save(`upload_receipt_${item.fileName}.pdf`);
    };

    const updateHistory = (item) => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast.error(`To update products from "${item.fileName}", simply upload the modified Excel file again.`);
    };

    const parseFileForPreview = (f) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                const mapped = rows.map((r) => ({
                    productNo: r.productNo || r["Code"] || r["Product No"] || r["part Code"] || r["Part Code"] || r["part code"] || r["Part code"] || "",
                    description: r.description || r["Part Discription"] || r["Part Description"] || "",
                    brand: r.brand || r["Brand"] || "",
                    currency: r.currency || r["Currency"] || "",
                    dealerPriceINR: r.dealerPriceINR || r["Dealer Price (INR)"] || r["Dealer Price(INR)"] || r["Dealer Price"] || "",
                    retailPriceINR: r.retailPriceINR || r["Retail Price (INR)"] || r["Retail Price(INR)"] || r["Retail Price"] || "",
                    priceUSD: r.priceUSD || r["Amount(USD)"] || r["Amount (USD)"] || r["USD Price"] || r["USD"] || r["Price(USD)"] || r["Price (USD)"] || r["price (USD)"] || "",
                }));

                setPreviewRows(mapped.slice(0, 50));
            } catch (err) {
                console.error(err);
                setPreviewRows([]);
            }
        };
        reader.readAsArrayBuffer(f);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950 transition-colors duration-300">
            <div className="p-4 md:p-8 lg:p-12 max-w-[1600px] mx-auto">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-600 rounded-lg text-white">
                                <UploadCloud size={24} />
                            </div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Inventory Upload</h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Efficiently manage your product catalog with bulk spreadsheet imports.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Upload Section */}
                    <div className="xl:col-span-8 space-y-8">
                        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-2xl shadow-blue-500/5 border border-gray-100 dark:border-gray-800 transition-colors text-center">
                            <div className="max-w-xl mx-auto">
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-tighter">Upload Inventory</h2>
                                
                                <label className="block w-full cursor-pointer group">
                                    <div className="border-4 border-dashed border-gray-100 dark:border-gray-800 rounded-[2rem] p-16 transition-all duration-300 group-hover:border-blue-500/50 bg-gray-50/50 dark:bg-gray-800/30 group-hover:bg-blue-50/30 dark:group-hover:bg-blue-900/10 active:scale-[0.98]">
                                        <div className="space-y-6">
                                            <div className="h-24 w-24 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center mx-auto transition-all duration-500 group-hover:rotate-6 shadow-lg shadow-blue-500/10">
                                                <FileUp size={48} />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                                    {file ? file.name : "Select your master file"}
                                                </p>
                                                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">
                                                    Drop XLSX, XLS, or CSV files here
                                                </p>
                                            </div>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".xlsx,.xls,.csv"
                                            onChange={(e) => {
                                                const f = e.target.files[0];
                                                setFile(f || null);
                                                if (f) parseFileForPreview(f);
                                                else setPreviewRows([]);
                                            }}
                                        />
                                    </div>
                                </label>

                                <button
                                    onClick={uploadFile}
                                    disabled={loading || !file}
                                    className={`mt-10 px-12 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm shadow-xl transition-all duration-300 flex items-center justify-center gap-3 mx-auto w-full sm:w-auto ${loading || !file
                                        ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                                        : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-600/30 active:scale-95"
                                        }`}
                                >
                                    {loading ? (
                                        <><RefreshCw size={20} className="animate-spin" /> Processing...</>
                                    ) : (
                                        <><CheckCircle2 size={20} /> Initialize Upload</>
                                    )}
                                </button>

                                {progress > 0 && (
                                    <div className="mt-10 max-w-md mx-auto">
                                        <div className="flex justify-between mb-3">
                                            <span className="text-xs font-black uppercase tracking-widest text-blue-600">Transmission Progress</span>
                                            <span className="text-xs font-black text-blue-600">{progress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden shadow-inner">
                                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(37,99,235,0.4)]" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {errors.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-[2rem] p-8 shadow-xl shadow-red-500/5">
                                <h4 className="flex items-center text-red-600 font-black uppercase tracking-widest text-sm mb-6 gap-3">
                                    <AlertTriangle size={20} /> Data Integrity Issues
                                </h4>
                                <ul className="space-y-3 max-h-64 overflow-y-auto pr-4 custom-scrollbar">
                                    {errors.map((e, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm text-red-700 dark:text-red-400 bg-white/50 dark:bg-red-900/10 p-4 rounded-xl">
                                            <span className="font-black opacity-50">#{e.row}</span>
                                            <span className="font-medium">{e.error}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {previewRows.length > 0 && (
                            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl shadow-gray-500/5 border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
                                <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                    <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                                        <Database size={20} className="text-blue-600" /> Data Preview
                                        <span className="text-xs font-bold text-gray-400 tracking-normal normal-case opacity-60 ml-2">Viewing sample of {previewRows.length} rows</span>
                                    </h4>
                                </div>
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-sm text-left">
                                        <thead>
                                            <tr className="bg-gray-50/50 dark:bg-gray-800/50 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 dark:border-gray-800">
                                                <th className="px-8 py-5">Brand</th>
                                                <th className="px-8 py-5">Specification</th>
                                                <th className="px-8 py-5">Part Code</th>
                                                <th className="px-8 py-5 text-right">Unit Price</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                            {previewRows.map((r, i) => (
                                                <tr key={i} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                                                    <td className="px-8 py-5 font-bold text-gray-600 dark:text-gray-400">{r.brand}</td>
                                                    <td className="px-8 py-5 text-gray-500 dark:text-gray-500 italic max-w-xs truncate">{r.description}</td>
                                                    <td className="px-8 py-5 font-black text-gray-900 dark:text-white tracking-tight">{r.productNo}</td>
                                                    <td className="px-8 py-5 text-right font-black text-blue-600 dark:text-blue-400">${r.priceUSD}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: History Section */}
                    <div className="xl:col-span-4">
                        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl shadow-gray-500/5 border border-gray-100 dark:border-gray-800 overflow-hidden">
                            <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                                    <History size={20} className="text-blue-600" /> Upload Activity
                                </h3>
                            </div>

                            <div className="p-6 space-y-4 max-h-[800px] overflow-y-auto custom-scrollbar">
                                {history.map((item) => (
                                    <div key={item._id} className="group bg-white dark:bg-gray-900 p-5 rounded-[1.5rem] border-2 border-gray-50 dark:border-gray-800 hover:border-blue-500/20 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="space-y-1 overflow-hidden">
                                                <h4 className="font-black text-gray-900 dark:text-white text-sm truncate" title={item.fileName}>
                                                    {item.fileName}
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${item.status === 'success'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>
                                                        {item.status}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                        <Database size={10} /> {item.recordCount} items
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-tighter">
                                                {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 text-xs font-bold text-gray-500 dark:text-gray-400 mb-5 bg-gray-50/50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                                            <div className="flex items-center gap-2">
                                                <Clock size={12} className="opacity-50" /> {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div className="flex items-center gap-2 truncate">
                                                <User size={12} className="opacity-50" /> {item.uploadedBy?.name || 'System'}
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20 p-2 rounded-2xl border border-transparent group-hover:border-blue-500/10 shadow-inner">
                                            <button
                                                onClick={() => deleteHistory(item._id)}
                                                className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                                title="Remove Log"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-800" />
                                            <button
                                                onClick={() => downloadPdf(item)}
                                                className="p-3 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                                                title="Export PDF Receipt"
                                            >
                                                <Download size={16} />
                                            </button>
                                            <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-800" />
                                            <button
                                                onClick={() => updateHistory(item)}
                                                className="p-3 text-green-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-all"
                                                title="Sync Resources"
                                            >
                                                <RefreshCw size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {history.length === 0 && (
                                    <div className="text-center py-20">
                                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-4 text-gray-300">
                                            <History size={32} />
                                        </div>
                                        <div className="text-gray-400 font-bold uppercase tracking-widest text-xs leading-loose">
                                            Activity log empty<br/>
                                            <span className="opacity-50 font-medium normal-case">New transactions will appear here</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    height: 6px;
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b;
                }
            `}} />
        </div>
    );
};

export default UploadExcel;
