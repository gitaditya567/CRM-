import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { API_BASE_URL } from "../api/api";
import { io } from "socket.io-client";
import { useSettings } from "../context/SettingsContext";
import {
  Users,
  ShoppingBag,
  FileText,
  TrendingUp,
  TrendingDown,
  CreditCard,
  PlusCircle,
  CheckCircle,
  AlertCircle,
  Clock,
  List,
  UserPlus,
  Eye,
  Pencil,
  Trash2
} from "lucide-react";

const FileIcon = FileText;

import StatsCard from "../components/dashboard/StatsCard";
import DashboardCharts from "../components/dashboard/DashboardCharts";
import RecentActivity from "../components/dashboard/RecentActivity";
import AIAssistantWidget from "../components/dashboard/AIAssistantWidget";

const Dashboard = () => {
  const navigate = useNavigate();
  const { uiSettings } = useSettings();
  const userRole = (localStorage.getItem("role") || "").toLowerCase();

  useEffect(() => {
    if (userRole && (userRole === "sales" || userRole === "services" || userRole === "staff")) {
      window.location.href = "/sales-dashboard";
    }
  }, [userRole]);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeSalesTab, setActiveSalesTab] = useState("total");
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [activity, setActivity] = useState(null);
  const [leads, setLeads] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [clients, setClients] = useState([]);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [rolePermissions, setRolePermissions] = useState(JSON.parse(localStorage.getItem("rolePermissions") || "{}"));

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [loadingTables, setLoadingTables] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadSummary = async (silent = false) => {
      try {
        if (!silent) setLoadingSummary(true);
        const res = await API.get("/dashboard/summary");
        setSummary(res.data);
        if (!silent) setLoadingSummary(false);
      } catch (err) {
        console.error("Summary error", err);
        if (!silent) setLoadingSummary(false);
      }
    };

    const loadCharts = async (silent = false) => {
      try {
        if (!silent) setLoadingCharts(true);
        const res = await API.get("/dashboard/charts");
        setCharts(res.data);
        if (!silent) setLoadingCharts(false);
      } catch (err) {
        console.error("Charts error", err);
        if (!silent) setLoadingCharts(false);
      }
    };

    const loadActivity = async (silent = false) => {
      try {
        if (!silent) setLoadingActivity(true);
        const res = await API.get("/dashboard/activity");
        setActivity(res.data);
        if (!silent) setLoadingActivity(false);
      } catch (err) {
        console.error("Activity error", err);
        if (!silent) setLoadingActivity(false);
      }
    };

    const loadTables = async () => {
      try {
        const [leadsRes, groupsRes, usersRes, clientsRes, quotationsRes] = await Promise.all([
          API.get("/leads?limit=15"),
          API.get("/groups"),
          API.get("/auth/users"),
          API.get("/clients?limit=15"),
          API.get("/quotations?limit=15")
        ]);
        setLeads(leadsRes.data.leads || []);
        setGroups(groupsRes.data);
        setUsers(usersRes.data);
        setClients(clientsRes.data.clients || []);
        setQuotations(quotationsRes.data.quotations || []);
        setLoadingTables(false);
      } catch (err) {
        console.error("Tables error", err);
        setLoadingTables(false);
      }
    };

    const initDashboard = async () => {
        try {
            await Promise.all([
                loadSummary(),
                loadCharts(),
                loadActivity()
            ]);
            setTimeout(loadTables, 300);
        } catch (err) {
            console.error("Init dashboard error", err);
        }
    };

    initDashboard();

    // Socket Connection for Real-time updates
    const socketUrl = API_BASE_URL.replace('/api', '') || window.location.origin;
    const socket = io(socketUrl, { transports: ["websocket"] });

    let reloadTimer = null;
    const triggerReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        loadSummary(true);
        loadActivity(true);
        loadTables();
      }, 1000);
    };

    socket.on("leadAdded", triggerReload);
    socket.on("leadUpdated", triggerReload);
    socket.on("leadDeleted", triggerReload);
    socket.on("quotationAdded", triggerReload);
    socket.on("quotationUpdated", triggerReload);
    socket.on("quotationDeleted", triggerReload);
    socket.on("clientAdded", triggerReload);
    socket.on("clientUpdated", triggerReload);
    socket.on("clientDeleted", triggerReload);

    // Refresh permissions
    API.get("/auth/me").then(res => {
      setRolePermissions(res.data.rolePermissions || {});
      localStorage.setItem("rolePermissions", JSON.stringify(res.data.rolePermissions || {}));
      localStorage.setItem("role", res.data.role);
    }).catch(err => console.error("Permission Sync Error", err));

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      socket.disconnect();
    };
  }, []);

  const currentUserId = localStorage.getItem("userId") || users.find(u => u.name === localStorage.getItem("name"))?._id;
  const currentUserName = localStorage.getItem("name");

  const statusColors = {
    "New": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    "Contacted": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    "Qualified": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    "Quotation Submitted": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    "Won": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    "Lost": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  const getCity = (l, clients) => {
    const client = clients.find(c => {
      const normalize = (str) => (str || "").toLowerCase().trim();
      const leadName = normalize(l.name);
      const clientName = normalize(c.clientName);
      const legalName = normalize(c.legalEntityName);
      if (clientName !== leadName && legalName !== leadName) return false;

      const lGroupId = l.group?._id || l.group;
      const cGroupId = c.group?._id || c.group;
      if (lGroupId && cGroupId && String(lGroupId) !== String(cGroupId)) return false;
      return true;
    });
    return client?.billingAddress?.city || "-";
  };

  const TableView = React.memo(({ data, rolePermissions, userRole, clients, statusColors, handleDelete, currentUserId, currentUserName }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Creator</th>
            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Assigned to</th>
            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Live Status</th>
            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 text-blue-600 dark:text-blue-400">Reference #</th>
            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Vertical</th>
            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold">Client Entity</th>
            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 text-gray-400">Location</th>
            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 text-center">View</th>
            {(rolePermissions?.menuPermissions?.['Leads']?.edit || userRole === "admin" || userRole === "sales" || userRole === "services") && (
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 text-center">Manage</th>
            )}
            {(userRole === "admin" || userRole === "superadmin") && (
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 text-center text-red-500">Trash</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {data.map((l) => (
            <tr key={l._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="px-6 py-4 text-sm font-bold text-gray-700 dark:text-gray-300">{l.source}</td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{l.assignedTo?.name || "Unassigned"}</td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${statusColors[l.status]}`}>
                  {l.status}
                </span>
              </td>
              <td className="px-6 py-4 text-sm font-bold text-blue-600 dark:text-blue-400">{l.leadNumber || "-"}</td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{l.group?.name || "-"}</td>
              <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">{l.name}</td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{getCity(l, clients)}</td>
              <td className="px-6 py-4 text-center">
                <button
                  onClick={() => window.location.href = `/leads?action=view&id=${l._id}`}
                  className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all hover:scale-125 group"
                  title="View Details"
                >
                  <Eye size={20} className="group-active:scale-90" />
                </button>
              </td>

              {(userRole === "admin" || (l.createdBy && String(l.createdBy._id || l.createdBy) === String(currentUserId)) || (l.source === currentUserName)) ? (
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => window.location.href = `/leads?action=edit&id=${l._id}`}
                    className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all hover:scale-125 group border border-transparent hover:border-blue-100 dark:hover:border-blue-900"
                    title="Edit Lead"
                  >
                    <Pencil size={20} className="group-active:rotate-12" />
                  </button>
                </td>
              ) : (
                <td className="px-6 py-4 text-center">
                  <span className="p-2.5 text-gray-300 dark:text-gray-600 cursor-not-allowed" title="Permission Denied">
                    <Pencil size={20} className="opacity-30" />
                  </span>
                </td>
              )}
              {(userRole === "admin" || userRole === "superadmin") && (
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleDelete(l._id)}
                    className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all hover:scale-125 group hover:shadow-lg hover:shadow-red-500/10"
                    title="Delete Lead"
                  >
                    <Trash2 size={20} className="group-hover:animate-pulse" />
                  </button>
                </td>
              )}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan="10" className="px-6 py-12 text-center text-gray-400 uppercase tracking-widest text-xs font-bold">No Records Found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  ));

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this lead?")) return;
    try {
      await API.delete(`/leads/${id}`);
      setLeads(leads.filter(l => l._id !== id));
    } catch (err) {
      toast.error("Failed to delete lead");
    }
  };

  const isSalesOrServices = userRole === "sales" || userRole === "services" || userRole === "staff";

  const SkeletonCard = () => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      </div>
      <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  );

  return (
    <div className="space-y-6 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-3xl font-black text-gray-800 dark:text-white">Dashboard Overview</h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, <span className="text-blue-600 dark:text-blue-400 font-bold">{localStorage.getItem("name")}</span>! Here's what's happening today.
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-2xl border border-blue-100 dark:border-blue-800">
              <Clock size={16} className="text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mr-2">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {uiSettings?.dashboard?.showStats !== false && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loadingSummary ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : isSalesOrServices ? (
            <>
              <StatsCard title="Total Leads" value={summary?.leads || 0} icon={Users} trend="up" trendValue="10" color="yellow" onClick={() => navigate('/leads')} />
              <StatsCard title="My Leads" value={summary?.myLeads || 0} icon={Users} trend="up" trendValue="5" color="orange" onClick={() => navigate('/leads')} />
              <StatsCard title="Assigned Lead" value={summary?.assignedLeads || 0} icon={Users} trend="down" trendValue="2" color="red" onClick={() => navigate('/leads')} />
              <StatsCard title="Total Qualified Leads" value={summary?.qualifiedLeads || 0} icon={Users} trend="up" trendValue="15" color="red" onClick={() => navigate('/leads')} />
              <StatsCard title="Total Edited Quotations" value={summary?.editedQuotes || 0} icon={FileText} trend="up" trendValue="4" color="green" onClick={() => navigate('/leads?tab=quotations')} />
              <StatsCard title="Total Won Quotations" value={summary?.wonQuotes || 0} icon={FileText} trend="up" trendValue="8" color="green" onClick={() => navigate('/leads?tab=quotations')} />
              <StatsCard title="Total Lost Quotations" value={summary?.lostQuotes || 0} icon={FileText} trend="down" trendValue="1" color="green" onClick={() => navigate('/leads?tab=quotations')} />
              <StatsCard title="Total Submitted Quotations" value={summary?.submittedQuotes || 0} icon={FileText} trend="up" trendValue="12" color="green" onClick={() => navigate('/leads?tab=quotations')} />
            </>
          ) : (
            <>
              <StatsCard title="Total Leads" value={summary?.leads || 0} icon={Users} trend="up" trendValue="12" color="blue" onClick={() => navigate('/leads')} />
              {localStorage.getItem("role")?.toLowerCase() === "admin" && (
                <StatsCard title="Total Products" value={summary?.products || 0} icon={ShoppingBag} trend="up" trendValue="5" color="purple" onClick={() => window.location.href = '/search'} />
              )}
              <StatsCard title="Total Quotations" value={summary?.quotations || 0} icon={FileText} trend="down" trendValue="2" color="green" onClick={() => navigate('/leads?tab=quotations')} />
              <StatsCard title="Total Clients" value={summary?.clients || 0} icon={CreditCard} trend="up" trendValue="8" color="orange" onClick={() => window.location.href = '/clients'} />
            </>
          )}
        </div>
      )}

      {/* Charts Section */}
      {uiSettings?.dashboard?.showCharts !== false && charts && (
        <div className="min-h-[300px]">
          <DashboardCharts
            leadData={charts?.leadsOverTime}
            salesData={charts?.salesData}
          />
        </div>
      )}

      {/* Recent Activity & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 h-full">
          {uiSettings?.dashboard?.showRecentActivity !== false && (
            loadingActivity ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse h-64">
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                {[1, 2, 3].map(i => <div key={i} className="h-12 w-full bg-gray-100 dark:bg-gray-700/50 rounded mb-2"></div>)}
              </div>
            ) : (
              <RecentActivity activities={[
                ...(activity?.leads || []).map(l => ({ ...l, type: 'lead', title: `New Lead: ${l.name}`, description: `Status: ${l.status}` })),
                ...(activity?.quotations || []).map(q => ({ ...q, type: 'quotation', title: `Quotation #${q.quotationNumber}`, description: `Total: ₹${q.grandTotal}` }))
              ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))} />
            )
          )}
        </div>
        <div className="flex flex-col gap-6 h-full">
          {/* Staff Performance Leaderboard */}
          {summary?.staffPerformance && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col flex-1 min-h-[380px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Staff Leaderboard</h3>
                <span className="px-2.5 py-1 text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-full">Top Performers</span>
              </div>
              <div className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                {summary.staffPerformance.map((staff, idx) => {
                  const medalIcons = ["🥇", "🥈", "🥉", "🏅", "🏅"];
                  return (
                    <div key={staff._id || idx} className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all hover:scale-[1.02]">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{medalIcons[idx]}</span>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{staff.name}</p>
                          <p className="text-[10px] text-gray-400 font-semibold uppercase">{staff.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-green-600 dark:text-green-400">{staff.wonLeads} Won</p>
                        <p className="text-[10px] text-gray-400 font-medium">{staff.leadsCount} Leads</p>
                      </div>
                    </div>
                  );
                })}
                {summary.staffPerformance.length === 0 && (
                  <p className="text-gray-400 text-center py-4 text-sm italic">No staff performance data yet.</p>
                )}
              </div>
            </div>
          )}

          {/* Need Help Widget */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden flex-shrink-0">
            <h3 className="text-lg font-bold mb-2">Need Assistance?</h3>
            <p className="text-indigo-100 text-xs mb-4">
              Facing issues or have questions? Our support team is here to help you 24/7.
            </p>
            <a
              href="https://wa.me/916392041849?text=Hello%2C%20I%20need%20assistance%20with%20the%20CRM%20Dashboard."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 bg-white text-indigo-600 font-bold rounded-lg hover:bg-indigo-50 transition shadow-sm text-sm text-center block"
            >
              Contact Support
            </a>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>
      <AIAssistantWidget />
    </div>
  );
};

export default Dashboard;
