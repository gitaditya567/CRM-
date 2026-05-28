import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import API from "../api/api";
import { locationData } from "../data/locations";

const Clients = () => {
    const [groups, setGroups] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddGroupModal, setShowAddGroupModal] = useState(false);
    const [showAddClientModal, setShowAddClientModal] = useState(false);
    // Removed clientStep state
    const [editingClientId, setEditingClientId] = useState(null);
    const [users, setUsers] = useState([]);
    const [clientIsSecret, setClientIsSecret] = useState(false);
    const [clientAllowedUsers, setClientAllowedUsers] = useState([]);
    const [newGroupPriceType, setNewGroupPriceType] = useState("default");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalClients, setTotalClients] = useState(0);
    const [searchClientQuery, setSearchClientQuery] = useState("");
    const [showAllGroups, setShowAllGroups] = useState(false);

    const DESIGNATIONS = [
        "Proprietor", "Director", "Managing Director", "Procurement Manager", 
        "Purchase Manager", "General Manager", "CEO", "Owner", "Other"
    ];

    const COUNTRIES = ["India", "United States", "United Kingdom", "United Arab Emirates", "Singapore", "Australia"];

    // Form States
    const [newGroupName, setNewGroupName] = useState("");
    // Removed inline group state
    const [clientFormData, setClientFormData] = useState({
        group: "",
        clientName: "",
        legalEntityName: "",
        billingAddress: {
            addressLine1: "",
            addressLine2: "",
            city: "",
            distt: "",
            state: "",
            zipCode: "",
            country: "",
        },
        gstVatNo: "",
        contactPerson1: {
            name: "",
            designation: "",
            phone: "",
            email: "",
        },
        contactPerson2: {
            name: "",
            designation: "",
            phone: "",
            email: "",
        },
        isVisible: true,
        dispatchAddress: {
            addressLine1: "",
            addressLine2: "",
            city: "",
            distt: "",
            state: "",
            zipCode: "",
            country: "",
        },
    });



    useEffect(() => {
        console.log("DEBUG: Mount useEffect running in Clients.jsx");
        fetchData();
    }, []);

    const fetchData = async (pageNum = 1) => {
        console.log("DEBUG: fetchData called in Clients.jsx", { pageNum });
        try {
            setLoading(true);
            const [groupsRes, clientsRes, usersRes] = await Promise.all([
                API.get("/groups"),
                API.get(`/clients?page=${pageNum}&limit=50`),
                API.get("/auth/users")
            ]);
            setGroups(groupsRes.data);
            setClients(clientsRes.data.clients || []);
            setTotalPages(clientsRes.data.pagination?.totalPages || 1);
            setTotalClients(clientsRes.data.pagination?.totalClients || 0);
            setPage(pageNum);
            setUsers(usersRes.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching data:", error);
            setLoading(false);
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        try {
            await API.post("/groups", { name: newGroupName, priceType: newGroupPriceType });
            setNewGroupName("");
            setNewGroupPriceType("default");
            setShowAddGroupModal(false);
            fetchData();
        } catch (error) {
            toast.error("Error creating group");
        }
    };

    const handleSaveClient = async (e) => {
        e.preventDefault();
        try {
            const payload = { 
                ...clientFormData, 
                billingAddress: { ...clientFormData.billingAddress, country: "India" },
                dispatchAddress: { ...clientFormData.dispatchAddress, country: "India" },
                isSecret: clientIsSecret, 
                allowedUsers: clientAllowedUsers 
            };
            if (editingClientId) {
                // Update existing client
                await API.put(`/clients/${editingClientId}`, payload);
            } else {
                // Create new client
                await API.post("/clients", payload);
            }

            closeClientModal();
            fetchData();
        } catch (error) {
            toast.error(editingClientId ? "Error updating client" : "Error creating client");
            console.error(error);
        }
    };

    // Removed handleInlineCreateGroup

    const closeClientModal = () => {
        setShowAddClientModal(false);
        setEditingClientId(null);
        setClientFormData({
            group: "",
            clientName: "",
            legalEntityName: "",
            billingAddress: { addressLine1: "", addressLine2: "", city: "", distt: "", state: "", zipCode: "", country: "" },
            gstVatNo: "",
            contactPerson1: { name: "", designation: "", phone: "", email: "" },
            contactPerson2: { name: "", designation: "", phone: "", email: "" },
            isDispatchAddressSame: false,
            dispatchAddress: { addressLine1: "", addressLine2: "", city: "", distt: "", state: "", zipCode: "", country: "" },
            isVisible: true,
        });
        setClientIsSecret(false);
        setClientAllowedUsers([]);
    };

    const handleEditClient = (client) => {
        setEditingClientId(client._id);
        const formData = {
            group: client.group?._id || client.group || "", // Handle populated or unpopulated group
            clientName: client.clientName || "",
            legalEntityName: client.legalEntityName || "",
            billingAddress: {
                addressLine1: client.billingAddress?.addressLine1 || "",
                addressLine2: client.billingAddress?.addressLine2 || "",
                city: client.billingAddress?.city || "",
                distt: client.billingAddress?.distt || "",
                state: client.billingAddress?.state || "",
                zipCode: client.billingAddress?.zipCode || "",
                country: client.billingAddress?.country || ""
            },
            gstVatNo: client.gstVatNo || "",
            contactPerson1: {
                name: client.contactPerson1?.name || "",
                designation: client.contactPerson1?.designation || "",
                phone: client.contactPerson1?.phone || "",
                email: client.contactPerson1?.email || ""
            },
            contactPerson2: {
                name: client.contactPerson2?.name || "",
                designation: client.contactPerson2?.designation || "",
                phone: client.contactPerson2?.phone || "",
                email: client.contactPerson2?.email || ""
            },
            isDispatchAddressSame: client.isDispatchAddressSame || false,
            dispatchAddress: {
                addressLine1: client.dispatchAddress?.addressLine1 || "",
                addressLine2: client.dispatchAddress?.addressLine2 || "",
                city: client.dispatchAddress?.city || "",
                distt: client.dispatchAddress?.distt || "",
                state: client.dispatchAddress?.state || "",
                zipCode: client.dispatchAddress?.zipCode || "",
                country: client.dispatchAddress?.country || ""
            },
            isVisible: client.isVisible !== undefined ? client.isVisible : true,
            ...client
        };
        // Re-overwrite group because spread might have overwritten it with object if populated
        formData.group = client.group?._id || client.group || "";

        setClientFormData(formData);
        setClientIsSecret(client.isSecret || false);
        setClientAllowedUsers(client.allowedUsers || []);
        setShowAddClientModal(true);
    };

    const handleDeleteClient = async (clientId) => {
        if (!window.confirm("Are you sure you want to delete this client?")) return;
        try {
            await API.delete(`/clients/${clientId}`);
            fetchData();
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Error deleting client";
            toast.error(errorMsg);
            console.error("Delete Error:", error);
        }
    };

    const handleChange = (e, section = null) => {
        const { name, value, type, checked } = e.target;
        const val = type === "checkbox" ? checked : value;

        setClientFormData(prev => {
            const newData = { ...prev };

            if (section) {
                // Cascading Logic
                if (name === "state") {
                    newData[section] = { ...newData[section], state: val, distt: "", city: "" }; // Reset Distt and City
                } else if (name === "distt") {
                    newData[section] = { ...newData[section], distt: val, city: "" }; // Reset City
                } else {
                    newData[section] = { ...newData[section], [name]: val };
                }
            } else {
                newData[name] = val;
            }
            return newData;
        });
    };

    const getClientsForGroup = (groupId) => {
        return clients.filter(c => {
            const cGroupId = c.group?._id || c.group;
            return String(cGroupId) === String(groupId);
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">

            <div className="p-6 md:p-12">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Portfolio Registry</h1>
                            <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-md">
                                Search and organize your client segments and active business relationships.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center">
                            <div className="relative w-full sm:w-80 group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Search Group or Client..."
                                    value={searchClientQuery}
                                    onChange={(e) => setSearchClientQuery(e.target.value)}
                                    className="w-full pl-12 pr-6 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none dark:text-white transition-all shadow-inner font-medium"
                                />
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                                <button
                                    onClick={() => setShowAddGroupModal(true)}
                                    className="flex-1 sm:flex-none px-6 py-3.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-black rounded-2xl hover:bg-blue-200 transition-all active:scale-95 text-sm"
                                >
                                    + Add Group
                                </button>
                                <button
                                    onClick={() => setShowAddClientModal(true)}
                                    className="flex-1 sm:flex-none px-6 py-3.5 bg-green-600 text-white font-black rounded-2xl shadow-xl shadow-green-500/20 hover:bg-green-700 transition-all active:scale-95 text-sm"
                                >
                                    + Add Client
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Groups List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {groups.filter(group => {
                            const query = searchClientQuery.toLowerCase();
                            const groupMatch = group.name.toLowerCase().includes(query);
                            const hasMatchingClient = clients.some(c => {
                                const cGroupId = c.group?._id || c.group;
                                return String(cGroupId) === String(group._id) && 
                                       (c.clientName.toLowerCase().includes(query) || (c.contactPerson1?.phone || "").includes(query));
                            });
                            return groupMatch || hasMatchingClient;
                        }).slice(0, (showAllGroups || searchClientQuery) ? undefined : 3).map(group => (
                            <div key={group._id} className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all border-b-4 border-b-blue-500/20 group-card overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <span className="text-6xl font-black">{group.name.charAt(0)}</span>
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6 border-b border-gray-50 dark:border-gray-700 pb-4 tracking-tight flex items-center justify-between">
                                    {group.name}
                                    <span className="text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full uppercase tracking-widest">
                                        {getClientsForGroup(group._id).length} Active
                                    </span>
                                </h3>
                                <div className="space-y-4">
                                    {getClientsForGroup(group._id).filter(client => {
                                        const query = searchClientQuery.toLowerCase();
                                        return client.clientName.toLowerCase().includes(query) || 
                                               (client.contactPerson1?.phone || "").includes(query) ||
                                               group.name.toLowerCase().includes(query);
                                    }).length === 0 ? (
                                        <p className="text-sm text-gray-400 italic py-4 text-center">No matching entities found.</p>
                                    ) : (
                                        getClientsForGroup(group._id).filter(client => {
                                            const query = searchClientQuery.toLowerCase();
                                            return client.clientName.toLowerCase().includes(query) || 
                                                   (client.contactPerson1?.phone || "").includes(query) ||
                                                   group.name.toLowerCase().includes(query);
                                        }).map(client => (
                                            <div key={client._id} className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-2xl flex justify-between items-center group-hover-target transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30">
                                                <div className="max-w-[200px] truncate" title={client.clientName}>
                                                    <p className="font-black text-gray-800 dark:text-gray-100 text-sm">{client.clientName}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{client.contactPerson1?.phone || "No Contact Info"}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEditClient(client)}
                                                        className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm"
                                                        title="Edit Profile"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClient(client._id)}
                                                        className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm"
                                                        title="Remove Client"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {!showAllGroups && !searchClientQuery && groups.length > 3 && (
                        <div className="mt-12 mb-16 flex justify-center">
                            <button
                                onClick={() => setShowAllGroups(true)}
                                className="group relative px-10 py-4 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-black rounded-2xl shadow-xl hover:shadow-2xl transition-all active:scale-95 border border-blue-50 dark:border-blue-900/30 overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-3">
                                    View All Groups & Clients
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                                </span>
                                <div className="absolute inset-0 bg-blue-50/50 dark:bg-blue-900/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            </button>
                        </div>
                    )}

                    {/* Ungrouped / General Clients */}
                    <div className="mt-8">
                        {clients.filter(c => !c.group && (c.clientName.toLowerCase().includes(searchClientQuery.toLowerCase()) || (c.contactPerson1?.phone || "").includes(searchClientQuery.toLowerCase()))).length > 0 && (
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 border-b-4 border-b-gray-400/20 group-card overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <span className="text-6xl font-black">G</span>
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6 border-b border-gray-50 dark:border-gray-700 pb-4 tracking-tight flex items-center justify-between">
                                    General / Ungrouped
                                    <span className="text-xs font-bold text-gray-500 bg-gray-50 dark:bg-gray-900/30 px-3 py-1 rounded-full uppercase tracking-widest">
                                        {clients.filter(c => !c.group).length} Total
                                    </span>
                                </h3>
                                <div className="space-y-4">
                                    {clients.filter(c => !c.group).filter(client => {
                                        const query = searchClientQuery.toLowerCase();
                                        return client.clientName.toLowerCase().includes(query) || (client.contactPerson1?.phone || "").includes(query);
                                    }).map(client => (
                                        <div key={client._id} className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-2xl flex justify-between items-center group-hover-target transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                                            <div className="max-w-[200px] truncate">
                                                <p className="font-black text-gray-800 dark:text-gray-100 text-sm">{client.clientName}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{client.contactPerson1?.phone || "No Contact Info"}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEditClient(client)}
                                                    className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm"
                                                    title="Edit Profile"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClient(client._id)}
                                                    className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm"
                                                    title="Remove Client"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-12 flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="text-sm text-gray-500">
                                Showing <span className="font-medium text-gray-700 dark:text-gray-300">{clients.length}</span> of <span className="font-medium text-gray-700 dark:text-gray-300">{totalClients}</span> clients
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => fetchData(page - 1)}
                                    disabled={page === 1}
                                    className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                >
                                    Previous
                                </button>
                                <div className="flex items-center gap-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Page {page} of {totalPages}
                                </div>
                                <button
                                    onClick={() => fetchData(page + 1)}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Group Modal */}
            {showAddGroupModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-96 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Add New Group</h2>
                            <button onClick={() => setShowAddGroupModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-3xl leading-none">&times;</button>
                        </div>
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder="Group Name"
                            className="w-full p-2 border rounded mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowAddGroupModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                            <button onClick={handleCreateGroup} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Client Modal */}
            {showAddClientModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-10">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl w-full max-w-4xl shadow-2xl my-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                                {editingClientId ? "Edit Client" : "Add New Client"}
                            </h2>
                            <button onClick={closeClientModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-3xl leading-none">&times;</button>
                        </div>

                        <form onSubmit={handleSaveClient} className="space-y-6">
                            {/* Group Selection */}
                            {/* Group Selection */}
                            <div className="w-full">
                                <select
                                    name="group"
                                    value={clientFormData.group}
                                    onChange={handleChange}
                                    className="input-field w-full"
                                >
                                    <option value="">Select Group (Optional for General)</option>
                                    {groups.map(g => (
                                        <option key={g._id} value={g._id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input name="clientName" placeholder="Client Name *" value={clientFormData.clientName} onChange={handleChange} required className="input-field" />
                                <input name="legalEntityName" placeholder="Legal Entity Name *" value={clientFormData.legalEntityName} onChange={handleChange} required className="input-field" />
                            </div>

                            {/* Secret Client Toggle */}
                            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800">
                                <input
                                    type="checkbox"
                                    checked={clientIsSecret}
                                    onChange={(e) => setClientIsSecret(e.target.checked)}
                                    className="w-5 h-5 rounded text-red-600 focus:ring-red-500"
                                />
                                <div>
                                    <label className="font-semibold text-gray-800 dark:text-white">Secret Client</label>
                                    <p className="text-xs text-gray-500">Only allowed users can see this client.</p>
                                </div>
                            </div>

                            {clientIsSecret && (
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Allowed Users</label>
                                    <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-700">
                                        {users.map(u => (
                                            <div key={u._id} className="flex items-center gap-2 py-1">
                                                <input
                                                    type="checkbox"
                                                    checked={clientAllowedUsers.includes(u._id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setClientAllowedUsers([...clientAllowedUsers, u._id]);
                                                        } else {
                                                            setClientAllowedUsers(clientAllowedUsers.filter(id => id !== u._id));
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                                <span className="text-sm text-gray-800 dark:text-gray-200">{u.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Visibility Toggle (only if not secret) */}
                            {!clientIsSecret && (
                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                    <input
                                        type="checkbox"
                                        name="isVisible"
                                        checked={clientFormData.isVisible !== false}
                                        onChange={handleChange}
                                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <div>
                                        <label className="font-semibold text-gray-700 dark:text-gray-300">Visible to All Users</label>
                                        <p className="text-xs text-gray-500">If unchecked, only admins can view this client.</p>
                                    </div>
                                </div>
                            )}

                            {/* Billing Address */}
                            <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-200 mt-4">Billing Address</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input name="addressLine1" placeholder="Address Line 1 *" value={clientFormData.billingAddress.addressLine1} onChange={(e) => handleChange(e, 'billingAddress')} required className="input-field" />
                                <input name="addressLine2" placeholder="Address Line 2" value={clientFormData.billingAddress.addressLine2} onChange={(e) => handleChange(e, 'billingAddress')} className="input-field" />

                                {/* State Select */}
                                <select name="state" value={clientFormData.billingAddress.state} onChange={(e) => handleChange(e, 'billingAddress')} required className="input-field">
                                    <option value="">Select State *</option>
                                    {Object.keys(locationData).sort().map(state => <option key={state} value={state}>{state}</option>)}
                                </select>

                                {/* District Select */}
                                <select name="distt" value={clientFormData.billingAddress.distt} onChange={(e) => handleChange(e, 'billingAddress')} required className="input-field" disabled={!clientFormData.billingAddress.state}>
                                    <option value="">Select District *</option>
                                    {clientFormData.billingAddress.state && locationData[clientFormData.billingAddress.state] &&
                                        Object.keys(locationData[clientFormData.billingAddress.state]).sort().map(dist => <option key={dist} value={dist}>{dist}</option>)
                                    }
                                </select>

                                {/* City Input */}
                                <input type="text" name="city" placeholder="City *" value={clientFormData.billingAddress.city} onChange={(e) => handleChange(e, 'billingAddress')} required className="input-field" />

                                <input name="zipCode" placeholder="ZIP Code *" value={clientFormData.billingAddress.zipCode} onChange={(e) => handleChange(e, 'billingAddress')} required className="input-field" />

                                <input type="text" name="country" value="India" readOnly className="input-field bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-70" />
                            </div>

                            <div className="w-full">
                                <input name="gstVatNo" placeholder="GST / VAT No. *" value={clientFormData.gstVatNo} onChange={handleChange} required className="input-field w-full" />
                            </div>

                            {/* Contact Person 1 */}
                            <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-200 mt-4">Contact Person 1</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input name="name" placeholder="Name *" value={clientFormData.contactPerson1.name} onChange={(e) => handleChange(e, 'contactPerson1')} required className="input-field" />
                                <input type="text" name="designation" placeholder="Designation *" value={clientFormData.contactPerson1.designation} onChange={(e) => handleChange(e, 'contactPerson1')} required className="input-field" />
                                <input name="phone" placeholder="Phone *" value={clientFormData.contactPerson1.phone} onChange={(e) => handleChange(e, 'contactPerson1')} required className="input-field" />
                                <input name="email" placeholder="Email *" value={clientFormData.contactPerson1.email} onChange={(e) => handleChange(e, 'contactPerson1')} required className="input-field" />
                            </div>

                            {/* Contact Person 2 */}
                            <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-200 mt-4">Contact Person 2</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input name="name" placeholder="Name *" value={clientFormData.contactPerson2.name} onChange={(e) => handleChange(e, 'contactPerson2')} required className="input-field" />
                                <input type="text" name="designation" placeholder="Designation" value={clientFormData.contactPerson2.designation} onChange={(e) => handleChange(e, 'contactPerson2')} className="input-field" />
                                <input name="phone" placeholder="Phone *" value={clientFormData.contactPerson2.phone} onChange={(e) => handleChange(e, 'contactPerson2')} required className="input-field" />
                                <input name="email" placeholder="Email *" value={clientFormData.contactPerson2.email} onChange={(e) => handleChange(e, 'contactPerson2')} required className="input-field" />
                            </div>

                            {/* Dispatch Address */}
                            <div className="flex items-center gap-2 mt-4">
                                <input
                                    type="checkbox"
                                    name="isDispatchAddressSame"
                                    checked={clientFormData.isDispatchAddressSame}
                                    onChange={handleChange}
                                    className="w-5 h-5"
                                />
                                <label className="text-gray-700 dark:text-gray-300">Is Dispatching Address same as Billing?</label>
                            </div>

                            {!clientFormData.isDispatchAddressSame && (
                                <>
                                    <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-200 mt-2">Dispatch Address</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input name="addressLine1" placeholder="Address Line 1 *" value={clientFormData.dispatchAddress.addressLine1} onChange={(e) => handleChange(e, 'dispatchAddress')} required className="input-field" />
                                        <input name="addressLine2" placeholder="Address Line 2" value={clientFormData.dispatchAddress.addressLine2} onChange={(e) => handleChange(e, 'dispatchAddress')} className="input-field" />

                                        {/* State Select */}
                                        <select name="state" value={clientFormData.dispatchAddress.state} onChange={(e) => handleChange(e, 'dispatchAddress')} required className="input-field">
                                            <option value="">Select State *</option>
                                            {Object.keys(locationData).sort().map(state => <option key={state} value={state}>{state}</option>)}
                                        </select>

                                        {/* District Select */}
                                        <select name="distt" value={clientFormData.dispatchAddress.distt} onChange={(e) => handleChange(e, 'dispatchAddress')} required className="input-field" disabled={!clientFormData.dispatchAddress.state}>
                                            <option value="">Select District *</option>
                                            {clientFormData.dispatchAddress.state && locationData[clientFormData.dispatchAddress.state] &&
                                                Object.keys(locationData[clientFormData.dispatchAddress.state]).sort().map(dist => <option key={dist} value={dist}>{dist}</option>)
                                            }
                                        </select>

                                        {/* City Input */}
                                        <input type="text" name="city" placeholder="City *" value={clientFormData.dispatchAddress.city} onChange={(e) => handleChange(e, 'dispatchAddress')} required className="input-field" />

                                        <input name="zipCode" placeholder="ZIP Code *" value={clientFormData.dispatchAddress.zipCode} onChange={(e) => handleChange(e, 'dispatchAddress')} required className="input-field" />

                                        <input type="text" name="country" value="India" readOnly className="input-field bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-70" />
                                    </div>
                                    </div>
                                </>
                            )}

                            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button type="button" onClick={closeClientModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Save Client</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .input-field {
                    width: 100%;
                    padding: 0.75rem;
                    border-radius: 0.5rem;
                    border: 1px solid #e5e7eb;
                    background-color: #f9fafb;
                    color: #1f2937;
                }
                .dark .input-field {
                    background-color: #374151;
                    border-color: #4b5563;
                    color: white;
                }
            `}</style>
        </div>
    );
};

export default Clients;
