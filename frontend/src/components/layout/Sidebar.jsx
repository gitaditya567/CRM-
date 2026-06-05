import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    ShoppingBag,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
    PlusCircle,
    History,
    RefreshCw,
    List
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useSettings } from "../../context/SettingsContext";
import { useNavigate } from "react-router-dom";
import API from "../../api/api";

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const role = (localStorage.getItem("role") || "").toLowerCase();
    const userId = localStorage.getItem("userId");
    const isSales = role === 'sales';
    const isServices = role === 'services';
    const isStaff = role === 'staff';
    const isAdmin = role === 'admin' || role === 'superadmin';
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const { uiSettings } = useSettings();

    const handleLogout = async () => {
        try {
            await API.post("/auth/logout");
        } catch (err) {
            console.error("Logout notification failed");
        }
        localStorage.clear();
        window.location.href = '/';
    };

    const handleLogoutAllDevices = async () => {
        if (!window.confirm("Are you sure you want to log out from ALL devices?")) return;
        try {
            await API.post(`/auth/logout-all-devices/${userId}`);
            alert("Successfully logged out from all devices");
            handleLogout();
        } catch (err) {
            alert("Failed to logout from all devices");
        }
    };

    // ... (rest of the logic remains same, just updating the return block)
    // I'll skip to the return block for the edit
    // Wait, I need to make sure I don't break the existing logic.
    // I'll use multi_replace for safer editing.
    const rolePermissions = JSON.parse(localStorage.getItem("rolePermissions") || "{}");

    const links = [];

    // Helper to check if a module should be shown based on RBAC
    const canViewMenu = (menuName, legacyKey) => {
        if (role === 'admin' || role === 'superadmin') return true;

        // Use new menuPermissions if available
        if (rolePermissions?.menuPermissions && rolePermissions.menuPermissions[menuName]) {
            return rolePermissions.menuPermissions[menuName].view === true;
        }

        // Fallback to legacy uiSettings for backward compatibility
        return uiSettings?.sidebar?.[legacyKey] === true;
    };


    if (isSales || isServices || isStaff) {
        links.push({ name: "Sales Hub", path: "/sales-dashboard", icon: LayoutDashboard });
        links.push({ name: "My Leads", path: "/leads?tab=my_leads", icon: Users });
        links.push({ name: "Leads", path: "/leads", icon: Users });
        links.push({ name: "PO Management", path: "/po-management", icon: FileText });
        links.push({ name: "Inventory Search", path: "/search", icon: ShoppingBag });
        links.push({ name: "Quotations", path: "/leads?tab=quotations", icon: FileText });
        
        if (isServices) {
            links.push({ name: "Support Hub", path: "/client-support", icon: Users });
        }
    } else {
        if (canViewMenu('Dashboard', 'showDashboard')) {
            links.push({ name: "Dashboard", path: "/dashboard", icon: LayoutDashboard });
        }

        if (canViewMenu('Leads', 'showLeads')) {
            links.push({ name: "My Leads", path: "/leads?tab=my_leads", icon: Users });
            links.push({ name: "Leads", path: "/leads", icon: Users });
            links.push({ name: "PO Management", path: "/po-management", icon: FileText });
        }

        if (canViewMenu('Clients', 'showClients')) {
            links.push({ name: "Clients", path: "/clients", icon: Users });
        }

        if (canViewMenu('Catalog', 'showAddProduct')) {
            links.push({ name: "Add Product", path: "/add-product", icon: PlusCircle });
            links.push({ name: "Search", path: "/search", icon: ShoppingBag });
        }

        if (canViewMenu('Orders', 'showHistory')) {
            links.push({ name: "Product History", path: "/product-history", icon: History });
        }

        if (role === 'admin') {
            links.push({ name: "Upload Data", path: "/upload", icon: FileText });
            links.push({ name: "Manage Staff", path: "/create-staff", icon: Users });
            links.push({ name: "Permissions", path: "/permissions", icon: Settings });
        }
    }

    const isActive = (path) => {
        const pathBase = path.split('?')[0];
        const pathQuery = path.split('?')[1] ? '?' + path.split('?')[1] : '';

        if (location.pathname !== pathBase) return false;

        // If path has no query, it should only be active if location.search is empty OR it only has unrecognized params
        // But in our case, if location.search has 'filter=' or 'tab=', it belongs to specific sub-routes.
        if (!pathQuery) {
            if (!location.search) return true;
            if (location.search.includes('filter=') || location.search.includes('tab=')) return false;
            return true;
        }

        // If path has a query, check if location.search includes it
        if (pathQuery && location.search && location.search.includes(pathQuery.replace('?', ''))) return true;
        
        return false;
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={toggleSidebar}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`
          fixed top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform
          ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 transition-transform duration-300 ease-in-out
        `}
            >
                <div className="flex items-center justify-between p-6">
                    <Link to={isSales ? "/sales-dashboard" : "/dashboard"} className="flex items-center gap-2">
                        <img src="/logo.png" alt="TeamInspire Logo" className="h-10 w-auto object-contain" />
                    </Link>
                    <button onClick={toggleSidebar} className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400">
                        <X size={24} />
                    </button>
                </div>

                <nav className="mt-6 px-4 space-y-2">
                    {links.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium
                ${isActive(link.path)
                                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"}
              `}
                        >
                            <link.icon size={20} />
                            <span>{link.name}</span>
                        </Link>
                    ))}
                </nav>

                <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                {localStorage.getItem("name")?.charAt(0) || "U"}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[100px]">
                                    {localStorage.getItem("name")}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                    {role}
                                </p>
                                {isAdmin && (
                                    <button 
                                        onClick={handleLogoutAllDevices}
                                        className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline text-left mt-1 font-bold uppercase tracking-tighter"
                                    >
                                        Reset All Sessions
                                    </button>
                                )}
                            </div>
                        </div>

                        <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors text-sm font-medium"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 text-center">
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                            Developed by <span className="text-blue-600 dark:text-blue-400">Aditya Sharma</span> © {new Date().getFullYear()}
                        </p>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
