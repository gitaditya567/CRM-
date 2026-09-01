import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  MessageSquare, 
  Clock, 
  User, 
  Trash2, 
  X, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Code
} from "lucide-react";
import API from "../api/api";
import toast from "react-hot-toast";

const DeveloperRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Feature Request",
    priority: "Medium"
  });

  // Edit / Remarks modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editForm, setEditForm] = useState({
    status: "",
    developerRemarks: ""
  });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await API.get("/developer-requests");
      setRequests(res.data || []);
    } catch (err) {
      console.error("Error fetching developer requests:", err);
      toast.error("Failed to load developer requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error("Title and description are required");
      return;
    }

    try {
      await API.post("/developer-requests", formData);
      toast.success("Request submitted successfully!");
      setIsModalOpen(false);
      setFormData({
        title: "",
        description: "",
        category: "Feature Request",
        priority: "Medium"
      });
      fetchRequests();
    } catch (err) {
      console.error("Error creating request:", err);
      toast.error(err.response?.data?.message || "Failed to submit request");
    }
  };

  const handleOpenEditModal = (req) => {
    setSelectedRequest(req);
    setEditForm({
      status: req.status,
      developerRemarks: req.developerRemarks || ""
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/developer-requests/${selectedRequest._id}`, editForm);
      toast.success("Request updated successfully!");
      setIsEditModalOpen(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (err) {
      console.error("Error updating request:", err);
      toast.error(err.response?.data?.message || "Failed to update request");
    }
  };

  const handleDeleteRequest = async (id) => {
    if (!window.confirm("Are you sure you want to delete this developer request?")) return;
    try {
      await API.delete(`/developer-requests/${id}`);
      toast.success("Request deleted successfully!");
      fetchRequests();
    } catch (err) {
      console.error("Error deleting request:", err);
      toast.error(err.response?.data?.message || "Failed to delete request");
    }
  };

  // Badges color configurations
  const categoryColors = {
    "Bug": "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/30",
    "Feature Request": "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/30",
    "UI Change": "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/30",
    "Other": "bg-gray-50 text-gray-700 border-gray-100 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-700/30"
  };

  const priorityColors = {
    "Low": "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800/30 dark:text-slate-300 dark:border-slate-700/20",
    "Medium": "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/20",
    "High": "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900/20",
    "Critical": "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/30 font-bold"
  };

  const statusColors = {
    "Pending": "bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-900/20",
    "In Progress": "bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-900/20",
    "Completed": "bg-green-50 text-green-700 border-green-100 dark:bg-green-950/30 dark:text-green-300 dark:border-green-900/20",
    "Rejected": "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
  };

  // Filter requests
  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.submittedBy?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === "All" || req.category === categoryFilter;
    const matchesPriority = priorityFilter === "All" || req.priority === priorityFilter;
    const matchesStatus = statusFilter === "All" || req.status === statusFilter;

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-3">
            Developer Desk
            <span className="text-sm font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2.5 py-0.5 rounded-full">
              {filteredRequests.length}
            </span>
          </h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
            Submit feature requests, report bugs, or request UI updates directly to the developer team.
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 shadow-md shadow-purple-500/10 transition cursor-pointer"
        >
          <Plus size={16} />
          New Request
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 justify-between items-center">
        
        {/* Search */}
        <div className="relative flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-2.5 w-full md:w-80">
          <Search size={16} className="text-gray-400 mr-2 shrink-0" />
          <input 
            type="text" 
            placeholder="Search requests..." 
            className="bg-transparent border-none text-xs outline-none text-gray-700 dark:text-white placeholder-gray-400 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Category */}
          <div className="relative flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-3 py-2">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider mr-2">Category:</span>
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent border-none text-xs outline-none text-gray-700 dark:text-white cursor-pointer font-bold focus:ring-0"
            >
              <option value="All" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">All</option>
              <option value="Bug" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Bug</option>
              <option value="Feature Request" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Feature Request</option>
              <option value="UI Change" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">UI Change</option>
              <option value="Other" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Other</option>
            </select>
          </div>

          {/* Priority */}
          <div className="relative flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-3 py-2">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider mr-2">Priority:</span>
            <select 
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent border-none text-xs outline-none text-gray-700 dark:text-white cursor-pointer font-bold focus:ring-0"
            >
              <option value="All" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">All</option>
              <option value="Low" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Low</option>
              <option value="Medium" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Medium</option>
              <option value="High" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">High</option>
              <option value="Critical" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Critical</option>
            </select>
          </div>

          {/* Status */}
          <div className="relative flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-3 py-2">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider mr-2">Status:</span>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-xs outline-none text-gray-700 dark:text-white cursor-pointer font-bold focus:ring-0"
            >
              <option value="All" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">All</option>
              <option value="Pending" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Pending</option>
              <option value="In Progress" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">In Progress</option>
              <option value="Completed" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Completed</option>
              <option value="Rejected" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid List of Requests */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="py-20 text-center text-gray-400 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl uppercase tracking-widest text-xs font-bold">
          No Requests Found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRequests.map((req) => (
            <div 
              key={req._id}
              className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between hover:shadow-md hover:border-purple-100 dark:hover:border-purple-900/30 transition-all duration-300"
            >
              <div className="space-y-4">
                {/* Badges / Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 dark:border-gray-700 pb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase border rounded-lg ${categoryColors[req.category] || ""}`}>
                      {req.category}
                    </span>
                    <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase border rounded-lg ${priorityColors[req.priority] || ""}`}>
                      {req.priority}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase border rounded-lg ${statusColors[req.status] || ""}`}>
                    {req.status}
                  </span>
                </div>

                {/* Submitter */}
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  <User size={12} className="text-gray-400" />
                  <span>By: {req.submittedBy?.name || "Unknown"}</span>
                  <span className="text-gray-300">•</span>
                  <Clock size={12} className="text-gray-400" />
                  <span>{new Date(req.createdAt).toLocaleDateString("en-GB")}</span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white truncate" title={req.title}>{req.title}</h3>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1 whitespace-pre-wrap leading-relaxed">
                    {req.description}
                  </p>
                </div>

                {/* Remarks Block */}
                {req.developerRemarks && (
                  <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100/50 dark:border-purple-900/30 rounded-2xl">
                    <span className="text-[9px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-widest flex items-center gap-1">
                      <Code size={10} />
                      Developer Remarks:
                    </span>
                    <p className="text-[11px] font-semibold text-purple-800 dark:text-purple-300 mt-1 whitespace-pre-wrap leading-relaxed">
                      {req.developerRemarks}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center gap-2">
                <button
                  onClick={() => handleOpenEditModal(req)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-purple-100 hover:border-purple-300 dark:border-purple-800/40 text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/30 transition cursor-pointer"
                >
                  <MessageSquare size={12} />
                  Update Status / Remarks
                </button>

                <button
                  onClick={() => handleDeleteRequest(req._id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition cursor-pointer"
                  title="Delete Request"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ➕ Create Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in">
            {/* Header */}
            <div className="px-6 py-5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Plus className="text-purple-600" size={20} />
                New Request
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Form Body */}
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Request Title</label>
                  <input 
                    type="text"
                    placeholder="e.g. Add excel export to client page"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-purple-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Description / Details</label>
                  <textarea 
                    rows="4"
                    placeholder="Provide details of the bug, layout issues, or how the feature should behave..."
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-purple-500"
                    >
                      <option value="Bug">Bug</option>
                      <option value="Feature Request">Feature Request</option>
                      <option value="UI Change">UI Change</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={e => setFormData({...formData, priority: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-purple-500"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md hover:scale-105 active:scale-95 transition"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✏️ Update Status / Remarks Modal */}
      {isEditModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in">
            {/* Header */}
            <div className="px-6 py-5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="text-purple-600" size={20} />
                Update Request
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Form Body */}
            <form onSubmit={handleUpdateStatus}>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Ticket Title</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white mt-0.5">{selectedRequest.title}</p>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm({...editForm, status: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-purple-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {/* Developer Remarks */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Developer Remarks</label>
                  <textarea 
                    rows="3"
                    placeholder="Enter details on implementation progress, fixes applied, or questions..."
                    value={editForm.developerRemarks}
                    onChange={e => setEditForm({...editForm, developerRemarks: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-purple-500 resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md hover:scale-105 active:scale-95 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DeveloperRequests;
