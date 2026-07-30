import React, { useEffect, useState, useRef } from "react";
import API, { API_BASE_URL } from "../api/api";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  RotateCcw,
  Maximize,
  Minimize,
  FileText,
  IndianRupee,
  Receipt,
  Hourglass,
  PieChart,
  Users,
  Trophy,
  TrendingUp,
  RefreshCw,
  Calendar,
  Filter,
  CheckCircle,
  Clock,
  ChevronDown,
  Table,
  Sparkles,
  Zap,
  BellRing,
  Sun,
  Moon,
  Sunset
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart,
  AreaChart,
  Area
} from "recharts";

const MasterDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Toggle Table States
  const [showBrandTable, setShowBrandTable] = useState(true);
  const [showClientTable, setShowClientTable] = useState(true);

  // Live Flying Notification State
  const [liveNotification, setLiveNotification] = useState(null);
  const [flyingCard, setFlyingCard] = useState(null);

  // Greeting Popup State
  const [showGreeting, setShowGreeting] = useState(true);
  const [userGreeting, setUserGreeting] = useState("");
  const [greetingIcon, setGreetingIcon] = useState(null);

  // Filter States
  const [dateRange, setDateRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [selectedClient, setSelectedClient] = useState("All");
  const [selectedSalesPerson, setSelectedSalesPerson] = useState("All");
  const [selectedState, setSelectedState] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const dashboardRef = useRef(null);

  // Calculate Time-Based Greeting & Auto-Hide Popup after 3.5s
  useEffect(() => {
    const hour = new Date().getHours();
    let userStr = "Welcome back, TeamInspire Admin!";
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.name) userStr = `Welcome back, ${parsed.name}!`;
      }
    } catch (e) {}

    if (hour >= 5 && hour < 12) {
      setUserGreeting(`Good Morning! ☀️ ${userStr}`);
      setGreetingIcon(<Sun className="text-amber-400 animate-spin-slow" size={32} />);
    } else if (hour >= 12 && hour < 17) {
      setUserGreeting(`Good Afternoon! 🌤️ ${userStr}`);
      setGreetingIcon(<Sun className="text-yellow-400" size={32} />);
    } else if (hour >= 17 && hour < 21) {
      setUserGreeting(`Good Evening! 🌆 ${userStr}`);
      setGreetingIcon(<Sunset className="text-orange-400" size={32} />);
    } else {
      setUserGreeting(`Good Night! 🌙 ${userStr}`);
      setGreetingIcon(<Moon className="text-indigo-300" size={32} />);
    }

    // Auto dismiss greeting splash popup after 3.5 seconds
    const timer = setTimeout(() => {
      setShowGreeting(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  // Fetch Dashboard Data
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedBrand !== "All") params.brand = selectedBrand;
      if (selectedClient !== "All") params.client = selectedClient;
      if (selectedSalesPerson !== "All") params.salesPerson = selectedSalesPerson;
      if (selectedState !== "All") params.state = selectedState;
      if (selectedStatus !== "All") params.status = selectedStatus;

      const res = await API.get("/dashboard/master", { params });
      setData(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Master Dashboard Fetch Error:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Trigger Flying Animated Notification
  const triggerLiveInjectAnimation = (title, message, poData) => {
    const notifObj = { title, message, time: new Date().toLocaleTimeString() };
    setLiveNotification(notifObj);

    // Trigger Flying Animated Card Injection Effect
    setFlyingCard(poData || { title, message });

    setTimeout(() => {
      setFlyingCard(null);
    }, 1800);

    setTimeout(() => {
      setLiveNotification(null);
    }, 6000);
  };

  // Initial Load & Polling & WebSockets
  useEffect(() => {
    fetchData();

    // Polling every 10 seconds for real-time updates
    const pollInterval = setInterval(() => {
      fetchData(true);
    }, 10000);

    // Socket Connection
    const rawUrl = API_BASE_URL.replace(/\/api$/, "");
    const socketUrl = rawUrl || window.location.origin;
    const socket = io(socketUrl, { transports: ["websocket", "polling"] });

    socket.on("leadAdded", (data) => {
      triggerLiveInjectAnimation("🎉 NEW LEAD ADDED!", `Lead #${data?.leadNumber || "New"} (${data?.name || "Client"}) added!`, data);
      fetchData(true);
    });

    socket.on("leadCreated", (data) => {
      triggerLiveInjectAnimation("🎉 NEW LEAD ADDED!", `Lead #${data?.leadNumber || "New"} added into CRM!`, data);
      fetchData(true);
    });

    socket.on("leadUpdated", (data) => {
      triggerLiveInjectAnimation("📝 LEAD UPDATED!", `Lead #${data?.leadNumber || ""} details updated!`, data);
      fetchData(true);
    });

    socket.on("poAdded", (data) => {
      triggerLiveInjectAnimation("⚡ NEW PO RECEIVED!", `PO #${data?.poNumber || "New"} created & injected!`, data);
      fetchData(true);
    });

    socket.on("poUpdated", (data) => {
      triggerLiveInjectAnimation("🔄 PO UPDATED!", `PO #${data?.poNumber || ""} status updated live!`, data);
      fetchData(true);
    });

    socket.on("quotationUpdated", (data) => {
      triggerLiveInjectAnimation("📜 QUOTATION UPDATED!", `New quotation activity recorded!`, data);
      fetchData(true);
    });

    return () => {
      clearInterval(pollInterval);
      socket.disconnect();
    };
  }, [startDate, endDate, selectedBrand, selectedClient, selectedSalesPerson, selectedState, selectedStatus]);

  // Full Screen Toggle
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      if (dashboardRef.current?.requestFullscreen) {
        dashboardRef.current.requestFullscreen();
      } else if (dashboardRef.current?.webkitRequestFullscreen) {
        dashboardRef.current.webkitRequestFullscreen();
      }
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullScreen(false);
    }
  };

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  // Reset Filters
  const handleResetFilters = () => {
    setDateRange("all");
    setStartDate("");
    setEndDate("");
    setSelectedBrand("All");
    setSelectedClient("All");
    setSelectedSalesPerson("All");
    setSelectedState("All");
    setSelectedStatus("All");
  };

  const handleQuickDateChange = (e) => {
    const val = e.target.value;
    setDateRange(val);
    const today = new Date();
    if (val === "today") {
      const dateStr = today.toISOString().split("T")[0];
      setStartDate(dateStr);
      setEndDate(dateStr);
    } else if (val === "this_month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
      const dateStr = today.toISOString().split("T")[0];
      setStartDate(firstDay);
      setEndDate(dateStr);
    } else if (val === "this_year") {
      const firstDay = new Date(today.getFullYear(), 0, 1).toISOString().split("T")[0];
      const dateStr = today.toISOString().split("T")[0];
      setStartDate(firstDay);
      setEndDate(dateStr);
    } else {
      setStartDate("");
      setEndDate("");
    }
  };

  // Color Constants for Donut Chart
  const DONUT_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  const kpis = data?.kpis || {
    totalPOs: 254,
    totalPOValueCr: 8.45,
    totalInvoicedValueCr: 6.72,
    pendingInvoiceValueCr: 1.73,
    billingPercentage: 79.47,
    activeClients: 72
  };

  const filterOpts = data?.filterOptions || {
    brands: ["All", "Robot Coupe", "Kolb", "T&S Brass", "Groen", "Others"],
    clients: ["All", "ABC Hotels", "Taj Group", "Marriott", "ITC", "Hyatt"],
    salesPersons: ["All", "Rohit Sharma", "Neha Verma", "Amit Patel"],
    states: ["All", "Maharashtra", "Delhi", "Karnataka", "West Bengal", "Gujarat"],
    statuses: ["All", "Confirmed", "Pending", "Invoiced", "Partially Invoiced", "Dispatched"]
  };

  return (
    <div
      ref={dashboardRef}
      className={`min-h-screen bg-[#070F2B] text-slate-100 font-sans p-4 md:p-6 transition-all duration-300 relative overflow-hidden ${
        isFullScreen ? "overflow-y-auto" : ""
      }`}
    >
      {/* 🔮 LIVE FLYING CARD INJECTION ANIMATION OVERLAY */}
      <AnimatePresence>
        {flyingCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.2, x: 600, y: -400 }}
            animate={{ opacity: 1, scale: 1.1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.1, y: 400 }}
            transition={{ duration: 0.8, type: "spring", stiffness: 90 }}
            className="fixed inset-0 m-auto w-80 h-44 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-5 shadow-2xl shadow-blue-500/80 border-2 border-cyan-400 z-[9999] flex flex-col justify-between pointer-events-none"
          >
            <div className="flex items-center justify-between text-white font-black">
              <span className="flex items-center gap-2 text-sm uppercase tracking-wider">
                <Sparkles size={18} className="animate-spin" /> LIVE DATA INJECTED
              </span>
              <Zap size={20} className="text-yellow-300 animate-bounce" />
            </div>
            <div>
              <p className="text-lg font-black text-white">{flyingCard.title || "Data Record"}</p>
              <p className="text-xs text-cyan-100 font-medium mt-1">{flyingCard.message || "Live entry integrated into Master Dashboard."}</p>
            </div>
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.2 }}
                className="bg-cyan-300 h-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔔 LIVE NOTIFICATION TOAST */}
      <AnimatePresence>
        {liveNotification && (
          <motion.div
            initial={{ opacity: 0, y: -60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            className="fixed top-6 right-6 z-[9999] bg-[#0F285A]/95 border-2 border-emerald-400 shadow-2xl shadow-emerald-950 backdrop-blur-xl rounded-2xl p-4 max-w-sm flex items-start gap-3 pointer-events-auto"
          >
            <div className="bg-emerald-500/20 p-2.5 rounded-xl text-emerald-400 border border-emerald-500/40 animate-pulse">
              <BellRing size={22} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-black text-white flex items-center justify-between">
                {liveNotification.title}
                <span className="text-[10px] text-emerald-400 font-bold ml-2">{liveNotification.time}</span>
              </h4>
              <p className="text-xs text-slate-200 mt-0.5">{liveNotification.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🌅 TIME-BASED GREETING POPUP SPLASH MODAL (Fades out automatically) */}
      <AnimatePresence>
        {showGreeting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -30 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-[#0C1E47]/95 border-2 border-cyan-500/80 shadow-2xl shadow-cyan-950/90 backdrop-blur-lg rounded-3xl p-5 max-w-md w-full flex items-center justify-between pointer-events-none"
          >
            <div className="flex items-center gap-4">
              <div className="bg-blue-600/30 p-3 rounded-2xl border border-cyan-400/40 shadow-lg">
                {greetingIcon}
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-wide">
                  {userGreeting}
                </h3>
                <p className="text-xs text-cyan-200/80 mt-0.5 font-medium">
                  Welcome to Master Analytics Dashboard
                </p>
              </div>
            </div>
            <Sparkles size={20} className="text-yellow-400 animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 TOP HEADER NAV */}
      <div className="bg-[#0B1B3D] border border-blue-950/60 rounded-2xl p-4 mb-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20 text-white">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-wide text-white flex items-center gap-3 uppercase">
              PURCHASE ORDERS DASHBOARD
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                REAL-TIME LIVE
              </span>
              <span>•</span>
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Top Header Right Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Quick Date Range */}
          <div className="flex items-center gap-2 bg-[#102347] px-3 py-2 rounded-xl border border-blue-900/60 text-xs">
            <Calendar size={14} className="text-blue-400" />
            <select
              value={dateRange}
              onChange={handleQuickDateChange}
              className="bg-transparent text-slate-200 outline-none cursor-pointer font-semibold"
            >
              <option value="all" className="bg-[#0B1B3D]">All Time</option>
              <option value="today" className="bg-[#0B1B3D]">Today</option>
              <option value="this_month" className="bg-[#0B1B3D]">This Month</option>
              <option value="this_year" className="bg-[#0B1B3D]">This Year</option>
            </select>
          </div>

          {/* Test Live Animation Button */}
          <button
            onClick={() => triggerLiveInjectAnimation("🎉 NEW LEAD ADDED!", "Lead #LD-2026-99 (Oberoi Hotels) injected!", { leadNumber: "LD-2026-99" })}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800/80 hover:to-indigo-800/80 text-purple-200 rounded-xl border border-purple-600/50 transition text-xs font-bold shadow-lg"
            title="Preview Flying Alert Animation"
          >
            <Zap size={14} className="text-yellow-400 animate-bounce" />
            Test Live Alert
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 rounded-xl border border-blue-700/40 transition text-xs font-bold"
            title="Refresh Live Data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          {/* Full Screen Toggle */}
          <button
            onClick={toggleFullScreen}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition text-xs font-bold"
          >
            {isFullScreen ? <Minimize size={14} /> : <Maximize size={14} />}
            {isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>

          {/* Reset Filters */}
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-950/40 hover:bg-red-900/50 text-red-300 rounded-xl border border-red-800/40 transition text-xs font-bold"
          >
            <RotateCcw size={14} />
            Reset Filters
          </button>
        </div>
      </div>

      {/* 🎯 GLOBAL FILTERS BAR */}
      <div className="bg-[#0D1E45] border border-blue-900/40 rounded-2xl p-3.5 mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Brand */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Filter size={10} /> Brand
          </label>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full bg-[#142852] text-xs font-semibold text-white px-3 py-2 rounded-xl border border-blue-800/50 outline-none focus:border-blue-500"
          >
            {filterOpts.brands.map((b) => (
              <option key={b} value={b} className="bg-[#0D1E45]">
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Client */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Users size={10} /> Client
          </label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="w-full bg-[#142852] text-xs font-semibold text-white px-3 py-2 rounded-xl border border-blue-800/50 outline-none focus:border-blue-500"
          >
            {filterOpts.clients.map((c) => (
              <option key={c} value={c} className="bg-[#0D1E45]">
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Sales Person */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Users size={10} /> Sales Person
          </label>
          <select
            value={selectedSalesPerson}
            onChange={(e) => setSelectedSalesPerson(e.target.value)}
            className="w-full bg-[#142852] text-xs font-semibold text-white px-3 py-2 rounded-xl border border-blue-800/50 outline-none focus:border-blue-500"
          >
            {filterOpts.salesPersons.map((sp) => (
              <option key={sp} value={sp} className="bg-[#0D1E45]">
                {sp}
              </option>
            ))}
          </select>
        </div>

        {/* State */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            State
          </label>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="w-full bg-[#142852] text-xs font-semibold text-white px-3 py-2 rounded-xl border border-blue-800/50 outline-none focus:border-blue-500"
          >
            {filterOpts.states.map((st) => (
              <option key={st} value={st} className="bg-[#0D1E45]">
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Order Status */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            Order Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-[#142852] text-xs font-semibold text-white px-3 py-2 rounded-xl border border-blue-800/50 outline-none focus:border-blue-500"
          >
            {filterOpts.statuses.map((st) => (
              <option key={st} value={st} className="bg-[#0D1E45]">
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Start/End Date */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            Date Range
          </label>
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-[#142852] text-[10px] font-semibold text-white p-1.5 rounded-lg border border-blue-800/50 outline-none"
            />
          </div>
        </div>
      </div>

      {/* 📊 KEY METRICS (KPI CARDS ROW WITH ANIMATIONS & SMART CURRENCY) */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.08 }
          }
        }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6"
      >
        {/* KPI 1: TOTAL PURCHASE ORDERS */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ scale: 1.03 }}
          className="bg-[#0B1B3D] border border-blue-900/40 p-4 rounded-2xl flex items-center gap-3.5 shadow-lg"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
            <FileText size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Orders</p>
            <p className="text-2xl font-black text-white leading-tight">{kpis.totalPOs}</p>
            <p className="text-[10px] text-slate-500 font-semibold">No. of POs</p>
          </div>
        </motion.div>

        {/* KPI 2: TOTAL PO VALUE */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ scale: 1.03 }}
          className="bg-[#0B1B3D] border border-emerald-900/40 p-4 rounded-2xl flex items-center gap-3.5 shadow-lg"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <IndianRupee size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total PO Value</p>
            <p className="text-2xl font-black text-emerald-400 leading-tight">
              {kpis.totalPOValueCr < 1
                ? `₹ ${(kpis.totalPOValueCr * 100).toFixed(2)} L`
                : `₹ ${kpis.totalPOValueCr} Cr`}
            </p>
            <p className="text-[10px] text-slate-500 font-semibold">Taxable Value</p>
          </div>
        </motion.div>

        {/* KPI 3: TOTAL INVOICED VALUE */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ scale: 1.03 }}
          className="bg-[#0B1B3D] border border-purple-900/40 p-4 rounded-2xl flex items-center gap-3.5 shadow-lg"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
            <Receipt size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Invoiced Value</p>
            <p className="text-2xl font-black text-purple-400 leading-tight">
              {kpis.totalInvoicedValueCr < 1
                ? `₹ ${(kpis.totalInvoicedValueCr * 100).toFixed(2)} L`
                : `₹ ${kpis.totalInvoicedValueCr} Cr`}
            </p>
            <p className="text-[10px] text-slate-500 font-semibold">Taxable Value</p>
          </div>
        </motion.div>

        {/* KPI 4: PENDING INVOICE VALUE */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ scale: 1.03 }}
          className="bg-[#0B1B3D] border border-amber-900/40 p-4 rounded-2xl flex items-center gap-3.5 shadow-lg"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <Hourglass size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Value</p>
            <p className="text-2xl font-black text-amber-400 leading-tight">
              {kpis.pendingInvoiceValueCr < 1
                ? `₹ ${(kpis.pendingInvoiceValueCr * 100).toFixed(2)} L`
                : `₹ ${kpis.pendingInvoiceValueCr} Cr`}
            </p>
            <p className="text-[10px] text-slate-500 font-semibold">PO - Invoiced</p>
          </div>
        </motion.div>

        {/* KPI 5: BILLING % */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ scale: 1.03 }}
          className="bg-[#0B1B3D] border border-cyan-900/40 p-4 rounded-2xl flex items-center gap-3.5 shadow-lg"
        >
          <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
            <PieChart size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Billing %</p>
            <p className="text-2xl font-black text-cyan-400 leading-tight">{kpis.billingPercentage}%</p>
            <p className="text-[10px] text-slate-500 font-semibold">Invoiced / PO Value</p>
          </div>
        </motion.div>

        {/* KPI 6: ACTIVE CLIENTS */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ scale: 1.03 }}
          className="bg-[#0B1B3D] border border-indigo-900/40 p-4 rounded-2xl flex items-center gap-3.5 shadow-lg"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <Users size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Clients</p>
            <p className="text-2xl font-black text-indigo-400 leading-tight">{kpis.activeClients}</p>
            <p className="text-[10px] text-slate-500 font-semibold">No. of Clients</p>
          </div>
        </motion.div>
      </motion.div>

      {/* 🚀 MAIN DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* CARD 1: BRAND WISE PURCHASE ORDERS */}
        <div className="bg-[#0B1B3D] border border-blue-900/40 rounded-2xl p-5 shadow-xl flex flex-col">
          <div className="bg-[#001E50] px-4 py-2.5 rounded-xl mb-4 border-l-4 border-blue-500 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">
              1. BRAND WISE PURCHASE ORDERS
            </h2>
            <button
              onClick={() => setShowBrandTable(!showBrandTable)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-bold transition-all ${
                showBrandTable
                  ? "bg-blue-950/70 border-blue-700/50 text-blue-300 hover:bg-blue-900/80"
                  : "bg-emerald-950/70 border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/80"
              }`}
              title={showBrandTable ? "Hide Breakdown Table & Expand Chart" : "Show Breakdown Table"}
            >
              <Table size={14} />
              {showBrandTable ? "Hide Table" : "Show Table"}
            </button>
          </div>

          <div className={`grid ${showBrandTable ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"} gap-4 flex-1 items-center transition-all duration-300`}>
            {/* Horizontal Bar Chart */}
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={data?.brandWise || []} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <XAxis type="number" stroke="#64748b" fontSize={10} />
                  <YAxis type="category" dataKey="brand" stroke="#94a3b8" fontSize={10} width={showBrandTable ? 80 : 120} />
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155" }} />
                  <Bar dataKey="poValueCr" fill="#3B82F6" name="PO Value (Cr)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="invoicedValueCr" fill="#10B981" name="Invoiced (Cr)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Breakdown Table */}
            {showBrandTable && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#102347] text-slate-300 font-bold border-b border-blue-900/50">
                    <tr>
                      <th className="p-2">Brand</th>
                      <th className="p-2 text-center">PO Count</th>
                      <th className="p-2 text-right">PO Value (₹ Cr)</th>
                      <th className="p-2 text-right">Invoiced (₹ Cr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-950/60">
                    {(data?.brandWise || []).map((b, i) => (
                      <tr key={i} className="hover:bg-blue-900/20">
                        <td className="p-2 font-semibold text-slate-200">{b.brand}</td>
                        <td className="p-2 text-center text-slate-300 font-bold">{b.poCount}</td>
                        <td className="p-2 text-right text-blue-400 font-bold">{b.poValueCr}</td>
                        <td className="p-2 text-right text-emerald-400 font-bold">{b.invoicedValueCr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: CLIENT WISE PURCHASE ORDERS (TOP 10) */}
        <div className="bg-[#0B1B3D] border border-blue-900/40 rounded-2xl p-5 shadow-xl flex flex-col">
          <div className="bg-[#001E50] px-4 py-2.5 rounded-xl mb-4 border-l-4 border-emerald-500 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">
              2. CLIENT WISE PURCHASE ORDERS (TOP 10)
            </h2>
            <button
              onClick={() => setShowClientTable(!showClientTable)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-bold transition-all ${
                showClientTable
                  ? "bg-blue-950/70 border-blue-700/50 text-blue-300 hover:bg-blue-900/80"
                  : "bg-emerald-950/70 border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/80"
              }`}
              title={showClientTable ? "Hide Breakdown Table & Expand Chart" : "Show Breakdown Table"}
            >
              <Table size={14} />
              {showClientTable ? "Hide Table" : "Show Table"}
            </button>
          </div>

          <div className={`grid ${showClientTable ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"} gap-4 flex-1 items-center transition-all duration-300`}>
            {/* Horizontal Bar Chart */}
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={data?.clientWiseTop10 || []} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <XAxis type="number" stroke="#64748b" fontSize={10} />
                  <YAxis type="category" dataKey="client" stroke="#94a3b8" fontSize={9} width={showClientTable ? 80 : 130} />
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155" }} />
                  <Bar dataKey="poValueCr" fill="#10B981" name="PO Value (Cr)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="invoicedValueCr" fill="#8B5CF6" name="Invoiced (Cr)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Breakdown Table */}
            {showClientTable && (
              <div className="overflow-x-auto max-h-56 overflow-y-auto">
                <table className="w-full text-xs text-left">
                <thead className="bg-[#102347] text-slate-300 font-bold border-b border-blue-900/50 sticky top-0">
                  <tr>
                    <th className="p-2">Client</th>
                    <th className="p-2 text-right">PO Val (₹ Cr)</th>
                    <th className="p-2 text-right">Invoiced</th>
                    <th className="p-2 text-right">Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-950/60">
                  {(data?.clientWiseTop10 || []).map((c, i) => (
                    <tr key={i} className="hover:bg-blue-900/20">
                      <td className="p-2 font-semibold text-slate-200 truncate max-w-[100px]">{c.client}</td>
                      <td className="p-2 text-right text-emerald-400 font-bold">{c.poValueCr}</td>
                      <td className="p-2 text-right text-purple-400 font-bold">{c.invoicedValueCr}</td>
                      <td className="p-2 text-right text-amber-400 font-bold">{c.pendingValueCr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* 🚀 SECOND ROW GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* CARD 3: TAXABLE VALUE DISTRIBUTION (BY PO COUNT) */}
        <div className="bg-[#0B1B3D] border border-blue-900/40 rounded-2xl p-5 shadow-xl flex flex-col">
          <div className="bg-[#001E50] px-4 py-2.5 rounded-xl mb-4 border-l-4 border-purple-500">
            <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-white">
              3. TAXABLE VALUE DISTRIBUTION (BY PO COUNT)
            </h2>
          </div>

          <div className="flex flex-col items-center justify-center flex-1">
            <div className="h-44 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={data?.valueDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="poCount"
                  >
                    {(data?.valueDistribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155" }} />
                </RePieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-black text-white">{kpis.totalPOs}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase">Total POs</span>
              </div>
            </div>

            <div className="overflow-x-auto w-full mt-2">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-[#102347] text-slate-300 font-bold border-b border-blue-900/50">
                  <tr>
                    <th className="p-1.5">Range (₹)</th>
                    <th className="p-1.5 text-center">PO Count</th>
                    <th className="p-1.5 text-right">PO Val (Cr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-950/60">
                  {(data?.valueDistribution || []).map((r, i) => (
                    <tr key={i} className="hover:bg-blue-900/20">
                      <td className="p-1.5 font-semibold text-slate-200 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}></span>
                        {r.range}
                      </td>
                      <td className="p-1.5 text-center font-bold text-slate-300">{r.poCount}</td>
                      <td className="p-1.5 text-right font-bold text-blue-400">{r.poValueCr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CARD 4: PURCHASE ORDER VALUE VS INVOICED VALUE */}
        <div className="bg-[#0B1B3D] border border-blue-900/40 rounded-2xl p-5 shadow-xl flex flex-col lg:col-span-2">
          <div className="bg-[#001E50] px-4 py-2.5 rounded-xl mb-4 border-l-4 border-cyan-500">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">
              4. PURCHASE ORDER VALUE VS INVOICED VALUE
            </h2>
          </div>

          <div className="h-64 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data?.monthlyTrend || []} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
                <YAxis yAxisId="left" stroke="#38BDF8" fontSize={10} />
                <YAxis yAxisId="right" orientation="right" stroke="#F59E0B" fontSize={10} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar yAxisId="left" dataKey="poValueCr" fill="#3B82F6" name="PO Value (Cr)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="invoicedValueCr" fill="#10B981" name="Invoiced (Cr)" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="billingPct" stroke="#EF4444" strokeWidth={2.5} name="Billing %" dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 🚀 THIRD ROW GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* CARD 5: MONTHLY PURCHASE TREND (PO VALUE) */}
        <div className="bg-[#0B1B3D] border border-blue-900/40 rounded-2xl p-5 shadow-xl flex flex-col">
          <div className="bg-[#001E50] px-4 py-2.5 rounded-xl mb-4 border-l-4 border-indigo-500">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">
              5. MONTHLY PURCHASE TREND (PO VALUE)
            </h2>
          </div>

          <div className="h-56 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthlyTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748b" fontSize={9} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155" }} />
                <Area type="monotone" dataKey="poValueCr" stroke="#38BDF8" strokeWidth={3} fillOpacity={1} fill="url(#colorPo)" name="PO Value (Cr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CARD 7: TOP SUMMARY */}
        <div className="bg-[#0B1B3D] border border-blue-900/40 rounded-2xl p-5 shadow-xl flex flex-col lg:col-span-2">
          <div className="bg-[#001E50] px-4 py-2.5 rounded-xl mb-4 border-l-4 border-amber-500">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">
              7. TOP SUMMARY
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 items-center">
            {/* Top Brand */}
            <div className="bg-[#12254B] p-4 rounded-xl border border-blue-800/40 text-center space-y-1">
              <div className="w-10 h-10 mx-auto rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Trophy size={20} />
              </div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Top Brand</p>
              <p className="text-base font-black text-white truncate">{data?.topSummary?.topBrand || "Robot Coupe"}</p>
              <p className="text-xs font-bold text-amber-400">₹ {data?.topSummary?.topBrandValueCr || 2.40} Cr</p>
            </div>

            {/* Top Client */}
            <div className="bg-[#12254B] p-4 rounded-xl border border-blue-800/40 text-center space-y-1">
              <div className="w-10 h-10 mx-auto rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Users size={20} />
              </div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Top Client</p>
              <p className="text-base font-black text-white truncate">{data?.topSummary?.topClient || "ABC Hotels"}</p>
              <p className="text-xs font-bold text-blue-400">₹ {data?.topSummary?.topClientValueCr || 1.20} Cr</p>
            </div>

            {/* Highest Invoiced */}
            <div className="bg-[#12254B] p-4 rounded-xl border border-blue-800/40 text-center space-y-1">
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Receipt size={20} />
              </div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Highest Invoiced</p>
              <p className="text-base font-black text-emerald-400">₹ {data?.topSummary?.highestInvoicedValueCr || 6.72} Cr</p>
              <p className="text-[10px] text-slate-400">Invoiced Value</p>
            </div>

            {/* Billing % */}
            <div className="bg-[#12254B] p-4 rounded-xl border border-blue-800/40 text-center space-y-1">
              <div className="w-10 h-10 mx-auto rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Billing %</p>
              <p className="text-base font-black text-purple-400">{data?.topSummary?.billingPercentage || 79.47}%</p>
              <p className="text-[10px] text-slate-400">Invoiced / PO</p>
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 CARD 6: LATEST PURCHASE ORDERS DATA TABLE */}
      <div className="bg-[#0B1B3D] border border-blue-900/40 rounded-2xl p-5 shadow-xl mb-6">
        <div className="bg-[#001E50] px-4 py-2.5 rounded-xl mb-4 border-l-4 border-emerald-500 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-white">
            6. LATEST PURCHASE ORDERS
          </h2>
          <span className="text-xs text-blue-300 font-bold">Showing Realtime Top Orders</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#102347] text-slate-300 font-bold uppercase tracking-wider border-b border-blue-900/50">
              <tr>
                <th className="p-3">PO No.</th>
                <th className="p-3">PO Date</th>
                <th className="p-3">Client</th>
                <th className="p-3">Brand</th>
                <th className="p-3">Sales Person</th>
                <th className="p-3">State</th>
                <th className="p-3 text-right">PO Value (₹)</th>
                <th className="p-3 text-right">Invoiced (₹)</th>
                <th className="p-3 text-right">Pending (₹)</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-950/60">
              {(data?.latestPOs || []).map((po) => (
                <tr key={po._id} className="hover:bg-blue-900/20 transition-colors">
                  <td className="p-3 font-bold text-blue-400">{po.poNumber}</td>
                  <td className="p-3 text-slate-300">{po.poDate}</td>
                  <td className="p-3 font-semibold text-white">{po.client}</td>
                  <td className="p-3 text-slate-300">{po.brand}</td>
                  <td className="p-3 text-slate-300">{po.salesPerson}</td>
                  <td className="p-3 text-slate-400">{po.state}</td>
                  <td className="p-3 text-right font-bold text-emerald-400">
                    ₹ {Number(po.poValue).toLocaleString("en-IN")}
                  </td>
                  <td className="p-3 text-right font-bold text-purple-400">
                    ₹ {Number(po.invoicedValue).toLocaleString("en-IN")}
                  </td>
                  <td className="p-3 text-right font-bold text-amber-400">
                    ₹ {Number(po.pendingValue).toLocaleString("en-IN")}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-full ${
                        po.status === "Confirmed" || po.status === "Invoiced"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : po.status === "Pending"
                          ? "bg-amber-950 text-amber-400 border border-amber-800"
                          : "bg-blue-950 text-blue-400 border border-blue-800"
                      }`}
                    >
                      {po.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER METRIC NOTE */}
      <div className="text-center text-[11px] text-slate-500 font-semibold pt-2">
        * All values are in INR | Cr = Crore (1 Cr = 10,000,000) | Lakh = 100,000 | Auto-synced with TeamInspire Software Backend
      </div>
    </div>
  );
};

export default MasterDashboard;
