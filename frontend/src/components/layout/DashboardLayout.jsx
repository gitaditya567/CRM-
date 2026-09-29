import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";
import ScrollingBanner from "./ScrollingBanner";
import ChatWidget from "../common/ChatWidget";

/**
 * Dashboard Layout
 * Wraps pages with a sidebar and main content area.
 */
const DashboardLayout = ({ children }) => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isSidebarHidden, setSidebarHidden] = useState(false);
    const location = useLocation();
    const homePath = (localStorage.getItem("role") || "").toLowerCase() === "sales" ? "/sales-dashboard" : "/dashboard";

    // 📱 Mobile drawer: close on navigation
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname, location.search]);

    // 📱 Mobile drawer: Escape to close + lock background scroll while open
    useEffect(() => {
        if (!isSidebarOpen) return;
        const onKey = (e) => e.key === "Escape" && setSidebarOpen(false);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKey);
        };
    }, [isSidebarOpen]);

    return (
        <div className="flex flex-col bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
            {/* Top Scrolling Banner */}
            <ScrollingBanner />

            <div className="flex flex-1 relative">
                {/* Sidebar */}
                <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} isHidden={isSidebarHidden} setHidden={setSidebarHidden} />

                {/* Main Content */}
                <div className={`flex-1 min-w-0 flex flex-col ${isSidebarHidden ? "md:ml-0" : "md:ml-64"} transition-all duration-300 min-h-screen`}>
                    {/* Mobile Header */}
                    <div className="md:hidden flex items-center justify-between bg-white/95 dark:bg-gray-800/95 backdrop-blur px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-30">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Open menu"
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                        >
                            <Menu size={24} />
                        </button>
                        <Link to={homePath} className="flex items-center">
                            <img src="/logo.png" alt="TeamInspire Logo" className="h-8 w-auto object-contain" />
                        </Link>
                        <div className="w-10" /> {/* Spacer for centering */}
                    </div>

                    {isSidebarHidden && (
                        <button
                            onClick={() => setSidebarHidden(false)}
                            className="fixed top-16 left-4 z-40 p-2.5 bg-white dark:bg-gray-800 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 active:scale-95 transition-all duration-200 animate-fade-in"
                            title="Show Sidebar"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}

                    <main className="flex-1 pb-16">
                        {children}
                    </main>
                </div>
            </div>
          <ChatWidget />
        </div>
    );
};

export default DashboardLayout;

