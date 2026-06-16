import { useEffect, useState } from "react";
import { User, Mail, Lock, Shield, Trash2, Edit3, UserPlus, Users, Search, Calendar, ChevronRight, LogOut } from "lucide-react";
import API from "../api/api";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const CreateStaff = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("");
    const [staffList, setStaffList] = useState([]);
    const [rolesList, setRolesList] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [permissions, setPermissions] = useState([]);

    const fetchStaffUsers = async () => {
        const res = await API.get("/auth/staff-users");
        setStaffList(res.data);
    };

    const fetchRoles = async () => {
        try {
            const res = await API.get("/roles");
            setRolesList(res.data);
            if (res.data.length > 0) {
                setRole(res.data[0].name);
            }
        } catch (err) {
            console.error("Failed to fetch roles", err);
        }
    };

    const createStaff = async () => {
        try {
            if (editingId) {
                await API.put(`/auth/staff/${editingId}`, {
                    name,
                    email,
                    role,
                    permissions,
                    ...(password ? { password } : {})
                });
                toast.success("User updated successfully");
            } else {
                await API.post("/auth/create-staff", {
                    name,
                    email,
                    password,
                    role,
                    permissions
                });
                toast.success("User created successfully");
            }
            resetForm();
            fetchStaffUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || "Operation failed");
        }
    };

    const deleteStaff = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await API.delete(`/auth/staff/${id}`);
            fetchStaffUsers();
        } catch (err) {
            toast.error("Failed to delete user");
        }
    };

    const logoutAllDevices = async (id) => {
        if (!window.confirm("Are you sure you want to log out this user from ALL devices?")) return;
        try {
            await API.post(`/auth/logout-all-devices/${id}`);
            toast.error("User logged out from all devices");
        } catch (err) {
            toast.error("Failed to log out user from all devices");
        }
    };

    const startEdit = (user) => {
        setName(user.name);
        setEmail(user.email);
        setRole(user.role || (rolesList.length > 0 ? rolesList[0].name : ""));
        setEditingId(user._id);
        setPermissions(user.permissions || []);
        setPassword("");
    };

    const resetForm = () => {
        setName("");
        setEmail("");
        setPassword("");
        setRole(rolesList.length > 0 ? rolesList[0].name : "");
        setPermissions([]);
        setEditingId(null);
    };

    useEffect(() => {
        fetchStaffUsers();
        fetchRoles();

        // Real-time auto-refresh logic
        const socketUrl = import.meta.env.VITE_API_URL 
            ? import.meta.env.VITE_API_URL.replace(/\/api$/, "")
            : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                ? "http://localhost:5000"
                : (window.location.port === "5173" || window.location.port === "5174"
                    ? `http://${window.location.hostname}:5000`
                    : window.location.origin));

        const socket = io(socketUrl);
        socket.on("userAction", () => {
            fetchStaffUsers(); // Auto refresh table when anyone logs in/out
        });

        return () => socket.disconnect();
    }, []);

    const filteredStaff = staffList.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950 transition-colors duration-300">
            <div className="p-4 md:p-8 lg:p-12 max-w-[1600px] mx-auto">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-600 rounded-lg text-white">
                                <Users size={24} />
                            </div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Staff Management</h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Create, manage and control access permissions for your team members.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* Left Column: Form Card */}
                    <div className="xl:col-span-4">
                        <div className={`sticky top-8 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl shadow-blue-500/5 border-2 transition-all duration-500 overflow-hidden ${editingId ? 'border-orange-500/30' : 'border-transparent'}`}>
                            <div className={`p-8 ${editingId ? 'bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-gray-900' : 'bg-white dark:bg-gray-900'}`}>
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                                        {editingId ? <Edit3 className="text-orange-500" /> : <UserPlus className="text-blue-600" />}
                                        {editingId ? "Update Member" : "Add New Member"}
                                    </h2>
                                    {editingId && (
                                        <button onClick={resetForm} className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-orange-500 transition-colors flex items-center gap-1">
                                            Cancel Edit
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <div className="group">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Full Name</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                                                <User size={18} />
                                            </div>
                                            <input
                                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 outline-none text-gray-900 dark:text-white transition-all shadow-inner"
                                                placeholder="Enter full name..."
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="group">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Email Address</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                                                <Mail size={18} />
                                            </div>
                                            <input
                                                type="email"
                                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 outline-none text-gray-900 dark:text-white transition-all shadow-inner"
                                                placeholder="email@company.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="group">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">
                                            Security Password {editingId && <span className="text-[10px] lowercase text-orange-500 opacity-60">(optional)</span>}
                                        </label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                                                <Lock size={18} />
                                            </div>
                                            <input
                                                type="password"
                                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 outline-none text-gray-900 dark:text-white transition-all shadow-inner"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="group">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Assign System Role</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                                                <Shield size={18} />
                                            </div>
                                            <select
                                                value={role}
                                                onChange={(e) => setRole(e.target.value)}
                                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 outline-none text-gray-900 dark:text-white transition-all shadow-inner appearance-none cursor-pointer font-semibold"
                                            >
                                                {rolesList.map((r) => (
                                                    <option key={r._id} value={r.name}>{r.name}</option>
                                                ))}
                                                {rolesList.length === 0 && <option value="staff">Staff</option>}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="group">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 block ml-1">Product Data Permissions</label>
                                        <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border-2 border-transparent">
                                            {[
                                                { id: 'dealerPriceINR', label: 'Dealer Price' },
                                                { id: 'retailPriceINR', label: 'Retail Price' },
                                                { id: 'quantity', label: 'Stock Qty' },
                                                { id: 'hsnCode', label: 'HSN Code' }
                                            ].map(perm => (
                                                <label key={perm.id} className="flex items-center gap-3 cursor-pointer group/label">
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={permissions.includes(perm.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setPermissions([...permissions, perm.id]);
                                                                } else {
                                                                    setPermissions(permissions.filter(p => p !== perm.id));
                                                                }
                                                            }}
                                                            className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-gray-300 dark:border-gray-600 checked:bg-blue-600 checked:border-blue-600 transition-all"
                                                        />
                                                        <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300 group-hover/label:text-blue-500 transition-colors">{perm.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={createStaff}
                                        className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                                            editingId 
                                            ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' 
                                            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                                        } text-white`}
                                    >
                                        {editingId ? <><Edit3 size={18} /> Update Access</> : <><UserPlus size={18} /> Grant Access</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Staff List Table */}
                    <div className="xl:col-span-8">
                        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl shadow-gray-500/5 border border-gray-100 dark:border-gray-800 overflow-hidden">
                            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Team Directory</h3>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input 
                                        type="text"
                                        placeholder="Search directory..."
                                        className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white w-full sm:w-64 transition-all"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full min-w-[800px]">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-gray-800/50 text-xs font-black uppercase tracking-[0.2em] text-gray-400 transition-colors">
                                            <th className="px-8 py-6 text-left">Staff Member</th>
                                            <th className="px-8 py-6 text-left">System Access</th>
                                            <th className="px-8 py-6 text-left">Created</th>
                                            <th className="px-8 py-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                        {filteredStaff.map((user) => (
                                            <tr key={user._id} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 flex items-center justify-center text-blue-600 dark:text-blue-300 font-black text-lg shadow-sm group-hover:scale-110 transition-transform">
                                                            {user.name?.charAt(0) || <User size={20} />}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-gray-900 dark:text-white tracking-tight">{user.name || "N/A"}</div>
                                                            <div className="text-sm text-gray-400 font-medium flex items-center gap-1">
                                                                <Mail size={12} /> {user.email}
                                                            </div>
                                                            <div className="flex flex-col mt-1 gap-0.5">
                                                                {user.lastLogin && (
                                                                    <div className="text-[10px] text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                                                                        <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                                                                        Last Login: {new Date(user.lastLogin).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                )}
                                                                {user.lastLogout && (
                                                                    <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold flex items-center gap-1">
                                                                        <div className="w-1 h-1 rounded-full bg-gray-400" />
                                                                        Last Logout: {new Date(user.lastLogout).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                            user.role?.toLowerCase() === 'admin' 
                                                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' 
                                                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                                                        }`}>
                                                            {user.role || 'Staff'}
                                                        </span>
                                                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse" />
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-bold text-sm">
                                                        <Calendar size={14} className="opacity-50" />
                                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, {
                                                            month: 'short', day: 'numeric', year: 'numeric'
                                                        }) : "N/A"}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2 transition-all duration-300">
                                                        <button
                                                            onClick={() => logoutAllDevices(user._id)}
                                                            className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                                                            title="Logout from all devices"
                                                        >
                                                            <LogOut size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => startEdit(user)}
                                                            className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                            title="Edit User"
                                                        >
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteStaff(user._id)}
                                                            className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredStaff.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="px-8 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-4">
                                                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full text-gray-300">
                                                            <Search size={40} />
                                                        </div>
                                                        <div className="text-gray-400 font-medium">No results found for your search</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
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

export default CreateStaff;
