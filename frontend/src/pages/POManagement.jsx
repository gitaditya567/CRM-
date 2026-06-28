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
  Trash2,
  History,
  Maximize2,
  Minimize2
} from "lucide-react";
import API from "../api/api";
import toast from "react-hot-toast";

const POManagement = () => {
  const userRole = (localStorage.getItem("role") || "").toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "superadmin";

  if (!isAdmin) {
    return (
      <div className="p-6 md:p-8 text-center py-20 font-sans bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-155 dark:border-gray-700 max-w-md mx-auto mt-20">
        <h1 className="text-2xl font-black text-red-600 dark:text-red-400 uppercase tracking-wider">Permission Denied</h1>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-2 uppercase tracking-wide">
          Only administrators and superadministrators are allowed to access this module.
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState("inward");
  const [searchQuery, setSearchQuery] = useState("");
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");

  // Modal states
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [selectedPOForProducts, setSelectedPOForProducts] = useState(null);
  const [modalProducts, setModalProducts] = useState([]);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [isChecklistFullScreen, setIsChecklistFullScreen] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPOForDetails, setSelectedPOForDetails] = useState(null);

  const [isInvoicePromptOpen, setIsInvoicePromptOpen] = useState(false);
  const [selectedPOForInvoice, setSelectedPOForInvoice] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({ invoiceNo: "", date: "" });

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedPOForHistory, setSelectedPOForHistory] = useState(null);

  // Inward Invoice Billing Modal state
  const [isInwardBillingOpen, setIsInwardBillingOpen] = useState(false);
  const [selectedPOForBilling, setSelectedPOForBilling] = useState(null);
  const [billingProducts, setBillingProducts] = useState([]);

  // Move Confirmation Modal state
  const [isMoveConfirmOpen, setIsMoveConfirmOpen] = useState(false);

  // Fetch POs from server
  const fetchPOs = async () => {
    setLoading(true);
    try {
      const targetType = activeTab === "inward_invoice" ? "inward" : activeTab;
      const res = await API.get(`/purchase-orders?type=${targetType}`);
      setPOs(res.data || []);
    } catch (err) {
      console.error("Error fetching POs:", err);
      toast.error("Failed to load Purchase Orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setStatusFilter("All");
    fetchPOs();
  }, [activeTab]);

  const statusColors = {
    "Approved": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    "Received": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    "Pending": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    "Sent": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    "Processed": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    "Partially Processed": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
    "Partially Received": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
    "Partially Fulfilled": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  };

  // Filter based on search query (by PO number, partner name, lead no, or pi no) and status
  const filteredPOs = pos.filter(po => {
    // 1. Tab Specific Filtering for inward_invoice
    if (activeTab === "inward_invoice") {
      const isMoved = po.isMovedToInvoice || 
                      po.status === "Partially Processed" || 
                      po.status === "Partially Fulfilled" || 
                      po.status === "Processed" || 
                      (po.invoiceHistory && po.invoiceHistory.length > 0);
      if (!isMoved) return false;
    }

    // 2. Status Filter
    if (statusFilter !== "All" && po.status !== statusFilter) {
      return false;
    }

    // 3. Search query filter
    const query = searchQuery.toLowerCase();
    const matchesPo = po.poNumber?.toLowerCase().includes(query);
    const partnerName = po.vendorName || "";
    const matchesPartner = partnerName.toLowerCase().includes(query);
    
    const piNumber = po.pi?.quotationNumber || "";
    const matchesPi = piNumber.toLowerCase().includes(query);

    const leadNumber = po.leadNumber || po.pi?.lead?.leadNumber || "";
    const matchesLead = leadNumber.toLowerCase().includes(query);

    return matchesPo || matchesPartner || matchesPi || matchesLead;
  });

  const getProductInvoices = (productNo) => {
    if (!selectedPOForProducts || !selectedPOForProducts.invoiceHistory) return [];
    const list = [];
    selectedPOForProducts.invoiceHistory.forEach(inv => {
      const matchingProd = inv.products?.find(ip => ip.productNo === productNo);
      if (matchingProd && matchingProd.quantity > 0) {
        list.push({
          invoiceNo: inv.invoiceNo,
          date: inv.date,
          quantity: matchingProd.quantity
        });
      }
    });
    return list;
  };

  // Action handlers
  const handleOpenProductsModal = (po) => {
    setSelectedPOForProducts(po);
    setProductSearchQuery("");
    setIsChecklistFullScreen(false);
    setModalProducts(po.products.map(p => {
      const billed = p.invoicedQuantity || 0;
      const pending = Math.max(0, p.quantity - billed);
      return { 
        ...p,
        currentInvoiceQty: pending,
        selected: pending > 0 ? (p.selected !== false) : false
      };
    }));
    setIsProductsModalOpen(true);
  };

  const handleToggleProduct = (index) => {
    const p = modalProducts[index];
    const remaining = Math.max(0, p.quantity - (p.invoicedQuantity || 0));
    if (remaining === 0) return;
    const updated = [...modalProducts];
    updated[index].selected = !updated[index].selected;
    setModalProducts(updated);
  };

  const handleToggleAllProducts = () => {
    const availableProducts = modalProducts.filter(p => {
      const remaining = Math.max(0, p.quantity - (p.invoicedQuantity || 0));
      return remaining > 0;
    });
    const allAvailableSelected = availableProducts.every(p => p.selected);
    const updated = modalProducts.map(p => {
      const remaining = Math.max(0, p.quantity - (p.invoicedQuantity || 0));
      if (remaining === 0) return { ...p, selected: false };
      return { ...p, selected: !allAvailableSelected };
    });
    setModalProducts(updated);
  };

  const handleSavePOProducts = async (shouldMoveToInvoice) => {
    if (!selectedPOForProducts) return;
    const po = selectedPOForProducts;
    const isOutward = activeTab !== "inward" && activeTab !== "inward_invoice" && po.type !== "inward";

    try {
      if (!isOutward) {
        const allSelected = modalProducts.every(p => p.selected);
        const anySelected = modalProducts.some(p => p.selected);
        let newStatus = "Pending";
        if (allSelected) {
          newStatus = "Processed";
        } else if (anySelected) {
          newStatus = "Partially Processed";
        }

        const payload = {
          products: modalProducts,
          status: newStatus
        };

        if (shouldMoveToInvoice) {
          payload.isMovedToInvoice = true;
        }

        const res = await API.put(`/purchase-orders/${po._id}`, payload);
        toast.success(
          shouldMoveToInvoice 
            ? `Purchase Order ${res.data.poNumber} updated & moved to Inward Invoice!` 
            : `Purchase Order ${res.data.poNumber} updated successfully!`
        );
        setIsMoveConfirmOpen(false);
        setIsProductsModalOpen(false);
        fetchPOs();
      } else {
        const res = await API.put(`/purchase-orders/${po._id}`, {
          products: modalProducts
        });
        toast.success(`Purchase Order ${res.data.poNumber} updated successfully!`);
        setSelectedPOForProducts(res.data);
        setModalProducts(res.data.products.map(p => {
          const billed = p.invoicedQuantity || 0;
          const pending = Math.max(0, p.quantity - billed);
          return { 
            ...p,
            currentInvoiceQty: pending
          };
        }));
        fetchPOs();
      }
    } catch (err) {
      console.error("Error updating PO products:", err);
      toast.error(err.response?.data?.message || "Failed to update Purchase Order");
    }
  };

  const handleUpdatePOProducts = () => {
    if (!selectedPOForProducts) return;
    const po = selectedPOForProducts;
    const isOutward = activeTab !== "inward" && activeTab !== "inward_invoice" && po.type !== "inward";

    if (!isOutward) {
      setIsMoveConfirmOpen(true);
    } else {
      handleSavePOProducts(false);
    }
  };

  const handleOpenInwardBilling = (po) => {
    handleOpenProductsModal(po);
  };

  const handleProceedToInvoiceFromChecklist = () => {
    const itemsToBill = modalProducts.filter(p => p.selected && (parseInt(p.currentInvoiceQty) || 0) > 0);
    if (itemsToBill.length === 0) {
      toast.error("Please select at least one product and enter an Invoice Quantity > 0!");
      return;
    }
    setSelectedPOForInvoice(selectedPOForProducts);
    setSelectedPOForBilling(null);
    setInvoiceForm({ invoiceNo: "", date: new Date().toISOString().split("T")[0] });
    setIsInvoicePromptOpen(true);
  };

  const handleProceedToInvoicePrompt = () => {
    const itemsToBill = billingProducts.filter(p => p.selectedForBill && (parseInt(p.billQty) || 0) > 0);
    if (itemsToBill.length === 0) {
      toast.error("Please select at least one product with quantity > 0 to bill!");
      return;
    }
    setInvoiceForm({ invoiceNo: "", date: new Date().toISOString().split("T")[0] });
    setIsInvoicePromptOpen(true);
  };

  const handleOpenDetailModal = (po) => {
    setSelectedPOForDetails(po);
    setIsDetailModalOpen(true);
  };

  const handleDownloadPDF = async (po) => {
    try {
      toast.loading("Generating PDF...", { id: "pdf" });
      
      const hasPI = po.pi && po.pi._id;
      const endpoint = hasPI 
        ? `/quotations/${po.pi._id}/pdf` 
        : `/purchase-orders/${po._id}/pdf`;

      const response = await API.get(endpoint, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);

      let filename = `${po.poNumber}.pdf`;
      if (hasPI) {
        const clientName = po.pi.billTo?.name || po.pi.lead?.name || "Client";
        const firstWord = clientName.trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9_-]/g, "");
        let city = "";
        if (po.pi.billTo?.address) {
          const parts = po.pi.billTo.address.split(",").map(p => p.trim()).filter(Boolean);
          if (parts.length >= 3) {
            city = parts[parts.length - 3];
          } else if (parts.length > 0) {
            city = parts[0];
          }
        }
        const safeCity = (city || "City").replace(/[^a-zA-Z0-9_-]/g, "");
        const safeDocNumber = po.pi.quotationNumber?.replace(/[^a-zA-Z0-9_-]/g, "_") || "";
        filename = `${firstWord}_${safeCity}_${safeDocNumber}.pdf`;
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("PDF downloaded successfully", { id: "pdf" });
    } catch (err) {
      console.error("Error downloading PDF:", err);
      toast.error("Failed to download PDF", { id: "pdf" });
    }
  };

  const handleOpenInvoicePrompt = (po) => {
    setSelectedPOForBilling(null);
    const itemsToBill = po.products.filter(p => p.selected && (p.currentInvoiceQty > 0));
    if (itemsToBill.length === 0) {
      toast.error("No items selected or Bill Now quantity is 0. Please update the PO first.");
      return;
    }
    setSelectedPOForInvoice(po);
    setInvoiceForm({ invoiceNo: "", date: new Date().toISOString().split("T")[0] });
    setIsInvoicePromptOpen(true);
  };

  const handleProcessInvoice = async () => {
    if (!invoiceForm.invoiceNo || !invoiceForm.date) {
      toast.error("Invoice No and Date are required!");
      return;
    }

    const po = selectedPOForInvoice || selectedPOForBilling;
    if (!po) return;

    try {
      const isOutward = activeTab === "outward" || po.type === "outward";

      if (!isOutward) {
        // INWARD PO INVOICING
        const sourceProducts = isProductsModalOpen ? modalProducts : (billingProducts.length > 0 ? billingProducts : po.products);
        const itemsToBill = sourceProducts.filter(p => (p.selected || p.selectedForBill) && ((parseInt(p.currentInvoiceQty) || parseInt(p.billQty) || 0) > 0));

        if (itemsToBill.length === 0) {
          toast.error("No products selected with valid invoice quantity!");
          return;
        }

        const invoiceTotal = itemsToBill.reduce((sum, p) => {
          const qty = parseInt(p.currentInvoiceQty) || parseInt(p.billQty) || 0;
          return sum + (qty * (p.unitPrice || 0));
        }, 0);

        const newInvoice = {
          invoiceNo: invoiceForm.invoiceNo,
          date: invoiceForm.date,
          totalValue: invoiceTotal,
          products: itemsToBill.map(p => {
            const qty = parseInt(p.currentInvoiceQty) || parseInt(p.billQty) || 0;
            return {
              productNo: p.productNo,
              name: p.name,
              brand: p.brand,
              quantity: qty,
              unitPrice: p.unitPrice,
              total: qty * (p.unitPrice || 0)
            };
          })
        };

        const updatedProducts = po.products.map(p => {
          const matching = itemsToBill.find(b => b.productNo === p.productNo);
          if (matching) {
            const qty = parseInt(matching.currentInvoiceQty) || parseInt(matching.billQty) || 0;
            return {
              ...p,
              invoicedQuantity: (p.invoicedQuantity || 0) + qty
            };
          }
          return p;
        });

        const allBilled = updatedProducts.filter(p => p.selected !== false).every(p => (p.invoicedQuantity || 0) >= p.quantity);
        const newStatus = allBilled ? "Processed" : "Partially Processed";

        await API.put(`/purchase-orders/${po._id}`, {
          products: updatedProducts,
          status: newStatus,
          invoiceHistory: [...(po.invoiceHistory || []), newInvoice]
        });

        toast.success("Invoice recorded successfully!");
        setIsInvoicePromptOpen(false);
        setIsProductsModalOpen(false);
        setIsInwardBillingOpen(false);
        setSelectedPOForBilling(null);
        setSelectedPOForInvoice(null);
        fetchPOs();
      } else {
        // OUTWARD PO INVOICING
        const itemsToBill = po.products.filter(p => p.selected && (p.currentInvoiceQty > 0));
        const invoiceTotal = itemsToBill.reduce((sum, p) => sum + (p.currentInvoiceQty * p.unitPrice), 0);

        const newInvoice = {
          invoiceNo: invoiceForm.invoiceNo,
          date: invoiceForm.date,
          totalValue: invoiceTotal,
          products: itemsToBill.map(p => ({
            productNo: p.productNo,
            name: p.name,
            brand: p.brand,
            quantity: p.currentInvoiceQty,
            unitPrice: p.unitPrice,
            total: p.currentInvoiceQty * p.unitPrice
          }))
        };

        const updatedProducts = po.products.map(p => {
          if (p.selected && p.currentInvoiceQty > 0) {
            const toBill = parseInt(p.currentInvoiceQty) || 0;
            return {
              ...p,
              invoicedQuantity: (p.invoicedQuantity || 0) + toBill,
              currentInvoiceQty: 0
            };
          }
          return p;
        });

        const allInvoiced = updatedProducts.every(p => (p.invoicedQuantity || 0) >= p.quantity);
        const noneInvoiced = updatedProducts.every(p => (p.invoicedQuantity || 0) === 0);
        const newStatus = allInvoiced ? "Processed" : (noneInvoiced ? po.status : "Processed");

        await API.put(`/purchase-orders/${po._id}`, {
          products: updatedProducts,
          status: newStatus,
          invoiceHistory: [...(po.invoiceHistory || []), newInvoice]
        });
        
        toast.success(`Invoice created successfully!`);
        setIsInvoicePromptOpen(false);
        fetchPOs();
      }
    } catch (err) {
      console.error("Error creating Invoice:", err);
      toast.error(err.response?.data?.message || "Failed to create invoice");
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
          <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-3">
            PO Management
            <span className="text-sm font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-full">
              {filteredPOs.length}
            </span>
          </h1>
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
          <div className="flex bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl w-fit border border-gray-200/50 dark:border-gray-800 flex-wrap gap-1">
            <button
              onClick={() => setActiveTab("inward")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === "inward"
                  ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-100 dark:border-gray-700 font-bold"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              <ArrowDownLeft size={16} className={activeTab === "inward" ? "text-blue-500" : ""} />
              Inward PO {activeTab === "inward" ? `(${filteredPOs.length})` : ""}
            </button>
            <button
              onClick={() => setActiveTab("inward_invoice")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === "inward_invoice"
                  ? "bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm border border-gray-100 dark:border-gray-700 font-bold"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              <FileCheck size={16} className={activeTab === "inward_invoice" ? "text-purple-500" : ""} />
              Inward Invoice {activeTab === "inward_invoice" ? `(${filteredPOs.length})` : ""}
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
              Outward PO {activeTab === "outward" ? `(${filteredPOs.length})` : ""}
            </button>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <div className="relative flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-3 py-2.5">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent border-none text-xs outline-none text-gray-700 dark:text-white cursor-pointer font-bold focus:ring-0"
              >
                <option value="All" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">All Statuses</option>
                <option value="Pending" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Pending</option>
                <option value="Partially Processed" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Partially Processed</option>
                {activeTab === "outward" && (
                  <>
                    <option value="Approved" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Approved</option>
                    <option value="Received" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Received</option>
                    <option value="Sent" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Sent</option>
                  </>
                )}
                <option value="Processed" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Processed</option>
              </select>
            </div>

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
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 w-52">PI / Lead Ref</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {activeTab === "inward" || activeTab === "inward_invoice" ? "Client Name" : "Vendor Name"}
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
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                          <FileText size={16} />
                          {po.poNumber}
                        </div>
                        <span className="text-[10px] font-semibold text-lime-600 dark:text-lime-400 mt-0.5 ml-6">
                          PO Date: {po.pi?.poDate ? new Date(po.pi.poDate).toLocaleDateString("en-GB") : new Date(po.date).toLocaleDateString("en-GB")}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {po.pi?.quotationNumber || "-"}
                        </span>
                        {(po.leadNumber || po.pi?.lead?.leadNumber) && (
                          <span className="text-[10px] font-semibold text-lime-600 dark:text-lime-400 mt-0.5">
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
                        {/* Generate Inward Invoice Button (Inward Invoice tab only) */}
                        {activeTab === "inward_invoice" && po.products?.some(p => (p.invoicedQuantity || 0) < p.quantity) && (
                          <button 
                            onClick={() => handleOpenInwardBilling(po)}
                            className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition hover:scale-110 cursor-pointer"
                            title="Generate Inward Invoice / Bill"
                          >
                            <FileCheck size={18} />
                          </button>
                        )}
                        {/* Move to Invoice Icon (Outward only) */}
                        {activeTab !== "inward" && activeTab !== "inward_invoice" && po.type !== "inward" && po.status !== "Processed" && (
                          <button 
                            onClick={() => handleOpenInvoicePrompt(po)}
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition hover:scale-110 cursor-pointer"
                            title="Move to Invoice"
                          >
                            <FileCheck size={18} />
                          </button>
                        )}
                        {/* History / Records Icon */}
                        {((activeTab === "inward_invoice") || (activeTab === "outward" && po.type !== "inward")) && po.invoiceHistory && po.invoiceHistory.length > 0 && (
                          <button 
                            onClick={() => {
                              setSelectedPOForHistory(po);
                              setIsHistoryModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition hover:scale-110 cursor-pointer"
                            title="View History / Records"
                          >
                            <History size={18} />
                          </button>
                        )}
                        {/* Delete Icon */}
                        {activeTab === "outward" && (
                          <button 
                            onClick={() => handleDeletePO(po)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition hover:scale-110 cursor-pointer"
                            title="Delete PO"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPOs.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-400 uppercase tracking-widest text-xs font-bold">
                      No PO Records Found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 📦 View Products Modal (Checkboxes + Batch Processing + Update PO) */}
      {isProductsModalOpen && selectedPOForProducts && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${isChecklistFullScreen ? "p-0" : "p-4"} bg-black/60 backdrop-blur-sm`}>
          <div className={`bg-white dark:bg-gray-800 shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in flex flex-col transition-all duration-300 ${
            isChecklistFullScreen 
              ? "w-full h-full rounded-none max-w-none max-h-none m-0" 
              : "rounded-3xl w-full max-w-5xl max-h-[90vh]"
          }`}>
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  PO Products Checklist
                  {isChecklistFullScreen && <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Full Screen</span>}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">PO: {selectedPOForProducts.poNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsChecklistFullScreen(!isChecklistFullScreen)}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  title={isChecklistFullScreen ? "Exit Full Screen" : "Full Screen View"}
                >
                  {isChecklistFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                <button 
                  onClick={() => setIsProductsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className={`p-6 overflow-y-auto space-y-4 ${isChecklistFullScreen ? "flex-1 max-h-none" : "max-h-[650px] md:max-h-[70vh]"}`}>
              {/* Product Search Bar */}
              <div className="relative flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 w-full">
                <Search size={18} className="text-gray-400 mr-2 shrink-0" />
                <input 
                  type="text"
                  placeholder="Search products by name, model, or brand..."
                  className="bg-transparent border-none text-xs font-medium outline-none text-gray-800 dark:text-white placeholder-gray-400 w-full"
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                />
                {productSearchQuery && (
                  <button 
                    onClick={() => setProductSearchQuery("")}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0 ml-2"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

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
                <span className="text-sm font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider">Select All Products ({modalProducts.length})</span>
              </div>

              {/* Product list */}
              <div className="space-y-3">
                {modalProducts
                  .map((p, originalIdx) => ({ ...p, originalIdx }))
                  .filter(p => {
                    if (!productSearchQuery.trim()) return true;
                    const q = productSearchQuery.toLowerCase();
                    return (p.name || "").toLowerCase().includes(q) ||
                           (p.brand || "").toLowerCase().includes(q) ||
                           (p.productNo || "").toLowerCase().includes(q);
                  })
                  .map((p) => {
                    const idx = p.originalIdx;
                    const isOutward = activeTab !== "inward" && activeTab !== "inward_invoice" && selectedPOForProducts?.type !== "inward";
                    const processed = p.invoicedQuantity || 0;
                    const remaining = Math.max(0, p.quantity - processed);
                    const isFullyBilled = isOutward && (processed >= p.quantity);
                    const isFullyProcessedInward = !isOutward && (remaining === 0);
                    const isDisabled = isFullyBilled || isFullyProcessedInward;

                    return (
                      <div 
                        key={idx}
                        onClick={() => {
                          if (!isDisabled) handleToggleProduct(idx);
                        }}
                        className={`flex items-start gap-3 p-4 border rounded-2xl transition ${
                          isDisabled
                            ? "bg-gray-100/70 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed select-none"
                            : p.selected 
                              ? "bg-white dark:bg-gray-800 border-blue-500 shadow-sm cursor-pointer"
                              : "bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-70 cursor-pointer"
                        }`}
                      >
                        <div className="mt-0.5">
                          {isDisabled ? (
                            <CheckSquare size={18} className="text-gray-400 dark:text-gray-500 opacity-60" />
                          ) : p.selected ? (
                            <CheckSquare size={18} className="text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square size={18} className="text-gray-400 dark:text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-4">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{p.name}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                {p.brand} | {p.productNo}
                              </p>
                            </div>
                            <div className="flex flex-col items-end shrink-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white">Total: ₹{((p.quantity || 0) * (p.unitPrice || 0)).toLocaleString()}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Qty: {p.quantity} × ₹{p.unitPrice?.toLocaleString()}</p>
                              
                              {/* Inward Badges */}
                              {!isOutward && (
                                <div className="mt-1 flex items-center gap-1.5">
                                  {isFullyProcessedInward ? (
                                    <span className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                      Processed ({processed}/{p.quantity})
                                    </span>
                                  ) : processed > 0 ? (
                                    <span className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                      Processed: {processed} / {p.quantity} (Rem: {remaining})
                                    </span>
                                  ) : (
                                    <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                      Pending ({p.quantity} items)
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Outward Badges */}
                              {isOutward && (
                                <div className="mt-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                  Billed: {processed} / {p.quantity}
                                </div>
                              )}

                              {/* Invoice details - Outward PO only */}
                              {isOutward && getProductInvoices(p.productNo).map((inv, i) => (
                                <span key={i} className="mt-1 text-[9px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 px-1.5 py-0.5 rounded-md">
                                  Inv: {inv.invoiceNo} ({new Date(inv.date).toLocaleDateString("en-GB")}) - Qty: {inv.quantity}
                                </span>
                              ))}
                            </div>
                          </div>



                          {/* Outward Bill Now Input */}
                          {isOutward && (
                            <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mt-3 font-medium border-t border-gray-100 dark:border-gray-700/50 pt-2">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                  <span>Bill Now:</span>
                                  <input 
                                    type="number"
                                    min="0"
                                    max={p.quantity - processed}
                                    disabled={processed >= p.quantity || !p.selected}
                                    value={p.currentInvoiceQty ?? 0}
                                    onChange={(e) => {
                                      let newQuantity = parseInt(e.target.value) || 0;
                                      const pending = p.quantity - processed;
                                      if (newQuantity > pending) newQuantity = pending;
                                      if (newQuantity < 0) newQuantity = 0;
                                      
                                      const updated = [...modalProducts];
                                      updated[idx].currentInvoiceQty = newQuantity;
                                      setModalProducts(updated);
                                    }}
                                    className={`w-14 px-1 py-0.5 text-xs text-center text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded outline-none focus:border-blue-500 ${(processed >= p.quantity) ? "opacity-50" : ""}`}
                                  />
                                </div>
                                <span>× ₹{p.unitPrice?.toLocaleString()}</span>
                              </div>
                            </div>
                          )}

                          {/* Inward Invoice Quantity Input */}
                          {activeTab === "inward_invoice" && (
                            <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 mt-3 font-medium border-t border-gray-100 dark:border-gray-700/50 pt-2.5" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">Invoice Qty:</span>
                                <input 
                                  type="number"
                                  min="0"
                                  max={remaining}
                                  disabled={remaining === 0 || !p.selected}
                                  value={p.currentInvoiceQty ?? 0}
                                  onChange={(e) => {
                                    let val = parseInt(e.target.value) || 0;
                                    if (val > remaining) val = remaining;
                                    if (val < 0) val = 0;
                                    const updated = [...modalProducts];
                                    updated[idx].currentInvoiceQty = val;
                                    setModalProducts(updated);
                                  }}
                                  className="w-20 px-2 py-1 text-xs font-bold text-center text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border border-purple-300 dark:border-purple-600 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                                />
                              </div>
                              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                                Rem: {remaining}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                {activeTab === "inward_invoice" && (
                  <button
                    onClick={handleProceedToInvoiceFromChecklist}
                    className="px-5 py-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:scale-105 active:scale-95 shadow-md shadow-purple-500/10 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <FileCheck size={16} />
                    Invoice
                  </button>
                )}
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
                <div className="flex flex-col mt-0.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  <p>PO Number: {selectedPOForDetails.poNumber}</p>
                  <p className="text-lime-600 dark:text-lime-400 font-semibold">PO Date: {selectedPOForDetails.pi?.poDate ? new Date(selectedPOForDetails.pi.poDate).toLocaleDateString("en-GB") : new Date(selectedPOForDetails.date).toLocaleDateString("en-GB")}</p>
                </div>
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
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Taxable Value</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">₹{(selectedPOForDetails.products || []).filter(p => p.selected).reduce((sum, p) => sum + ((p.quantity || 0) * (p.unitPrice || 0)), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
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

      {/* 🧾 Inward Invoice Billing Modal */}
      {isInwardBillingOpen && selectedPOForBilling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">Generate Inward Invoice</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">PO: {selectedPOForBilling.poNumber} | Partner: {selectedPOForBilling.vendorName}</p>
              </div>
              <button 
                onClick={() => setIsInwardBillingOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[480px] overflow-y-auto space-y-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 p-3.5 rounded-2xl">
                💡 Select products and enter the quantity to bill for this invoice. Remaining items can be billed in future invoices until quantity reaches 0.
              </div>

              {/* Product List */}
              <div className="space-y-3">
                {billingProducts.map((p, idx) => {
                  const billed = p.invoicedQuantity || 0;
                  const remaining = Math.max(0, p.quantity - billed);
                  const isFullyBilled = remaining === 0;

                  return (
                    <div 
                      key={idx}
                      className={`flex items-start gap-3 p-4 border rounded-2xl transition ${
                        isFullyBilled 
                          ? "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 opacity-60"
                          : p.selectedForBill 
                            ? "bg-white dark:bg-gray-800 border-purple-500 shadow-sm"
                            : "bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                      }`}
                    >
                      <div className="mt-1">
                        <input 
                          type="checkbox"
                          disabled={isFullyBilled}
                          checked={p.selectedForBill && !isFullyBilled}
                          onChange={(e) => {
                            const updated = [...billingProducts];
                            updated[idx].selectedForBill = e.target.checked;
                            setBillingProducts(updated);
                          }}
                          className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{p.name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{p.brand} | {p.productNo}</p>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Price: ₹{p.unitPrice?.toLocaleString()}</p>
                            <span className="text-xs font-bold text-gray-500 mt-0.5">Total Ordered: {p.quantity}</span>
                            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">Billed: {billed} / {p.quantity}</span>
                          </div>
                        </div>

                        {!isFullyBilled ? (
                          <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 mt-3 font-medium border-t border-gray-100 dark:border-gray-700/50 pt-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold">Enter Bill Quantity:</span>
                              <input 
                                type="number"
                                min="1"
                                max={remaining}
                                disabled={!p.selectedForBill}
                                value={p.billQty ?? 0}
                                onChange={(e) => {
                                  let val = parseInt(e.target.value) || 0;
                                  if (val > remaining) val = remaining;
                                  if (val < 0) val = 0;
                                  const updated = [...billingProducts];
                                  updated[idx].billQty = val;
                                  setBillingProducts(updated);
                                }}
                                className="w-20 px-2 py-1 text-xs font-bold text-center text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border border-purple-300 dark:border-purple-600 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                              Remaining to bill: {remaining}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-2 text-xs font-bold text-green-600 dark:text-green-400">
                            ✓ All items billed for this product
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                Current Invoice Total: <span className="text-purple-600 dark:text-purple-400 font-black text-sm">₹{billingProducts.filter(p => p.selectedForBill).reduce((sum, p) => sum + ((parseInt(p.billQty) || 0) * (p.unitPrice || 0)), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsInwardBillingOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProceedToInvoicePrompt}
                  className="px-5 py-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md hover:scale-105 transition cursor-pointer"
                >
                  Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📄 Create Invoice Prompt Modal */}
      {isInvoicePromptOpen && (selectedPOForInvoice || selectedPOForBilling) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in">
            <div className="px-6 py-5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Create Invoice</h3>
              <button 
                onClick={() => setIsInvoicePromptOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Invoice Number</label>
                <input 
                  type="text"
                  placeholder="e.g. INV-1020"
                  value={invoiceForm.invoiceNo}
                  onChange={e => setInvoiceForm({...invoiceForm, invoiceNo: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Invoice Date</label>
                <input 
                  type="date"
                  value={invoiceForm.date}
                  onChange={e => setInvoiceForm({...invoiceForm, date: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setIsInvoicePromptOpen(false)}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessInvoice}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition"
              >
                Generate Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🕒 Invoice History Modal */}
      {isHistoryModalOpen && selectedPOForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in">
            <div className="px-6 py-5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">Invoice History</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">PO Number: {selectedPOForHistory.poNumber}</p>
              </div>
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[450px] space-y-4">
              {selectedPOForHistory.invoiceHistory?.length === 0 ? (
                <div className="text-center py-10 text-gray-400 font-bold uppercase tracking-widest text-xs">No invoices generated yet</div>
              ) : (
                selectedPOForHistory.invoiceHistory?.map((inv, i) => (
                  <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                      <div className="flex gap-4">
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase tracking-widest font-black">Invoice No</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{inv.invoiceNo}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase tracking-widest font-black">Date</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{new Date(inv.date).toLocaleDateString("en-GB")}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-gray-400 uppercase tracking-widest font-black">Total</p>
                        <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">₹{inv.totalValue?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800">
                      <table className="w-full text-left">
                        <thead>
                          <tr>
                            <th className="pb-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                            <th className="pb-2 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</th>
                            <th className="pb-2 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Price</th>
                            <th className="pb-2 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                          {inv.products.map((p, j) => (
                            <tr key={j}>
                              <td className="py-2 text-xs font-bold text-gray-800 dark:text-gray-200">
                                {p.productNo}
                                <div className="text-[10px] font-medium text-gray-500 font-normal truncate max-w-[200px]" title={p.name}>{p.name}</div>
                              </td>
                              <td className="py-2 text-xs text-center font-bold text-gray-600 dark:text-gray-400">{p.quantity}</td>
                              <td className="py-2 text-xs text-right font-medium text-gray-500 dark:text-gray-400">₹{p.unitPrice?.toLocaleString()}</td>
                              <td className="py-2 text-xs text-right font-bold text-gray-900 dark:text-white">₹{p.total?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ❓ Move to Inward Invoice Confirmation Modal */}
      {isMoveConfirmOpen && selectedPOForProducts && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in p-6 text-center space-y-5">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <FileCheck size={32} />
            </div>

            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">Move to Inward Invoice?</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-2 px-2 leading-relaxed">
                Do you want to move this Purchase Order (<span className="text-purple-600 dark:text-purple-400 font-bold">{selectedPOForProducts.poNumber}</span>) to the Inward Invoice tab for billing?
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => handleSavePOProducts(false)}
                className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
              >
                No, Just Save
              </button>
              <button
                onClick={() => handleSavePOProducts(true)}
                className="flex-1 px-4 py-3 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:scale-105 active:scale-95 shadow-md shadow-purple-500/20 transition cursor-pointer"
              >
                Yes, Move to Invoice
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default POManagement;
