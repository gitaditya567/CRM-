import React, { useState, useEffect } from "react";
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Plus, 
  FileText, 
  Eye, 
  Download, 
  Filter,
  List,
  CheckSquare,
  Square,
  FileCheck,
  X,
  Trash2
} from "lucide-react";
import API from "../api/api";
import toast from "react-hot-toast";

const POManagement = () => {
  const [activeTab, setActiveTab] = useState("inward");
  const [searchQuery, setSearchQuery] = useState("");
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [selectedPOForProducts, setSelectedPOForProducts] = useState(null);
  const [modalProducts, setModalProducts] = useState([]);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPOForDetails, setSelectedPOForDetails] = useState(null);

  // Fetch POs from server
  const fetchPOs = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/purchase-orders?type=${activeTab}`);
      setPOs(res.data || []);
    } catch (err) {
      console.error("Error fetching POs:", err);
      toast.error("Failed to load Purchase Orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
  }, [activeTab]);

  // Harmonious badge color mapping
  const statusColors = {
    "Approved": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    "Received": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    "Pending": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    "Sent": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    "Invoiced": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  };

  // Filter based on search query (by PO number or partner name)
  const filteredPOs = pos.filter(po => {
    const query = searchQuery.toLowerCase();
    const matchesPo = po.poNumber?.toLowerCase().includes(query);
    const partnerName = po.vendorName || "";
    const matchesPartner = partnerName.toLowerCase().includes(query);
    return matchesPo || matchesPartner;
  });

  // Action handlers
  const handleOpenProductsModal = (po) => {
    setSelectedPOForProducts(po);
    // Deep copy products array for local editing
    setModalProducts(po.products.map(p => ({ ...p })));
    setIsProductsModalOpen(true);
  };

  const handleToggleProduct = (index) => {
    const updated = [...modalProducts];
    updated[index].selected = !updated[index].selected;
    setModalProducts(updated);
  };

  const handleToggleAllProducts = () => {
    const allSelected = modalProducts.every(p => p.selected);
    const updated = modalProducts.map(p => ({ ...p, selected: !allSelected }));
    setModalProducts(updated);
  };

  const handleUpdatePOProducts = async () => {
    if (!selectedPOForProducts) return;
    try {
      const res = await API.put(`/purchase-orders/${selectedPOForProducts._id}`, {
        products: modalProducts
      });
      toast.success(`Purchase Order ${res.data.poNumber} updated successfully!`);
      setIsProductsModalOpen(false);
      fetchPOs();
    } catch (err) {
      console.error("Error updating PO products:", err);
      toast.error(err.response?.data?.message || "Failed to update Purchase Order");
    }
  };

  const handleOpenDetailModal = (po) => {
    setSelectedPOForDetails(po);
    setIsDetailModalOpen(true);
  };

  const handleDownloadPDF = async (po) => {
    try {
      toast.loading("Generating PDF...", { id: "pdf" });
      const response = await API.get(`/purchase-orders/${po._id}/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${po.poNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("PDF downloaded successfully", { id: "pdf" });
    } catch (err) {
      console.error("Error downloading PO PDF:", err);
      toast.error("Failed to download PDF", { id: "pdf" });
    }
  };

  const handleMoveToInvoice = async (po) => {
    if (!window.confirm(`Are you sure you want to move Purchase Order ${po.poNumber} to Invoice?`)) return;
    try {
      const res = await API.put(`/purchase-orders/${po._id}`, {
        status: "Invoiced"
      });
      toast.success(`Purchase Order ${res.data.poNumber} moved to Invoice successfully!`);
      fetchPOs();
    } catch (err) {
      console.error("Error moving to Invoice:", err);
      toast.error(err.response?.data?.message || "Failed to move Purchase Order to Invoice");
    }
  };

  const handleDeletePO = async (po) => {
    if (!window.confirm(`Are you sure you want to delete Purchase Order ${po.poNumber}?`)) return;
    try {
      await API.delete(`/purchase-orders/${po._id}`);
      toast.success(`Purchase Order ${po.poNumber} deleted successfully!`);
      fetchPOs();
    } catch (err) {
      console.error("Error deleting PO:", err);
      toast.error(err.response?.data?.message || "Failed to delete Purchase Order");
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-3xl font-black text-gray-800 dark:text-white">PO Management</h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
            Manage your inward supplier purchases and outward client purchase orders in one place.
          </p>
        </div>
        
        {/* Helper Note */}
        <div className="text-xs text-gray-400 dark:text-gray-500 max-w-xs md:text-right font-medium">
          💡 Purchase Orders can be created directly by converting Proforma Invoices (PI) from PI Management.
        </div>
      </div>

      {/* Tabs Container */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-5">
        
        {/* Tab Switcher & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Glassmorphic Tabs Button List */}
          <div className="flex bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl w-fit border border-gray-200/50 dark:border-gray-800">
            <button
              onClick={() => setActiveTab("inward")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === "inward"
                  ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-100 dark:border-gray-700 font-bold"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              <ArrowDownLeft size={16} className={activeTab === "inward" ? "text-blue-500" : ""} />
              Inward PO
            </button>
            <button
              onClick={() => setActiveTab("outward")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === "outward"
                  ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-100 dark:border-gray-700 font-bold"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              <ArrowUpRight size={16} className={activeTab === "outward" ? "text-blue-500" : ""} />
              Outward PO
            </button>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-2.5 w-full md:w-72">
              <Search size={16} className="text-gray-400 mr-2" />
              <input 
                type="text" 
                placeholder="Search POs..." 
                className="bg-transparent border-none text-xs outline-none text-gray-700 dark:text-white placeholder-gray-400 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={fetchPOs}
              className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition shadow-sm cursor-pointer"
              title="Refresh POs"
            >
              <Filter size={16} />
            </button>
          </div>
        </div>

        {/* PO Table list */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Loading records...</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">PO Number</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">PI / Lead Ref</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {activeTab === "inward" ? "Vendor Name" : "Client Name"}
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Date</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Total Value</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredPOs.map((po) => (
                  <tr key={po._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                      <FileText size={16} />
                      {po.poNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {po.pi?.quotationNumber || "-"}
                        </span>
                        {(po.leadNumber || po.pi?.lead?.leadNumber) && (
                          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 mt-0.5">
                            Lead No: {po.leadNumber || po.pi.lead.leadNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-950 dark:text-white font-medium">
                      {po.vendorName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(po.date).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-800 dark:text-gray-200">
                      ₹{po.totalValue?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${statusColors[po.status] || "bg-gray-100 text-gray-800"}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* View Product Checkbox Icon */}
                        <button 
                          onClick={() => handleOpenProductsModal(po)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition hover:scale-110 cursor-pointer"
                          title="View Products for Update"
                        >
                          <List size={18} />
                        </button>
                        {/* Eye Icon for detail view */}
                        <button 
                          onClick={() => handleOpenDetailModal(po)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition hover:scale-110 cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        {/* Download Icon */}
                        <button 
                          onClick={() => handleDownloadPDF(po)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition hover:scale-110 cursor-pointer"
                          title="Download PDF"
                        >
                          <Download size={18} />
                        </button>
                        {/* Move to Invoice Icon */}
                        {po.status !== "Invoiced" && (
                          <button 
                            onClick={() => handleMoveToInvoice(po)}
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition hover:scale-110 cursor-pointer"
                            title="Move to Invoice"
                          >
                            <FileCheck size={18} />
                          </button>
                        )}
                        {/* Delete Icon */}
                        <button 
                          onClick={() => handleDeletePO(po)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition hover:scale-110 cursor-pointer"
                          title="Delete PO"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPOs.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400 uppercase tracking-widest text-xs font-bold">
                      No PO Records Found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 📦 View Products Modal (Checkboxes + All Select + Update PO) */}
      {isProductsModalOpen && selectedPOForProducts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">PO Products Checklist</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">PO: {selectedPOForProducts.poNumber}</p>
              </div>
              <button 
                onClick={() => setIsProductsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[350px] overflow-y-auto space-y-4">
              {/* All Select toggle */}
              <div 
                onClick={handleToggleAllProducts}
                className="flex items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100/30 dark:border-blue-800/30 rounded-2xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/35 transition"
              >
                {modalProducts.every(p => p.selected) ? (
                  <CheckSquare size={20} className="text-blue-600 dark:text-blue-400" />
                ) : (
                  <Square size={20} className="text-gray-400 dark:text-gray-500" />
                )}
                <span className="text-sm font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider">Select All Products</span>
              </div>

              {/* Product list */}
              <div className="space-y-2">
                {modalProducts.map((p, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleToggleProduct(idx)}
                    className={`flex items-start gap-3 p-4 border rounded-2xl cursor-pointer transition ${
                      p.selected 
                        ? "bg-white dark:bg-gray-800 border-blue-500 shadow-sm" 
                        : "bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-60"
                    }`}
                  >
                    <div className="mt-0.5">
                      {p.selected ? (
                        <CheckSquare size={18} className="text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Square size={18} className="text-gray-400 dark:text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{p.name}</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white shrink-0">₹{p.total?.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium">
                        <span className="truncate">{p.brand} | {p.productNo}</span>
                        <span>Qty: {p.quantity} × ₹{p.unitPrice?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                Total Value: <span className="text-gray-900 dark:text-white font-black text-sm">₹{modalProducts.filter(p => p.selected).reduce((sum, p) => sum + (p.total || 0), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsProductsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdatePOProducts}
                  className="px-5 py-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:scale-105 active:scale-95 shadow-md shadow-blue-500/10 transition cursor-pointer"
                >
                  Update PO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔍 View Details Modal */}
      {isDetailModalOpen && selectedPOForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">Purchase Order Details</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">PO Number: {selectedPOForDetails.poNumber}</p>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[450px]">
              {/* Meta Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl">
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Vendor/Client</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5">{selectedPOForDetails.vendorName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Date</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5">{new Date(selectedPOForDetails.date).toLocaleDateString("en-GB")}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Status</p>
                  <span className={`inline-block px-3 py-0.5 text-[9px] font-black uppercase rounded-full mt-1 ${statusColors[selectedPOForDetails.status] || "bg-gray-100 text-gray-800"}`}>
                    {selectedPOForDetails.status}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">PI Reference</p>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">#{selectedPOForDetails.pi?.quotationNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Type</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5 capitalize">{selectedPOForDetails.type} PO</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Grand Total</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">₹{selectedPOForDetails.totalValue?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              {/* Products Table */}
              <div>
                <h4 className="text-sm font-black uppercase text-gray-400 tracking-wider mb-3">Included Products ({selectedPOForDetails.products.filter(p => p.selected).length})</h4>
                <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-2xl">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-3 text-xs font-black uppercase text-gray-400">Model/Brand</th>
                        <th className="px-4 py-3 text-xs font-black uppercase text-gray-400">Product Name</th>
                        <th className="px-4 py-3 text-xs font-black uppercase text-gray-400 text-center">QTY</th>
                        <th className="px-4 py-3 text-xs font-black uppercase text-gray-400 text-right">Price</th>
                        <th className="px-4 py-3 text-xs font-black uppercase text-gray-400 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {selectedPOForDetails.products.filter(p => p.selected).map((p, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/20">
                          <td className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                            <div className="font-bold text-gray-800 dark:text-gray-200">{p.productNo}</div>
                            <div>{p.brand}</div>
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white max-w-[150px] truncate" title={p.name}>
                            {p.name}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-center font-bold">
                            {p.quantity}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 text-right font-medium">
                            ₹{p.unitPrice?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-900 dark:text-white text-right font-bold">
                            ₹{p.total?.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <button
                onClick={() => handleDownloadPDF(selectedPOForDetails)}
                className="flex items-center gap-2 px-4 py-2 border border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                <Download size={14} />
                Download PDF
              </button>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-900 dark:bg-gray-200 dark:hover:bg-gray-100 text-white dark:text-gray-900 text-xs font-black uppercase tracking-wider rounded-xl transition"
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

export default POManagement;
