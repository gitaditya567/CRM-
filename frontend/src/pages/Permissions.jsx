import React, { useState, useEffect } from "react";
import Skeleton from '../components/common/Skeleton';
import toast from 'react-hot-toast';
import { HelpCircle, Save, Loader, Shield, Eye, EyeOff } from "lucide-react";
import API from "../api/api";

const defaultMenus = [
    "Dashboard",
    "Leads",
    "Clients",
    "Catalog",
    "Orders",
    "Staff",
    "Settings"
];

const defaultModules = [
    "View All Leads",
    "View All Clients",
    "Manage Groups",
    "Quotation Management",
    "Add Group",
    "Add Client",
    "Dashboard"
];

const serviceModules = [
    "Lead Management",
    "Quotation Management",
    "Inventory Management",
    "Client Support Management"
];

const clientSupportModules = [
    "Client Support Management",
    "Lead Management",
    "Quotation Management"
];

const dispatchModules = [
    "Dispatch Management"
];

const assetsModules = [
    "PO Management",
    "Client Asset Management"
];

const salesModules = [
    "Lead Management",
    "Quotation Management",
    "Inventory Management"
];

const Permissions = () => {
    const [roles, setRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState(null);
    const [permissions, setPermissions] = useState({ menuPermissions: {}, modulePermissions: {} });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [globalSettings, setGlobalSettings] = useState(null);
    const [showAccessCode, setShowAccessCode] = useState(false);

    useEffect(() => {
        fetchRoles();
        fetchGlobalSettings();
    }, []);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            let res = await API.get("/roles");
            if (res.data.length === 0) {
                await API.get("/roles/init");
                res = await API.get("/roles");
            }
            setRoles(res.data);
            if (res.data.length > 0) {
                handleRoleSelect(res.data[0]);
            }
        } catch (error) {
            toast.error("Failed to load roles.");
        } finally {
            setLoading(false);
        }
    };

    const fetchGlobalSettings = async () => {
        try {
            const res = await API.get("/settings/ui");
            setGlobalSettings(res.data);
        } catch (error) {
            console.error("Failed to load global settings");
        }
    };

    const handleRoleSelect = (role) => {
        setSelectedRole(role);
        setPermissions({
            menuPermissions: role.menuPermissions || {},
            modulePermissions: role.modulePermissions || {}
        });
    };

    const handleModuleChange = (moduleName, action, checked) => {
        setPermissions((prev) => {
            const currentModule = prev.modulePermissions[moduleName] || { view: false, edit: false, delete: false, all: false };
            const newModule = { ...currentModule, [action]: checked };

            if (action === "all") {
                newModule.view = checked;
                newModule.edit = checked;
                newModule.delete = checked;
            } else {
                if (!checked) newModule.all = false;
                if (newModule.view && newModule.edit && newModule.delete) {
                    newModule.all = true;
                }
            }

            return {
                ...prev,
                modulePermissions: {
                    ...prev.modulePermissions,
                    [moduleName]: newModule
                }
            };
        });
    };

    const savePermissions = async () => {
        setSaving(true);
        try {
            const res = await API.put(`/roles/${selectedRole._id}`, {
                menuPermissions: permissions.menuPermissions,
                modulePermissions: permissions.modulePermissions
            });
            toast.success(`${selectedRole.name} permissions updated successfully!`);
            setRoles(roles.map(r => r._id === selectedRole._id ? res.data : r));
        } catch (error) {
            toast.error("Failed to update permissions.");
        } finally {
            setSaving(false);
        }
    };

    const updateGlobalSettings = async () => {
        try {
            await API.put("/settings/ui", globalSettings);
            toast.success("Global settings updated!");
        } catch (error) {
            toast.error("Failed to update global settings");
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><Skeleton type="table" count={1} /></div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-end border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
                    <div>
                        <div className="flex text-sm text-gray-500 dark:text-gray-400 mb-2">
                            <span>Team</span> <span className="mx-2">/</span> <span className="text-gray-900 dark:text-white font-medium">Permissions</span>
                        </div>
                        <h1 className="text-3xl font-light text-gray-700 dark:text-gray-300">Permissions & Security</h1>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-64 flex-shrink-0">
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm overflow-hidden">
                            {roles.map(role => (
                                <button
                                    key={role._id}
                                    onClick={() => handleRoleSelect(role)}
                                    className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition ${selectedRole?._id === role._id ? "bg-blue-500 text-white hover:bg-blue-600" : "text-gray-700 dark:text-gray-300"}`}
                                >
                                    {role.name}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={savePermissions}
                            disabled={saving}
                            className="mt-6 w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded shadow flex items-center justify-center transition-colors disabled:opacity-50"
                        >
                            {saving ? <Skeleton type="table" count={1} /> : <Save className="mr-2" size={18} />}
                            Save Permissions
                        </button>
                    </div>

                    <div className="flex-1 grid grid-cols-1 gap-4">
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-sm">
                                {selectedRole?.name} Management
                            </div>
                            <div className="p-4 overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700">
                                            <th className="font-bold text-base w-1/3 pb-2 px-2">Module</th>
                                            <th className="font-normal text-center pb-2 px-2">View</th>
                                            <th className="font-normal text-center pb-2 px-2">Edit</th>
                                            <th className="font-normal text-center pb-2 px-2">Delete</th>
                                            <th className="font-normal text-center pb-2 px-2">All</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selectedRole?.name === 'Services' ? serviceModules : selectedRole?.name === 'Client Support' ? clientSupportModules : selectedRole?.name === 'Dispatch' ? dispatchModules : selectedRole?.name === 'Assets' ? assetsModules : selectedRole?.name?.toLowerCase() === 'sales' ? salesModules : defaultModules).map((mod) => {
                                            const perms = permissions.modulePermissions[mod] || { view: false, edit: false, delete: false, all: false };
                                            return (
                                                <tr key={mod} className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-blue-50/50 dark:hover:bg-blue-900/10">
                                                    <td className="py-3 px-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">» {mod}</td>
                                                    <td className="text-center py-2.5">
                                                        <input type="checkbox" checked={perms.view} onChange={(e) => handleModuleChange(mod, "view", e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                                    </td>
                                                    <td className="text-center py-2.5">
                                                        <input type="checkbox" checked={perms.edit} onChange={(e) => handleModuleChange(mod, "edit", e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                                    </td>
                                                    <td className="text-center py-2.5">
                                                        <input type="checkbox" checked={perms.delete} onChange={(e) => handleModuleChange(mod, "delete", e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                                    </td>
                                                    <td className="text-center py-2.5">
                                                        <input type="checkbox" checked={perms.all} onChange={(e) => handleModuleChange(mod, "all", e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* GLOBAL SYSTEM SETTINGS */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mt-6">
                            <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-sm flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Shield size={18} className="text-blue-500" />
                                    Global System Security
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="max-w-md space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Universal Login Access Code</label>
                                        <div className="relative group">
                                            <input
                                                type={showAccessCode ? "text" : "password"}
                                                className="w-full pl-4 pr-12 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold tracking-widest"
                                                placeholder="No code set (Login is open)"
                                                value={globalSettings?.features?.loginAccessCode || ""}
                                                onChange={(e) => setGlobalSettings({
                                                    ...globalSettings,
                                                    features: { ...globalSettings.features, loginAccessCode: e.target.value }
                                                })}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowAccessCode(!showAccessCode)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
                                            >
                                                {showAccessCode ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-gray-500 font-medium leading-relaxed italic">
                                            * When set, all users (except Admin) must enter this code to login. Leave empty to disable.
                                        </p>
                                    </div>
                                    <button
                                        onClick={updateGlobalSettings}
                                        className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-lg active:scale-95"
                                    >
                                        Update System Code
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Permissions;
