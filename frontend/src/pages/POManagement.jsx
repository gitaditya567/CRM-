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
  Minimize2,
  Truck,
  Edit,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Mail,
  MessageSquare,
  Send,
  ExternalLink,
  Copy
} from "lucide-react";
import API from "../api/api";
import toast from "react-hot-toast";
import CreateOutwardPO from "../components/po/CreateOutwardPO";

const getCarrierTrackingLink = (courierName) => {
  if (!courierName) return null;
  const name = courierName.trim().toLowerCase();
  if (name.includes("bluedart") || name.includes("blue dart")) return "https://bluedart.com/tracking";
  if (name.includes("safexpress") || name.includes("safe express")) return "https://www.safexpress.com/";
  if (name.includes("dtdc")) return "https://www.dtdc.com/track-your-shipment/";
  if (name.includes("trackon")) return "https://www.trackon.in/home/track";
  return null;
};

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
  const [isCreateOutwardOpen, setIsCreateOutwardOpen] = useState(false);
  const [searchQueries, setSearchQueries] = useState({
    inward: "",
    inward_invoice: "",
    dispatch: "",
    outward: ""
  });
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("Pending");

  // Modal states
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [selectedPOForProducts, setSelectedPOForProducts] = useState(null);
  const [modalProducts, setModalProducts] = useState([]);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [isChecklistFullScreen, setIsChecklistFullScreen] = useState(false);
  const [selectedPOToEdit, setSelectedPOToEdit] = useState(null);

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

  // Dispatch Modal state
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [selectedPOForDispatch, setSelectedPOForDispatch] = useState(null);
  const [dispatchForm, setDispatchForm] = useState({ courierName: "", trackingNo: "", dispatchDate: "", transportMode: "Road" });
  const [dispatchProducts, setDispatchProducts] = useState([]);

  // Dispatch Email / WhatsApp Communication Modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [dispatchCommData, setDispatchCommData] = useState(null);

  // Fetch POs from server
  const fetchPOs = async () => {
    setLoading(true);
    try {
      let url = "/purchase-orders";
      if (activeTab === "inward" || activeTab === "inward_invoice") {
        url = "/purchase-orders?type=inward";
      } else if (activeTab === "outward") {
        url = "/purchase-orders?type=outward";
      }
      const res = await API.get(url);
      setPOs(res.data || []);
    } catch (err) {
      console.error("Error fetching POs:", err);
      toast.error("Failed to load Purchase Orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "inward" || activeTab === "dispatch" || activeTab === "inward_invoice") {
      setStatusFilter("Pending");
    } else {
      setStatusFilter("All");
    }
    setSearchQueries({
      inward: "",
      inward_invoice: "",
      dispatch: "",
      outward: ""
    });
    fetchPOs();
  }, [activeTab]);

  const statusColors = {
    "Approved": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    "Received": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    "Pending": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    "Sent": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    "Processed": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    "Partially Pending": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
    "Partial Pending": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
    "Partially Processed": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
    "Partially Received": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
    "Partially Fulfilled": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
    "Partially Invoiced": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    "Invoiced": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    "Partially Dispatched": "bg-orange-100 text-orange-850 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-900/50",
    "Dispatched": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50",
  };

  const getInwardPOInvoiceStatus = (products) => {
    const activeProducts = (products || []).filter(p => p.selected !== false);
    if (activeProducts.length === 0) return "Pending";
    const totalInvoiced = activeProducts.reduce((sum, p) => sum + (p.invoicedQuantity || 0), 0);
    if (totalInvoiced === 0) return "Pending";
    const allBilled = activeProducts.every(p => (p.invoicedQuantity || 0) >= p.quantity);
    return allBilled ? "Invoiced" : "Partially Invoiced";
  };

  const getDisplayStatus = (po, tab) => {
    if (tab === "dispatch") {
      if (po.status === "Dispatched") return "Dispatched";
      const activeProducts = (po.products || []).filter(p => p.selected !== false);
      const totalInvoiced = activeProducts.reduce((sum, p) => sum + (p.invoicedQuantity || 0), 0);
      const totalDispatched = activeProducts.reduce((sum, p) => sum + (p.dispatchedQuantity || 0), 0);
      if (totalInvoiced > 0 && totalDispatched >= totalInvoiced) return "Dispatched";
      return "Pending";
    }
    if (tab === "inward_invoice" && po.type === "inward") {
      const activeProducts = (po.products || []).filter(p => p.selected !== false);
      if (activeProducts.length === 0) return "Pending";
      const totalInvoiced = activeProducts.reduce((sum, p) => sum + (p.invoicedQuantity || 0), 0);
      if (totalInvoiced === 0) return "Pending";
      const allBilled = activeProducts.every(p => (p.invoicedQuantity || 0) >= p.quantity);
      return allBilled ? "Invoiced" : "Partially Invoiced";
    }
    if (tab === "inward" && po.type === "inward" && po.isMovedToInvoice === true) {
      const hasUnselectedProducts = (po.products || []).some(p => p.selected === false);
      return hasUnselectedProducts ? "Partially Processed" : "Processed";
    }
    return po.status;
  };

  // Filter based on search query (by PO number, partner name, lead no, or pi no) and status
  const filteredPOs = pos.filter(po => {
    // 1. Tab Specific Filtering
    if (activeTab === "outward") {
      if (po.type !== "outward") return false;
    }
    if (activeTab === "inward_invoice") {
      if (po.type !== "inward") return false;
      if (po.isMovedToInvoice !== true) return false;
    }
    if (activeTab === "inward") {
      if (po.type !== "inward") return false;
      if (po.isMovedToInvoice === true) {
        const activeProducts = (po.products || []).filter(p => p.selected !== false);
        const isFullyInvoiced = activeProducts.length > 0 && activeProducts.every(p => (p.invoicedQuantity || 0) >= p.quantity);
        if (isFullyInvoiced) return false;
      }
    }
    if (activeTab === "dispatch") {
      const isEligible = (po.type === "inward" && po.isMovedToInvoice === true) || po.type === "outward";
      if (!isEligible) return false;
      const hasInvoicedOrDispatched = po.status === "Dispatched" ||
        (po.dispatchHistory && po.dispatchHistory.length > 0) ||
        (po.products || []).some(p => (p.invoicedQuantity || 0) > 0 || (p.dispatchedQuantity || 0) > 0);
      if (!hasInvoicedOrDispatched) return false;
    }

    // 2. Status Filter
    const displayStatus = getDisplayStatus(po, activeTab);
    if (statusFilter !== "All" && displayStatus !== statusFilter) {
      return false;
    }

    // 3. Search query filter
    const query = (searchQueries[activeTab] || "").toLowerCase();
    const matchesPo = po.poNumber?.toLowerCase().includes(query);
    const partnerName = po.vendorName || "";
    const matchesPartner = partnerName.toLowerCase().includes(query);
    
    const piNumber = po.pi?.quotationNumber || "";
    const matchesPi = piNumber.toLowerCase().includes(query);

    const leadNumber = po.leadNumber || po.pi?.lead?.leadNumber || "";
    const matchesLead = leadNumber.toLowerCase().includes(query);

    return matchesPo || matchesPartner || matchesPi || matchesLead;
  });

  // Pagination State & Calculations
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilter, searchQueries]);

  const totalItems = filteredPOs.length;
  const effectiveItemsPerPage = itemsPerPage === "All" ? totalItems : Number(itemsPerPage);
  const totalPages = itemsPerPage === "All" || totalItems === 0 ? 1 : Math.ceil(totalItems / effectiveItemsPerPage);
  
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const indexOfFirstItem = itemsPerPage === "All" ? 0 : (currentPage - 1) * effectiveItemsPerPage;
  const indexOfLastItem = itemsPerPage === "All" ? totalItems : Math.min(currentPage * effectiveItemsPerPage, totalItems);
  
  const paginatedPOs = itemsPerPage === "All" 
    ? filteredPOs 
    : filteredPOs.slice(indexOfFirstItem, indexOfLastItem);

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
    const isInvoicePhase = activeTab === "inward_invoice";
    const sourceProducts = isInvoicePhase ? po.products.filter(p => p.selected !== false) : po.products;
    setModalProducts(sourceProducts.map(p => {
      const billed = p.invoicedQuantity || 0;
      const pending = Math.max(0, p.quantity - billed);
      return { 
        ...p,
        currentInvoiceQty: pending > 0 ? 1 : 0,
        selected: billed > 0 ? true : (pending > 0 ? (p.selected !== false) : false)
      };
    }));
    setIsProductsModalOpen(true);
  };

  const handleOpenEmailModal = async (po, dispatchObj = null) => {
    const latestDispatch = dispatchObj || (po.dispatchHistory && po.dispatchHistory[po.dispatchHistory.length - 1]) || {
      courierName: dispatchForm.courierName || "N/A",
      trackingNo: dispatchForm.trackingNo || "N/A",
      dispatchDate: dispatchForm.dispatchDate || new Date().toISOString().split("T")[0],
      transportMode: dispatchForm.transportMode || "Road",
      products: dispatchProducts.filter(p => (parseInt(p.dispatchQty) || 0) > 0)
    };

    const rawProducts = (dispatchObj && dispatchObj.products && dispatchObj.products.length > 0)
      ? dispatchObj.products
      : (po.dispatchHistory && po.dispatchHistory.length > 0 && po.dispatchHistory[po.dispatchHistory.length - 1].products?.length > 0)
        ? po.dispatchHistory[po.dispatchHistory.length - 1].products
        : (dispatchProducts.filter(p => (parseInt(p.dispatchQty) || 0) > 0).length > 0)
          ? dispatchProducts.filter(p => (parseInt(p.dispatchQty) || 0) > 0)
          : (po.products || []);

    const productsList = rawProducts;

    // Auto-fetch Client Email (from Client's contactPerson1.email or API fallback)
    let recipientEmail = po.clientEmail || po.contactPerson1?.email || po.shipper?.email || po.pi?.lead?.email || "";
    if (!recipientEmail && po.vendorName) {
      try {
        const res = await API.get(`/clients?search=${encodeURIComponent(po.vendorName)}`);
        const clientList = res.data?.clients || res.data || [];
        const matchedClient = clientList.find(c => 
          c.clientName?.trim().toLowerCase() === po.vendorName.trim().toLowerCase() ||
          c.legalEntityName?.trim().toLowerCase() === po.vendorName.trim().toLowerCase()
        );
        if (matchedClient) {
          recipientEmail = matchedClient.contactPerson1?.email || matchedClient.contactPerson2?.email || "";
        }
      } catch (e) {
        console.log("Client email search fallback error:", e);
      }
    }

    const clientName = po.vendorName || po.shipper?.billingName || po.shipper?.consigneeName || "Valued Client";
    const poNo = po.poNumber || "N/A";
    const courier = latestDispatch.courierName || "N/A";
    const tracking = latestDispatch.trackingNo || "N/A";
    const transportMode = latestDispatch.transportMode || "Road";
    const dateFormatted = latestDispatch.dispatchDate ? new Date(latestDispatch.dispatchDate).toLocaleDateString("en-GB") : "N/A";
    const trackingUrl = getCarrierTrackingLink(courier);

    const tableHeader = "Sl.No. | Brand      | Model No/Part Code   | Description                                   | UOM  | Qty Ordered | Qty Delivered";
    const tableDivider = "---------------------------------------------------------------------------------------------------------";

    const tableRows = (productsList || []).map((p, idx) => {
      const slNo = String(idx + 1).padEnd(6);
      const brand = (p.brand || "N/A").padEnd(10);
      const modelNo = (p.productNo || "N/A").padEnd(20);
      const desc = (p.name || "N/A").padEnd(45);
      const uom = (p.uom || p.unit || "Pcs").padEnd(4);
      const qtyOrdered = String(p.quantity || p.orderedQty || 0).padEnd(11);
      const qtyDelivered = String(p.dispatchQty || p.dispatchedQuantity || p.quantity || 0).padEnd(13);

      return `${slNo} | ${brand} | ${modelNo} | ${desc} | ${uom} | ${qtyOrdered} | ${qtyDelivered}`;
    }).join("\n");

    const defaultSubject = `Dispatch Details & Tracking - PO #${poNo}`;
    const defaultBody = `Dear Sir/Madam,

Greetings from TeamInspire !!!

Good news! Your order has been shipped and is on its way. Here are your dispatch details:

📦 DISPATCHED PRODUCTS:
${tableDivider}
${tableHeader}
${tableDivider}
${tableRows}
${tableDivider}

🚚 DISPATCH & TRACKING DETAILS:
- Transport Mode: ${transportMode}
- Transporter Name: ${courier}
- Tracking Number: ${tracking}
- Tracking Link: ${trackingUrl ? trackingUrl : "N/A"}
- Dispatch Date: ${dateFormatted}

If you have any questions or if there's anything else we can assist you with, please don't hesitate to reach out to our customer support team at cc@teaminspire.co.in

Thank you for choosing TeamInspire. We appreciate your patience, and we hope you enjoy your purchase!

Best regards,
TeamInspire Business Solutions Pvt Ltd

Please note: This e-mail was sent from a notification-only address that cannot accept incoming e-mail. Please do not reply to this message.`;

    setDispatchCommData({
      po,
      dispatch: {
        ...latestDispatch,
        products: productsList
      },
      recipientEmail,
      ccEmail: "",
      subject: defaultSubject,
      body: defaultBody
    });
    setIsEmailModalOpen(true);
  };

  const handleOpenWhatsAppModal = async (po, dispatchObj = null) => {
    const latestDispatch = dispatchObj || (po.dispatchHistory && po.dispatchHistory[po.dispatchHistory.length - 1]) || {
      courierName: dispatchForm.courierName || "N/A",
      trackingNo: dispatchForm.trackingNo || "N/A",
      dispatchDate: dispatchForm.dispatchDate || new Date().toISOString().split("T")[0],
      transportMode: dispatchForm.transportMode || "Road",
      products: dispatchProducts.filter(p => (parseInt(p.dispatchQty) || 0) > 0)
    };

    const rawProducts = (dispatchObj && dispatchObj.products && dispatchObj.products.length > 0)
      ? dispatchObj.products
      : (po.dispatchHistory && po.dispatchHistory.length > 0 && po.dispatchHistory[po.dispatchHistory.length - 1].products?.length > 0)
        ? po.dispatchHistory[po.dispatchHistory.length - 1].products
        : (dispatchProducts.filter(p => (parseInt(p.dispatchQty) || 0) > 0).length > 0)
          ? dispatchProducts.filter(p => (parseInt(p.dispatchQty) || 0) > 0)
          : (po.products || []);

    const productsList = rawProducts;

    // Auto-fetch Client Phone (from Client's contactPerson1.phone or API fallback)
    let phone = po.clientPhone || po.shipper?.contactNo || po.pi?.lead?.phone || po.pi?.lead?.mobile || "";
    if (!phone && po.vendorName) {
      try {
        const res = await API.get(`/clients?search=${encodeURIComponent(po.vendorName)}`);
        const clientList = res.data?.clients || res.data || [];
        const matchedClient = clientList.find(c => 
          c.clientName?.trim().toLowerCase() === po.vendorName.trim().toLowerCase() ||
          c.legalEntityName?.trim().toLowerCase() === po.vendorName.trim().toLowerCase()
        );
        if (matchedClient) {
          phone = matchedClient.contactPerson1?.phone || matchedClient.contactPerson2?.phone || "";
        }
      } catch (e) {
        console.log("Client phone search fallback error:", e);
      }
    }

    phone = phone.replace(/[^0-9]/g, "");
    if (phone.length === 10) phone = "91" + phone;

    const clientName = po.vendorName || po.shipper?.billingName || po.shipper?.consigneeName || "Valued Client";
    const poNo = po.poNumber || "N/A";
    const courier = latestDispatch.courierName || "N/A";
    const tracking = latestDispatch.trackingNo || "N/A";
    const transportMode = latestDispatch.transportMode || "Road";
    const dateFormatted = latestDispatch.dispatchDate ? new Date(latestDispatch.dispatchDate).toLocaleDateString("en-GB") : "N/A";
    const trackingUrl = getCarrierTrackingLink(courier);

    const itemsText = (productsList || []).map((p, idx) => 
      `${idx + 1}. *${p.brand || ''} ${p.productNo || ''}* - ${p.name || ''} (Qty: ${p.dispatchQty || p.dispatchedQuantity || p.quantity || 1})`
    ).join("\n");

    const defaultMsg = `📦 *DISPATCH NOTIFICATION* 📦

Dear *${clientName}*,

Your order under PO *#${poNo}* has been dispatched!

🚚 *Transporter*: ${courier}
🚛 *Transport Mode*: ${transportMode}
📌 *Tracking/AWB*: ${tracking}${trackingUrl ? `\n🔗 *Track Here*: ${trackingUrl}` : ""}
📅 *Dispatch Date*: ${dateFormatted}

📋 *Dispatched Items*:
${itemsText}

Thank you for choosing Team Inspire!`;

    setDispatchCommData({
      po,
      dispatch: {
        ...latestDispatch,
        products: productsList
      },
      recipientPhone: phone,
      whatsappMessage: defaultMsg
    });
    setIsWhatsAppModalOpen(true);
  };

  const handleOpenDispatchModal = (po) => {
    setSelectedPOForDispatch(po);
    setDispatchForm({ courierName: "", trackingNo: "", dispatchDate: new Date().toISOString().split("T")[0], transportMode: "Road" });
    const itemsToDispatch = po.products.map(p => {
      const invoiced = p.invoicedQuantity || 0;
      const dispatched = p.dispatchedQuantity || 0;
      const remaining = Math.max(0, invoiced - dispatched);
      return {
        ...p,
        remainingToDispatch: remaining,
        dispatchQty: remaining
      };
    });
    setDispatchProducts(itemsToDispatch);
    setIsDispatchModalOpen(true);
  };

  const handleProcessDispatch = async () => {
    if (!dispatchForm.courierName || !dispatchForm.trackingNo || !dispatchForm.dispatchDate) {
      toast.error("Courier Name, Tracking No, and Date are required!");
      return;
    }
    const itemsToSend = dispatchProducts.filter(p => (parseInt(p.dispatchQty) || 0) > 0);
    if (itemsToSend.length === 0) {
      toast.error("Please enter a valid dispatch quantity for at least one item!");
      return;
    }
    const hasExceeded = itemsToSend.some(p => p.dispatchQty > p.remainingToDispatch);
    if (hasExceeded) {
      toast.error("Dispatch quantity cannot exceed remaining invoiced quantity!");
      return;
    }
    try {
      const newDispatch = {
        courierName: dispatchForm.courierName,
        trackingNo: dispatchForm.trackingNo,
        transportMode: dispatchForm.transportMode || "Road",
        dispatchDate: dispatchForm.dispatchDate,
        products: itemsToSend.map(p => ({
          productNo: p.productNo,
          name: p.name,
          brand: p.brand,
          quantity: parseInt(p.dispatchQty) || 0
        }))
      };
      const updatedProducts = selectedPOForDispatch.products.map(p => {
        const matching = itemsToSend.find(b => b.productNo === p.productNo);
        if (matching) {
          return {
            ...p,
            dispatchedQuantity: (p.dispatchedQuantity || 0) + (parseInt(matching.dispatchQty) || 0)
          };
        }
        return p;
      });
      const activeProducts = updatedProducts.filter(p => p.selected !== false);
      const totalInvoiced = activeProducts.reduce((sum, p) => sum + (p.invoicedQuantity || 0), 0);
      const totalDispatched = activeProducts.reduce((sum, p) => sum + (p.dispatchedQuantity || 0), 0);
      const newStatus = (totalInvoiced > 0 && totalDispatched >= totalInvoiced) ? "Dispatched" : "Pending";

      await API.put(`/purchase-orders/${selectedPOForDispatch._id}`, {
        products: updatedProducts,
        status: newStatus,
        dispatchHistory: [...(selectedPOForDispatch.dispatchHistory || []), newDispatch]
      });
      toast.success("Dispatch tracking details updated successfully!");
      setIsDispatchModalOpen(false);
      fetchPOs();
    } catch (err) {
      console.error("Error updating dispatch:", err);
      toast.error("Failed to update dispatch tracking details");
    }
  };

  const handleToggleProduct = (index) => {
    const p = modalProducts[index];
    const po = selectedPOForProducts;
    if (!po) return;
    const isInvoicePhase = activeTab === "inward_invoice";
    const isOutward = activeTab !== "inward" && activeTab !== "inward_invoice" && po.type !== "inward";
    const processed = p.invoicedQuantity || 0;
    const remaining = Math.max(0, p.quantity - processed);
    const isFullyBilled = isOutward && (processed >= p.quantity);
    const isFullyProcessedInward = !isOutward && (remaining === 0);
    const isPartiallyOrFullyInvoicedInward = !isOutward && (processed > 0);
    const isMovedToInvoice = !isOutward && po.isMovedToInvoice === true;
    const savedProduct = po.products?.find(sp => sp.productNo === p.productNo);
    const isSelectedInDatabase = savedProduct ? savedProduct.selected !== false : false;
    const isSelectedAndMoved = !isInvoicePhase && isMovedToInvoice && isSelectedInDatabase;
    const isDisabled = isFullyBilled || 
                       isFullyProcessedInward || 
                       (!isInvoicePhase && isPartiallyOrFullyInvoicedInward) || 
                       isSelectedAndMoved;

    if (isDisabled) return;
    const updated = [...modalProducts];
    updated[index].selected = !updated[index].selected;
    setModalProducts(updated);
  };

  const handleToggleAllProducts = () => {
    const po = selectedPOForProducts;
    if (!po) return;
    const isInvoicePhase = activeTab === "inward_invoice";
    const isOutward = activeTab !== "inward" && activeTab !== "inward_invoice" && po.type !== "inward";

    const checkIsDisabled = (p) => {
      const processed = p.invoicedQuantity || 0;
      const remaining = Math.max(0, p.quantity - processed);
      const isFullyBilled = isOutward && (processed >= p.quantity);
      const isFullyProcessedInward = !isOutward && (remaining === 0);
      const isPartiallyOrFullyInvoicedInward = !isOutward && (processed > 0);
      const isMovedToInvoice = !isOutward && po.isMovedToInvoice === true;
      const savedProduct = po.products?.find(sp => sp.productNo === p.productNo);
      const isSelectedInDatabase = savedProduct ? savedProduct.selected !== false : false;
      const isSelectedAndMoved = !isInvoicePhase && isMovedToInvoice && isSelectedInDatabase;
      return isFullyBilled || 
             isFullyProcessedInward || 
             (!isInvoicePhase && isPartiallyOrFullyInvoicedInward) || 
             isSelectedAndMoved;
    };

    const availableProducts = modalProducts.filter(p => !checkIsDisabled(p));
    if (availableProducts.length === 0) return;

    const allAvailableSelected = availableProducts.every(p => p.selected);
    const updated = modalProducts.map(p => {
      if (checkIsDisabled(p)) return p;
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
        const anySelected = modalProducts.some(p => p.selected);
        if (!anySelected) {
          toast.error("⚠️ Restriction: Cannot update Inward PO without selecting at least one item! Please select at least one item.");
          return;
        }
        const isMoved = po.isMovedToInvoice || shouldMoveToInvoice;
        let newStatus;
        if (isMoved) {
          newStatus = getInwardPOInvoiceStatus(modalProducts);
        } else {
          const allSelected = modalProducts.every(p => p.selected);
          newStatus = "Pending";
          if (allSelected) {
            newStatus = "Processed";
          } else if (anySelected) {
            newStatus = "Partially Pending";
          }
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
      const anySelected = modalProducts.some(p => p.selected);
      if (!anySelected) {
        toast.error("⚠️ Restriction: You must select at least one item before updating or proceeding with the Inward PO!");
        return;
      }
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
      
      const isDispatch = activeTab === "dispatch";
      const hasPI = po.pi && po.pi._id;
      const endpoint = isDispatch 
        ? `/purchase-orders/${po._id}/pdf?mode=dispatch` 
        : (hasPI ? `/quotations/${po.pi._id}/pdf` : `/purchase-orders/${po._id}/pdf`);

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

        const newStatus = getInwardPOInvoiceStatus(updatedProducts);

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

  const getPOProductInvoiceNumbers = (po, productNo) => {
    if (!po || !po.invoiceHistory) return [];
    const invs = po.invoiceHistory.filter(inv => 
      (inv.products || []).some(ip => ip.productNo === productNo)
    ).map(inv => inv.invoiceNo);
    return Array.from(new Set(invs));
  };

  const getProductInvoiceNumbers = (productNo) => {
    return getPOProductInvoiceNumbers(selectedPOForHistory, productNo);
  };

  const isInvoicePhase = activeTab === "inward_invoice";

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
        
        {/* Helper Note & Master Dashboard Button */}
        <div className="flex items-center gap-4">
          <a
            href="/master-dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition-all transform hover:scale-105 text-xs uppercase tracking-wider whitespace-nowrap"
          >
            <Maximize2 size={16} />
            Show Master Dashboard ↗
          </a>
          <div className="text-xs text-gray-400 dark:text-gray-500 max-w-xs md:text-right font-medium hidden md:block">
            💡 Purchase Orders can be created directly by converting Proforma Invoices (PI) from PI Management.
          </div>
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
              onClick={() => setActiveTab("dispatch")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === "dispatch"
                  ? "bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm border border-gray-100 dark:border-gray-700 font-bold"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              <Truck size={16} className={activeTab === "dispatch" ? "text-amber-500" : ""} />
              Dispatch Management {activeTab === "dispatch" ? `(${filteredPOs.length})` : ""}
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

          {/* Search bar & Actions */}
          <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
            {activeTab === "outward" && (
              <button
                onClick={() => setIsCreateOutwardOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition shadow-sm whitespace-nowrap"
              >
                <Plus size={16} /> Create Outward PO
              </button>
            )}
            
            {/* Status Filter */}
            {activeTab !== "outward" && (
              <div className="relative flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-3 py-2.5">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent border-none text-xs outline-none text-gray-700 dark:text-white cursor-pointer font-bold focus:ring-0"
                >
                  <option value="All" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">All Statuses</option>
                  {activeTab === "inward_invoice" ? (
                    <>
                      <option value="Pending" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Pending</option>
                      <option value="Partially Invoiced" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Partially Invoiced</option>
                      <option value="Invoiced" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Invoiced</option>
                    </>
                  ) : activeTab === "dispatch" ? (
                    <>
                      <option value="Pending" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Pending</option>
                      <option value="Dispatched" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Dispatched</option>
                    </>
                  ) : (
                    <>
                      <option value="Pending" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Pending</option>
                      <option value="Partially Processed" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Partially Processed</option>
                      <option value="Processed" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Processed</option>
                    </>
                  )}
                </select>
              </div>
            )}

            <div className="relative flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-2.5 w-full md:w-72">
              <Search size={16} className="text-gray-400 mr-2" />
              <input 
                type="text" 
                placeholder="Search POs..." 
                className="bg-transparent border-none text-xs outline-none text-gray-700 dark:text-white placeholder-gray-400 w-full"
                value={searchQueries[activeTab] || ""}
                onChange={(e) => setSearchQueries({ ...searchQueries, [activeTab]: e.target.value })}
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

        {/* PO Table list (Scrollable Frame Container) */}
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)] min-h-[400px] rounded-2xl border border-gray-100 dark:border-gray-700/70 shadow-xs bg-white dark:bg-gray-800 relative">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Loading records...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100/95 dark:bg-gray-800/95 backdrop-blur-md sticky top-0 z-10 shadow-xs border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">PO Number</th>
                  {activeTab !== "outward" && (
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 w-52">PI / Lead Ref</th>
                  )}
                  {activeTab !== "outward" ? (
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        {activeTab === "dispatch" ? "Client / Vendor Name" : (activeTab === "inward" || activeTab === "inward_invoice" ? "Client Name" : "Vendor Name")}
                      </th>
                  ) : (
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Shipper Name</th>
                  )}
                  {activeTab !== "outward" && (
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Date</th>
                  )}
                  {activeTab === "outward" && (
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Created By</th>
                  )}
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Total Value</th>
                  {activeTab !== "outward" && (
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Status</th>
                  )}
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 text-center">Actions</th>
                </tr>
              </thead>
              <tbody key={activeTab} className="divide-y divide-gray-100 dark:divide-gray-700 animate-fade-in">
                {paginatedPOs.map((po) => (
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
                    {activeTab !== "outward" && (
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
                    )}
                    {activeTab !== "outward" ? (
                        <td className="px-6 py-4 text-sm text-gray-950 dark:text-white font-medium">
                          {po.vendorName}
                        </td>
                    ) : (
                        <td className="px-6 py-4 text-sm text-gray-950 dark:text-white font-medium">
                          {po.shipper ? (po.shipper.billingName || po.shipper.consigneeName) : "-"}
                        </td>
                    )}
                    {activeTab !== "outward" && (
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(po.date).toLocaleDateString("en-GB")}
                      </td>
                    )}
                    {activeTab === "outward" && (
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-semibold">
                        {po.createdBy ? po.createdBy.name : "-"}
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm font-bold text-gray-800 dark:text-gray-200">
                      ₹{po.totalValue?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    {activeTab !== "outward" && (
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${statusColors[getDisplayStatus(po, activeTab)] || "bg-gray-100 text-gray-800"}`}>
                          {getDisplayStatus(po, activeTab)}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* View Product Checkbox Icon / Edit Icon (Disabled in Dispatch Management tab) */}
                        {activeTab !== "dispatch" && (
                          activeTab === "outward" ? (
                            <button 
                              onClick={() => {
                                  setSelectedPOToEdit(po);
                                  setIsCreateOutwardOpen(true);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition hover:scale-110 cursor-pointer"
                              title="Edit Outward PO"
                            >
                              <Edit size={18} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleOpenProductsModal(po)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition hover:scale-110 cursor-pointer"
                              title="View Products for Update"
                            >
                              <List size={18} />
                            </button>
                          )
                        )}
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
                        {((activeTab === "inward_invoice") || (activeTab === "inward" && po.isMovedToInvoice === true)) && po.products?.filter(p => p.selected !== false).some(p => (p.invoicedQuantity || 0) < p.quantity) && (
                          <button 
                            onClick={() => handleOpenInwardBilling(po)}
                            className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition hover:scale-110 cursor-pointer"
                            title="Generate Inward Invoice / Bill"
                          >
                            <FileCheck size={18} />
                          </button>
                        )}
                        {/* Move to Invoice Icon (Outward only) */}
                        {activeTab !== "outward" && activeTab !== "inward" && activeTab !== "inward_invoice" && po.type !== "inward" && po.status !== "Processed" && (
                          <button 
                            onClick={() => handleOpenInvoicePrompt(po)}
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition hover:scale-110 cursor-pointer"
                            title="Move to Invoice"
                          >
                            <FileCheck size={18} />
                          </button>
                        )}
                        {/* Update Dispatch Tracking Button & Direct Email/WhatsApp (Dispatch tab only) */}
                        {activeTab === "dispatch" && (
                          <>
                            {po.products?.some(p => (p.invoicedQuantity || 0) > (p.dispatchedQuantity || 0)) && (
                              <button 
                                onClick={() => handleOpenDispatchModal(po)}
                                className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition hover:scale-110 cursor-pointer"
                                title="Update Tracking Details"
                              >
                                <Truck size={18} />
                              </button>
                            )}
                            <button 
                              onClick={() => handleOpenEmailModal(po)}
                              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition hover:scale-110 cursor-pointer"
                              title="Send Dispatch Email"
                            >
                              <Mail size={18} />
                            </button>
                            <button 
                              onClick={() => handleOpenWhatsAppModal(po)}
                              className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition hover:scale-110 cursor-pointer"
                              title="Send Dispatch WhatsApp Notification"
                            >
                              <MessageSquare size={18} />
                            </button>
                          </>
                        )}
                        {/* History / Records Icon */}
                        {((activeTab === "inward_invoice") || (activeTab === "inward" && po.isMovedToInvoice === true) || activeTab === "outward" || activeTab === "dispatch") && ((po.invoiceHistory && po.invoiceHistory.length > 0) || (po.dispatchHistory && po.dispatchHistory.length > 0)) && (
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

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-xs text-gray-500 dark:text-gray-400">
          {/* Left: Entries Info & Items Per Page Selector */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-medium">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  const val = e.target.value === "All" ? "All" : Number(e.target.value);
                  setItemsPerPage(val);
                  setCurrentPage(1);
                }}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer focus:ring-1 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="All">All</option>
              </select>
              <span className="font-medium">entries per page</span>
            </div>
            <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">|</span>
            <span className="font-semibold">
              Showing <span className="text-gray-900 dark:text-white font-bold">{totalItems === 0 ? 0 : indexOfFirstItem + 1}</span> to{" "}
              <span className="text-gray-900 dark:text-white font-bold">{indexOfLastItem}</span> of{" "}
              <span className="text-gray-900 dark:text-white font-bold">{totalItems}</span> entries
            </span>
          </div>

          {/* Right: Page Navigation Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition text-gray-600 dark:text-gray-300 cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition text-gray-600 dark:text-gray-300 cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (totalPages <= 7) return true;
                    if (page === 1 || page === totalPages) return true;
                    if (Math.abs(page - currentPage) <= 1) return true;
                    return false;
                  })
                  .map((page, idx, array) => {
                    const prevPage = array[idx - 1];
                    const showEllipsis = prevPage && page - prevPage > 1;

                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && <span className="px-1 text-gray-400">...</span>}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1.5 rounded-xl font-bold transition text-xs cursor-pointer ${
                            currentPage === page
                              ? "bg-blue-600 text-white shadow-sm"
                              : "border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition text-gray-600 dark:text-gray-300 cursor-pointer"
                title="Next Page"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition text-gray-600 dark:text-gray-300 cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
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
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                  PO: <span className="text-lime-600 dark:text-lime-400 font-bold">{selectedPOForProducts.poNumber}</span> | PO Date: <span className="text-lime-600 dark:text-lime-400 font-bold">{selectedPOForProducts.pi?.poDate ? new Date(selectedPOForProducts.pi.poDate).toLocaleDateString("en-GB") : new Date(selectedPOForProducts.date).toLocaleDateString("en-GB")}</span>
                </p>
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
                    const isInvoicePhase = activeTab === "inward_invoice";
                    const isOutward = activeTab !== "inward" && activeTab !== "inward_invoice" && selectedPOForProducts?.type !== "inward";
                    const processed = p.invoicedQuantity || 0;
                    const remaining = Math.max(0, p.quantity - processed);
                    const isFullyBilled = isOutward && (processed >= p.quantity);
                    const isFullyProcessedInward = !isOutward && (remaining === 0);
                    const isPartiallyOrFullyInvoicedInward = !isOutward && (processed > 0);
                    const isMovedToInvoice = !isOutward && selectedPOForProducts?.isMovedToInvoice === true;
                    const savedProduct = selectedPOForProducts?.products?.find(sp => sp.productNo === p.productNo);
                    const isSelectedInDatabase = savedProduct ? savedProduct.selected !== false : false;
                    const isSelectedAndMoved = !isInvoicePhase && isMovedToInvoice && isSelectedInDatabase;
                    const isDisabled = isFullyBilled || 
                                       isFullyProcessedInward || 
                                       (!isInvoicePhase && isPartiallyOrFullyInvoicedInward) || 
                                       isSelectedAndMoved;

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
                              <span className="inline-block bg-lime-300 dark:bg-lime-950/60 text-lime-900 dark:text-lime-300 px-2 py-0.5 rounded-lg text-sm font-bold border border-lime-400/20 shadow-sm max-w-full truncate">
                                {p.name}
                              </span>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 flex items-center gap-1.5 flex-wrap">
                                <span className="bg-lime-300 dark:bg-lime-950/60 text-lime-900 dark:text-lime-300 px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase border border-lime-400/20 shadow-sm">
                                  {p.brand}
                                </span>
                                <span>|</span>
                                <span className="bg-lime-300 dark:bg-lime-950/60 text-lime-900 dark:text-lime-300 px-1.5 py-0.5 rounded-md font-mono font-bold text-[10px] uppercase border border-lime-400/20 shadow-sm">
                                  {p.productNo}
                                </span>
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
                                    min="1"
                                    max={p.quantity - processed}
                                    disabled={processed >= p.quantity || !p.selected}
                                    value={p.currentInvoiceQty ?? 1}
                                    onChange={(e) => {
                                      let newQuantity = parseInt(e.target.value) || 1;
                                      const pending = p.quantity - processed;
                                      if (newQuantity > pending) newQuantity = pending;
                                      if (newQuantity < 1) newQuantity = 1;
                                      
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
                          {isInvoicePhase && (
                            <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 mt-3 font-medium border-t border-gray-100 dark:border-gray-700/50 pt-2.5" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">Invoice Qty:</span>
                                <input 
                                  type="number"
                                  min="1"
                                  max={remaining}
                                  disabled={remaining === 0 || !p.selected}
                                  value={p.currentInvoiceQty ?? 1}
                                  onChange={(e) => {
                                    let val = parseInt(e.target.value) || 1;
                                    if (val > remaining) val = remaining;
                                    if (val < 1) val = 1;
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
                {!isInvoicePhase && (
                  <button
                    onClick={handleUpdatePOProducts}
                    className="px-5 py-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:scale-105 active:scale-95 shadow-md shadow-blue-500/10 transition cursor-pointer"
                  >
                    Update PO
                  </button>
                )}
                {isInvoicePhase && (
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
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">Purchase Order Details</h3>
                <div className="flex flex-col mt-1.5 text-sm text-gray-500 dark:text-gray-400 font-medium">
                  <p>PO Number: <span className="font-extrabold text-gray-700 dark:text-gray-300">{selectedPOForDetails.poNumber}</span></p>
                  <p className="text-lime-600 dark:text-lime-400 font-bold mt-0.5">PO Date: {selectedPOForDetails.pi?.poDate ? new Date(selectedPOForDetails.pi.poDate).toLocaleDateString("en-GB") : new Date(selectedPOForDetails.date).toLocaleDateString("en-GB")}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[600px]">
              {/* Meta Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl">
                <div>
                  <p className="text-xs font-black uppercase text-gray-400 tracking-wider">
                    {selectedPOForDetails.type === "outward" ? "Shipper Name" : "Vendor/Client"}
                  </p>
                  <p className="text-base font-extrabold text-gray-800 dark:text-gray-200 mt-1">
                    {selectedPOForDetails.type === "outward" ? (selectedPOForDetails.shipper?.billingName || "-") : selectedPOForDetails.vendorName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-gray-400 tracking-wider">Date</p>
                  <p className="text-base font-extrabold text-gray-800 dark:text-gray-200 mt-1">{new Date(selectedPOForDetails.date).toLocaleDateString("en-GB")}</p>
                </div>
                {selectedPOForDetails.type !== "outward" && (
                  <div>
                    <p className="text-xs font-black uppercase text-gray-400 tracking-wider mb-1">Status</p>
                    <span className={`inline-block px-3.5 py-1 text-xs font-black uppercase rounded-full ${statusColors[getDisplayStatus(selectedPOForDetails, activeTab)] || "bg-gray-100 text-gray-800"}`}>
                      {getDisplayStatus(selectedPOForDetails, activeTab)}
                    </span>
                  </div>
                )}
                {selectedPOForDetails.type !== "outward" && (
                  <div>
                    <p className="text-xs font-black uppercase text-gray-400 tracking-wider">PI Reference</p>
                    <p className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-1">#{selectedPOForDetails.pi?.quotationNumber || "N/A"}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-black uppercase text-gray-400 tracking-wider">Type</p>
                  <p className="text-base font-extrabold text-gray-800 dark:text-gray-200 mt-1 capitalize">{selectedPOForDetails.type} PO</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-gray-400 tracking-wider">Taxable Value</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white mt-1">
                    ₹{(selectedPOForDetails.products || [])
                      .filter(p => activeTab === "dispatch" ? (p.invoicedQuantity > 0) : p.selected)
                      .reduce((sum, p) => sum + ((activeTab === "dispatch" ? (p.invoicedQuantity || 0) : (p.quantity || 0)) * (p.unitPrice || 0)), 0)
                      .toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Products Table */}
              <div>
                <h4 className="text-sm font-black uppercase text-gray-400 tracking-wider mb-3">
                  Included Products ({(selectedPOForDetails.products || []).filter(p => activeTab === "dispatch" ? (p.invoicedQuantity > 0) : p.selected).length})
                </h4>
                <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-2xl">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-3 text-sm font-black uppercase text-gray-400">Model/Brand</th>
                        <th className="px-4 py-3 text-sm font-black uppercase text-gray-400">Product Name</th>
                        <th className="px-4 py-3 text-sm font-black uppercase text-gray-400 text-center">QTY</th>
                        <th className="px-4 py-3 text-sm font-black uppercase text-gray-400 text-right">Price</th>
                        <th className="px-4 py-3 text-sm font-black uppercase text-gray-400 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {(selectedPOForDetails.products || [])
                        .filter(p => activeTab === "dispatch" ? (p.invoicedQuantity > 0) : p.selected)
                        .map((p, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/20">
                            <td className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                <div className="inline-block bg-lime-300 dark:bg-lime-950/60 text-lime-900 dark:text-lime-300 px-2 py-0.5 rounded-md font-mono font-extrabold text-xs uppercase border border-lime-400/20 shadow-sm">
                                  {p.productNo}
                                </div>
                                {activeTab === "dispatch" && getPOProductInvoiceNumbers(selectedPOForDetails, p.productNo).map((invNo, iIdx) => (
                                  <span key={iIdx} className="inline-block text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900 px-2 py-0.5 rounded-md">
                                    Inv: {invNo}
                                  </span>
                                ))}
                              </div>
                              <div>
                                <span className="inline-block bg-lime-300 dark:bg-lime-950/60 text-lime-900 dark:text-lime-300 px-2 py-0.5 rounded-md font-bold text-xs uppercase border border-lime-400/20 shadow-sm">
                                  {p.brand}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm font-extrabold text-gray-900 dark:text-white" title={p.name}>
                              <span className="inline-block bg-lime-300 dark:bg-lime-950/60 text-lime-900 dark:text-lime-300 px-2 py-0.5 rounded-md font-extrabold border border-lime-400/20 shadow-sm">
                                {p.name}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center font-black">
                              {activeTab === "dispatch" ? p.invoicedQuantity : p.quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-right font-bold">
                              ₹{p.unitPrice?.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right font-black">
                              ₹{(activeTab === "dispatch" ? (p.invoicedQuantity || 0) * (p.unitPrice || 0) : (p.total || 0)).toLocaleString()}
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
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                  PO: <span className="text-lime-600 dark:text-lime-400 font-bold">{selectedPOForBilling.poNumber}</span> | PO Date: <span className="text-lime-600 dark:text-lime-400 font-bold">{selectedPOForBilling.pi?.poDate ? new Date(selectedPOForBilling.pi.poDate).toLocaleDateString("en-GB") : new Date(selectedPOForBilling.date).toLocaleDateString("en-GB")}</span> | Partner: {selectedPOForBilling.vendorName}
                </p>
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

      {/* 🚚 Update Dispatch Tracking Modal */}
      {isDispatchModalOpen && selectedPOForDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">Update Dispatch Tracking</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">PO Number: {selectedPOForDispatch.poNumber}</p>
              </div>
              <button 
                onClick={() => setIsDispatchModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[450px]">
              {/* Courier, Tracking, Date & Transport Mode Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Transport Mode</label>
                  <select 
                    value={dispatchForm.transportMode || "Road"}
                    onChange={e => setDispatchForm({...dispatchForm, transportMode: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none focus:border-blue-500"
                  >
                    <option value="Road">Road</option>
                    <option value="Air">Air</option>
                    <option value="Rail">Rail</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Courier / Partner Name</label>
                  <select 
                    value={dispatchForm.courierName}
                    onChange={e => setDispatchForm({...dispatchForm, courierName: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none focus:border-blue-500"
                  >
                    <option value="" disabled>Select Courier</option>
                    <option value="Bluedart">Bluedart</option>
                    <option value="SafeXpress">SafeXpress</option>
                    <option value="DTDC">DTDC</option>
                    <option value="Trackon">Trackon</option>
                    <option value="Porter">Porter</option>
                    <option value="Self">Self</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Tracking Number / AWB</label>
                  <input 
                    type="text"
                    placeholder="e.g. AWB12938192"
                    value={dispatchForm.trackingNo}
                    onChange={e => setDispatchForm({...dispatchForm, trackingNo: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Dispatch Date</label>
                  <input 
                    type="date"
                    value={dispatchForm.dispatchDate}
                    onChange={e => setDispatchForm({...dispatchForm, dispatchDate: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Products List for Dispatch */}
              <div>
                <h4 className="text-sm font-black uppercase text-gray-400 tracking-wider mb-3">Dispatch Quantity Details</h4>
                <div className="space-y-3">
                  {dispatchProducts.filter(p => p.remainingToDispatch > 0).map((p, idx) => (
                    <div 
                      key={p.productNo}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="bg-lime-300 dark:bg-lime-950/60 text-lime-900 dark:text-lime-300 px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase border border-lime-400/20 shadow-sm">
                            {p.brand}
                          </span>
                          <span className="bg-lime-300 dark:bg-lime-950/60 text-lime-900 dark:text-lime-300 px-1.5 py-0.5 rounded-md font-mono font-bold text-[10px] uppercase border border-lime-400/20 shadow-sm">
                            {p.productNo}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-850 dark:text-gray-200 truncate">{p.name}</p>
                        <div className="flex gap-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1">
                          <span>Total Invoiced: {p.invoicedQuantity || 0}</span>
                          <span>Already Sent: {p.dispatchedQuantity || 0}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end md:self-auto">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Dispatch Qty:</span>
                        <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-black px-3 py-1 rounded-xl text-xs border border-amber-200 dark:border-amber-900/50 shadow-sm">
                          {p.remainingToDispatch}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEmailModal(selectedPOForDispatch)}
                  className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-bold uppercase rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/60 transition flex items-center gap-1.5 cursor-pointer"
                  title="Prepare & Send Email"
                >
                  <Mail size={15} /> Send Email
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenWhatsAppModal(selectedPOForDispatch)}
                  className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold uppercase rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition flex items-center gap-1.5 cursor-pointer"
                  title="Prepare & Send WhatsApp Message"
                >
                  <MessageSquare size={15} /> WhatsApp
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProcessDispatch}
                  className="px-5 py-2.5 bg-gradient-to-tr from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer"
                >
                  Update Dispatch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🕒 Invoice / Dispatch History Modal */}
      {isHistoryModalOpen && selectedPOForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in">
            <div className="px-6 py-5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  {activeTab === "dispatch" ? "Dispatch History" : "Invoice History"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-bold mt-0.5">PO Number: {selectedPOForHistory.poNumber}</p>
              </div>
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[600px] space-y-5">
              {activeTab === "dispatch" ? (
                !selectedPOForHistory.dispatchHistory || selectedPOForHistory.dispatchHistory.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 font-bold uppercase tracking-widest text-xs">No dispatches recorded yet</div>
                ) : (
                  selectedPOForHistory.dispatchHistory.map((disp, i) => (
                    <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-gray-50 dark:bg-gray-900 px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                        <div className="flex gap-6 flex-wrap">
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-widest font-black">Transport Mode</p>
                            <p className="text-base font-extrabold text-gray-900 dark:text-white mt-0.5">{disp.transportMode || "Road"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-widest font-black">Courier / Partner</p>
                            <p className="text-base font-extrabold text-gray-900 dark:text-white mt-0.5">{disp.courierName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-widest font-black">Tracking / AWB</p>
                            <p className="text-base font-extrabold text-gray-900 dark:text-white mt-0.5">{disp.trackingNo}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-widest font-black">Date</p>
                            <p className="text-base font-extrabold text-gray-900 dark:text-white mt-0.5">{new Date(disp.dispatchDate).toLocaleDateString("en-GB")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEmailModal(selectedPOForHistory, disp)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-bold rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition cursor-pointer"
                            title="Send Email for this Dispatch"
                          >
                            <Mail size={14} /> Mail
                          </button>
                          <button
                            onClick={() => handleOpenWhatsAppModal(selectedPOForHistory, disp)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition cursor-pointer"
                            title="Send WhatsApp Notification for this Dispatch"
                          >
                            <MessageSquare size={14} /> WhatsApp
                          </button>
                        </div>
                      </div>
                      <div className="p-4 bg-white dark:bg-gray-800">
                        <table className="w-full text-left">
                          <thead>
                            <tr>
                              <th className="pb-2 text-sm font-black text-gray-400 uppercase tracking-widest">Product</th>
                              <th className="pb-2 text-sm font-black text-gray-400 uppercase tracking-widest text-center">Dispatched Qty</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {disp.products.map((p, j) => (
                              <tr key={j}>
                                <td className="py-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="font-extrabold text-gray-900 dark:text-white">{p.productNo}</span>
                                    {getProductInvoiceNumbers(p.productNo).map((invNo, iIdx) => (
                                      <span key={iIdx} className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900 px-2 py-0.5 rounded-md">
                                        Inv: {invNo}
                                      </span>
                                    ))}
                                  </div>
                                  <div className="text-xs font-bold text-gray-500" title={p.name}>{p.name}</div>
                                </td>
                                <td className="py-3 text-sm text-center font-black text-gray-700 dark:text-gray-300">{p.quantity}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )
              ) : (
                !selectedPOForHistory.invoiceHistory || selectedPOForHistory.invoiceHistory.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 font-bold uppercase tracking-widest text-xs">No invoices generated yet</div>
                ) : (
                  selectedPOForHistory.invoiceHistory.map((inv, i) => (
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
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ❓ Move to Inward Invoice Confirmation Modal */}
      {isMoveConfirmOpen && selectedPOForProducts && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in p-6 text-center space-y-5">
            <button 
              onClick={() => setIsMoveConfirmOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
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

      {/* 📧 Dispatch Email Modal */}
      {isEmailModalOpen && dispatchCommData && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Mail size={22} />
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wider">Send Dispatch Email</h3>
                  <p className="text-xs text-blue-100 font-medium">PO: {dispatchCommData.po?.poNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEmailModalOpen(false)}
                className="p-2 text-white/80 hover:text-white rounded-xl transition hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 p-3.5 rounded-2xl text-xs text-blue-800 dark:text-blue-300 font-medium">
                💡 Client email is auto-fetched from Personal Contact. Formatted table is embedded inside the email body below.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">To (Recipient Email)</label>
                  <input 
                    type="email"
                    placeholder="e.g. client@example.com"
                    value={dispatchCommData.recipientEmail || ""}
                    onChange={e => setDispatchCommData({...dispatchCommData, recipientEmail: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">CC (Optional Email)</label>
                  <input 
                    type="text"
                    placeholder="e.g. manager@client.com"
                    value={dispatchCommData.ccEmail || ""}
                    onChange={e => setDispatchCommData({...dispatchCommData, ccEmail: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Subject</label>
                  <input 
                    type="text"
                    value={dispatchCommData.subject || ""}
                    onChange={e => setDispatchCommData({...dispatchCommData, subject: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Email Message Body Container with Embedded Table */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">Email Message Body (Professional Formatted Layout)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const bodyElement = document.getElementById("email-body-container");
                      if (bodyElement) {
                        const range = document.createRange();
                        range.selectNode(bodyElement);
                        window.getSelection().removeAllRanges();
                        window.getSelection().addRange(range);
                        document.execCommand("copy");
                        window.getSelection().removeAllRanges();
                        toast.success("Email Body & Table copied to clipboard!");
                      }
                    }}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Copy size={13} /> Copy Email Body & Table
                  </button>
                </div>

                <div 
                  id="email-body-container"
                  className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-2xl p-6 text-xs text-gray-800 dark:text-gray-200 font-sans space-y-4 shadow-sm"
                >
                  <p className="font-bold text-sm text-gray-900 dark:text-white">
                    Dear Sir/Madam,
                  </p>

                  <p className="font-extrabold text-sm text-red-600 dark:text-red-500">
                    Greetings from TeamInspire !!!
                  </p>

                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                    Good news! Your order has been shipped and is on its way. Here are your dispatch details:
                  </p>

                  {/* Formatted 7-Column Table INSIDE Mail Body */}
                  <div className="overflow-x-auto my-4">
                    <table 
                      style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000000", fontFamily: "Arial, sans-serif", fontSize: "12px", margin: "12px 0" }}
                      className="w-full text-xs text-left border-collapse border-2 border-gray-800 dark:border-gray-300"
                    >
                      <thead className="bg-gray-100 dark:bg-gray-800 font-bold text-gray-900 dark:text-white" style={{ backgroundColor: "#f3f4f6" }}>
                        <tr className="border-b-2 border-gray-800 dark:border-gray-300">
                          <th style={{ border: "1.5px solid #000000", padding: "8px 6px", textAlign: "center", fontWeight: "bold", color: "#000000" }} className="border border-gray-800 dark:border-gray-400 px-2.5 py-2 text-center font-black">Sl.No.</th>
                          <th style={{ border: "1.5px solid #000000", padding: "8px 6px", textAlign: "left", fontWeight: "bold", color: "#000000" }} className="border border-gray-800 dark:border-gray-400 px-2.5 py-2 font-black">Brand</th>
                          <th style={{ border: "1.5px solid #000000", padding: "8px 6px", textAlign: "left", fontWeight: "bold", color: "#000000" }} className="border border-gray-800 dark:border-gray-400 px-2.5 py-2 font-black">Model No/Part Code</th>
                          <th style={{ border: "1.5px solid #000000", padding: "8px 6px", textAlign: "left", fontWeight: "bold", color: "#000000" }} className="border border-gray-800 dark:border-gray-400 px-2.5 py-2 font-black">Description</th>
                          <th style={{ border: "1.5px solid #000000", padding: "8px 6px", textAlign: "center", fontWeight: "bold", color: "#000000" }} className="border border-gray-800 dark:border-gray-400 px-2.5 py-2 text-center font-black">UOM</th>
                          <th style={{ border: "1.5px solid #000000", padding: "8px 6px", textAlign: "center", fontWeight: "bold", color: "#000000" }} className="border border-gray-800 dark:border-gray-400 px-2.5 py-2 text-center font-black">Qty Ordered</th>
                          <th style={{ border: "1.5px solid #000000", padding: "8px 6px", textAlign: "center", fontWeight: "bold", color: "#000000" }} className="border border-gray-800 dark:border-gray-400 px-2.5 py-2 text-center font-black">Qty Delivered</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800 dark:divide-gray-400">
                        {(dispatchCommData.dispatch?.products || []).map((p, i) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td style={{ border: "1.5px solid #000000", padding: "8px 6px", textAlign: "center", fontWeight: "bold" }} className="border border-gray-800 dark:border-gray-400 px-2.5 py-2 text-center font-bold">{i + 1}</td>
                            <td style={{ border: "1.5px solid #000000", padding: "8px 6px" }} className="border border-gray-800 dark:border-gray-400 px-2.5 py-2 font-medium">{p.brand || "N/A"}</td>
                            <td style={{ border: "1.5px solid #000000", padding: "8px 6px", fontWeight: "bold", color: "#1d4ed8" }} className="border border-gray-800 dark:border-gray-400 px-2.5 py-2 font-semibold text-blue-600 dark:text-blue-400">{p.productNo || "N/A"}</td>
                            <td style={{ border: "1.5px solid #000000", padding: "8px 6px" }} className="border border-gray-800 dark:border-gray-400 px-2.5 py-2 font-medium">{p.name || "N/A"}</td>
                            <td style={{ border: "1.5px solid #000000", padding: "8px 6px", textAlign: "center" }} className="border border-gray-800 dark:border-gray-400 px-2.5 py-2 text-center">{p.uom || p.unit || "Pcs"}</td>
                            <td style={{ border: "1.5px solid #000000", padding: "8px 6px", textAlign: "center", fontWeight: "bold" }} className="border border-gray-800 dark:border-gray-400 px-2.5 py-2 text-center font-semibold">{p.quantity || p.orderedQty || 0}</td>
                            <td style={{ border: "1.5px solid #000000", padding: "8px 6px", textAlign: "center", fontWeight: "bold", color: "#047857" }} className="border border-gray-800 dark:border-gray-400 px-2.5 py-2 text-center font-bold text-emerald-600 dark:text-emerald-400">{p.dispatchQty || p.dispatchedQuantity || p.quantity || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Transport & Tracking Details in Text below Table */}
                  <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-1.5 text-xs text-gray-800 dark:text-gray-200">
                    <p><strong>Transport Mode:</strong> {dispatchCommData.dispatch?.transportMode || "Road"}</p>
                    <p><strong>Transporter Name:</strong> {dispatchCommData.dispatch?.courierName || "N/A"}</p>
                    <p><strong>Tracking Number:</strong> <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{dispatchCommData.dispatch?.trackingNo || "N/A"}</span></p>
                    <p>
                      <strong>Tracking Link:</strong>{" "}
                      {getCarrierTrackingLink(dispatchCommData.dispatch?.courierName) ? (
                        <a 
                          href={getCarrierTrackingLink(dispatchCommData.dispatch?.courierName)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 dark:text-blue-400 font-bold underline hover:text-blue-800 break-all inline-flex items-center gap-1"
                        >
                          {getCarrierTrackingLink(dispatchCommData.dispatch?.courierName)} <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-gray-500 font-medium">N/A</span>
                      )}
                    </p>
                    <p><strong>Dispatch Date:</strong> {dispatchCommData.dispatch?.dispatchDate ? new Date(dispatchCommData.dispatch.dispatchDate).toLocaleDateString("en-GB") : "N/A"}</p>
                  </div>

                  {/* User Requested Footer Message from Image */}
                  <div className="space-y-3 text-xs text-gray-700 dark:text-gray-300 pt-3 border-t border-gray-200 dark:border-gray-700 leading-relaxed">
                    <p>
                      If you have any questions or if there's anything else we can assist you with, please don't hesitate to reach out to our customer support team at <a href="mailto:cc@teaminspire.co.in" className="text-blue-600 dark:text-blue-400 underline font-semibold">cc@teaminspire.co.in</a>
                    </p>

                    <p>
                      Thank you for choosing TeamInspire. We appreciate your patience, and we hope you enjoy your purchase!
                    </p>

                    <div className="pt-2 font-sans">
                      <p className="font-bold text-gray-900 dark:text-white">Best regards,</p>
                      <p className="font-extrabold text-blue-600 dark:text-blue-400">TeamInspire Business Solutions Pvt Ltd</p>
                    </div>

                    <p className="text-[11px] text-gray-400 dark:text-gray-500 italic pt-2 border-t border-gray-100 dark:border-gray-800">
                      Please note: This e-mail was sent from a notification-only address that cannot accept incoming e-mail. Please do not reply to this message.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <span className="text-[11px] text-gray-400 font-semibold">Professional email format ready</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!dispatchCommData.recipientEmail) {
                      toast.error("Please enter client email address!");
                      return;
                    }
                    const bodyElement = document.getElementById("email-body-container");
                    const htmlContent = bodyElement ? bodyElement.innerHTML : "";
                    try {
                      const res = await API.post("/purchase-orders/send-email", {
                        to: dispatchCommData.recipientEmail,
                        cc: dispatchCommData.ccEmail || undefined,
                        subject: dispatchCommData.subject,
                        htmlBody: htmlContent
                      });
                      if (res.data?.success) {
                        toast.success("Dispatch Email triggered directly from server!");
                        setIsEmailModalOpen(false);
                      } else {
                        toast.error(res.data?.message || "Failed to send email");
                      }
                    } catch (err) {
                      console.error("Direct Email Error:", err);
                      toast.error(err.response?.data?.message || "Failed to send direct email. Check SMTP_PASS in backend/.env!");
                    }
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                  title="Send directly from server via dispatch@teaminspire.co.in"
                >
                  <Send size={15} /> Send Direct Email (SMTP)
                </button>
                <button
                  onClick={() => {
                    if (!dispatchCommData.recipientEmail) {
                      toast.error("Please enter client email address!");
                      return;
                    }
                    // Copy rich email content to clipboard
                    const bodyElement = document.getElementById("email-body-container");
                    if (bodyElement) {
                      const range = document.createRange();
                      range.selectNode(bodyElement);
                      window.getSelection().removeAllRanges();
                      window.getSelection().addRange(range);
                      document.execCommand("copy");
                      window.getSelection().removeAllRanges();
                    }

                    // Open mailto app with recipient, CC and subject
                    const plainTextBody = `Dear Sir/Madam,\n\nGreetings from TeamInspire !!!\n\nGood news! Your order has been shipped and is on its way. Here are your dispatch details:\n\nPlease check the copied HTML table in your clipboard or paste directly into your email body.\n\nBest regards,\nTeamInspire Business Solutions Pvt Ltd`;
                    let mailtoUrl = `mailto:${dispatchCommData.recipientEmail}?subject=${encodeURIComponent(dispatchCommData.subject)}&body=${encodeURIComponent(plainTextBody)}`;
                    if (dispatchCommData.ccEmail && dispatchCommData.ccEmail.trim()) {
                      mailtoUrl += `&cc=${encodeURIComponent(dispatchCommData.ccEmail.trim())}`;
                    }
                    window.open(mailtoUrl, "_blank");
                    toast.success("Dispatch Email & Formatted Table copied to clipboard!");
                    setIsEmailModalOpen(false);
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer font-bold"
                >
                  <Send size={15} /> Send via Mail App
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 💬 Dispatch WhatsApp Modal */}
      {isWhatsAppModalOpen && dispatchCommData && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-green-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageSquare size={22} />
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wider">Send WhatsApp Notification</h3>
                  <p className="text-xs text-green-100 font-medium">PO: {dispatchCommData.po?.poNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="p-2 text-white/80 hover:text-white rounded-xl transition hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-3 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                💬 Direct WhatsApp messaging. Clicking 'Send via WhatsApp' will open WhatsApp Web/App with this text pre-filled.
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Recipient Phone Number (With Country Code e.g. 919876543210)</label>
                <input 
                  type="text"
                  placeholder="e.g. 919876543210"
                  value={dispatchCommData.recipientPhone || ""}
                  onChange={e => setDispatchCommData({...dispatchCommData, recipientPhone: e.target.value.replace(/[^0-9]/g, "")})}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-emerald-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">WhatsApp Message</label>
                <textarea 
                  rows={9}
                  value={dispatchCommData.whatsappMessage || ""}
                  onChange={e => setDispatchCommData({...dispatchCommData, whatsappMessage: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-xs font-medium outline-none focus:border-emerald-500 text-gray-900 dark:text-white leading-relaxed resize-y font-mono"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <span className="text-[11px] text-gray-400 font-semibold">Direct 1-Click WhatsApp integration</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsWhatsAppModalOpen(false)}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!dispatchCommData.recipientPhone) {
                      toast.error("Please enter client mobile number!");
                      return;
                    }
                    const waUrl = `https://api.whatsapp.com/send?phone=${dispatchCommData.recipientPhone}&text=${encodeURIComponent(dispatchCommData.whatsappMessage)}`;
                    window.open(waUrl, "_blank");
                    toast.success("Opening WhatsApp...");
                    setIsWhatsAppModalOpen(false);
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer font-bold"
                >
                  <ExternalLink size={15} /> Send via WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outward PO Creation / Edit Modal */}
      {isCreateOutwardOpen && (
        <CreateOutwardPO
          poToEdit={selectedPOToEdit}
          onClose={() => {
            setIsCreateOutwardOpen(false);
            setSelectedPOToEdit(null);
          }}
          onSuccess={() => {
            setIsCreateOutwardOpen(false);
            setSelectedPOToEdit(null);
            fetchPOs();
          }}
        />
      )}

    </div>
  );
};

export default POManagement;
