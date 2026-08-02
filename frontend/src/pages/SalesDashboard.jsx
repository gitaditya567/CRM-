import React, { useEffect, useState } from "react";
import Skeleton from '../components/common/Skeleton';
import toast from 'react-hot-toast';
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import {
    Users,
    FileText,
    TrendingUp,
    Clock,
    PlusCircle,
    ShoppingBag,
    Briefcase,
    Zap
} from "lucide-react";
import StatsCard from "../components/dashboard/StatsCard";
import { io } from "socket.io-client";
import { API_BASE_URL } from "../api/api";

const SalesDashboard = () => {
    const [summary, setSummary] = useState(null);
    const [activity, setActivity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const navigate = useNavigate();

    const fetchData = async () => {
        try {
            const [summaryRes, activityRes] = await Promise.all([
                API.get("/dashboard/summary"),
                API.get("/dashboard/activity")
            ]);
            setSummary(summaryRes.data);
            setActivity(activityRes.data);
        } catch (err) {
            console.error("Error fetching sales dashboard data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchData();

        // Socket Connection for Real-time updates
        const socketUrl = API_BASE_URL.replace('/api', '');
        const socket = io(socketUrl, { transports: ["websocket"] });

        // Debounce real-time updates to avoid overloading the server
        let fetchTimer;
        const debouncedFetch = () => {
            if (fetchTimer) clearTimeout(fetchTimer);
            fetchTimer = setTimeout(fetchData, 1500); // Wait 1.5s after last update
        };

        socket.on("leadAdded", debouncedFetch);
        socket.on("leadUpdated", debouncedFetch);
        socket.on("leadDeleted", debouncedFetch);
        socket.on("quotationAdded", debouncedFetch);
        socket.on("quotationUpdated", debouncedFetch);
        socket.on("quotationDeleted", debouncedFetch);
        socket.on("clientAdded", debouncedFetch);
        socket.on("clientUpdated", debouncedFetch);
        socket.on("clientDeleted", debouncedFetch);

        return () => {
            if (fetchTimer) clearTimeout(fetchTimer);
            socket.disconnect();
        };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Skeleton type="table" count={3} />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-8 bg-gray-50/50 dark:bg-gray-900/50 min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <Zap className="text-yellow-500 fill-yellow-500" size={32} />
                        Dashboard
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
                        Welcome, <span className="text-blue-600 dark:text-blue-400 font-bold">{localStorage.getItem("name")}</span>! Focus on your goals today.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-2xl border border-blue-100 dark:border-blue-800">
                        <Clock size={16} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mr-2">
                        {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                </div>
            </div>

            {/* Quick Pulse Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard 
                    title="My Leads" 
                    value={summary?.myLeads || 0} 
                    icon={Users} 
                    color="blue" 
                    trend="up" 
                    trendValue="Active"
                />
                <StatsCard 
                    title="Won Quotes" 
                    value={summary?.wonQuotes || 0} 
                    icon={TrendingUp} 
                    color="green" 
                    trend="up" 
                    trendValue="Success"
                />
                <StatsCard 
                    title="Open Quotes" 
                    value={summary?.submittedQuotes || 0} 
                    icon={FileText} 
                    color="purple" 
                    trend="neutral" 
                    trendValue="In Pipeline"
                />
                <StatsCard 
                    title="Qualified" 
                    value={summary?.qualifiedLeads || 0} 
                    icon={Briefcase} 
                    color="orange" 
                    trend="up" 
                    trendValue="Priority"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Sales Toolkit */}
                <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Quick Toolkit</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button 
                            onClick={() => navigate('/leads?action=add')}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 hover:scale-[1.02] transition-transform text-left group"
                        >
                            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30 group-hover:rotate-12 transition-transform">
                                <PlusCircle size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white">Create Lead</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">New opportunity</p>
                            </div>
                        </button>

                        <button 
                            onClick={() => window.location.href = '/search'}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 hover:scale-[1.02] transition-transform text-left group"
                        >
                            <div className="p-3 bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-500/30 group-hover:rotate-12 transition-transform">
                                <ShoppingBag size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white">Inventory</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Check availability</p>
                            </div>
                        </button>

                        <button 
                            onClick={() => navigate('/leads')}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 hover:scale-[1.02] transition-transform text-left group"
                        >
                            <div className="p-3 bg-green-600 text-white rounded-xl shadow-lg shadow-green-500/30 group-hover:rotate-12 transition-transform">
                                <Users size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white">Leads</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Track pipeline</p>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden flex flex-col justify-between">
                    <div className="relative z-10">
                        <h4 className="font-black text-lg mb-2">Need Help?</h4>
                        <p className="text-blue-100 text-xs mb-6 font-medium leading-relaxed">
                            Reach out to our technical team for any support or feature requests.
                        </p>
                        <a 
                            href="https://wa.me/916392041849" 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-block px-6 py-2.5 bg-white text-blue-600 font-black rounded-xl text-sm shadow-lg hover:bg-blue-50 transition-colors"
                        >
                            WhatsApp Support
                        </a>
                    </div>
                    {/* Decorative Circle */}
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                </div>
            </div>
        </div>
    );
};

export default SalesDashboard;
