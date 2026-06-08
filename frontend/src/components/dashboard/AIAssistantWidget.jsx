import React, { useState, useEffect, useCallback } from "react";
import { MessageSquare, Bot, Sparkles, Check, AlertCircle, X, ChevronUp, ChevronDown, Phone, ArrowRight, Clock, Send, RefreshCw } from "lucide-react";
import API from "../../api/api";
import { toast } from "react-hot-toast";

const AIAssistantWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [briefing, setBriefing] = useState(null);
    const [loadingBriefing, setLoadingBriefing] = useState(false);
    const [showBriefingPopup, setShowBriefingPopup] = useState(false);
    const [activePrompt, setActivePrompt] = useState(null);
    const [feedbackText, setFeedbackText] = useState("");
    const [processingFeedback, setProcessingFeedback] = useState(false);
    const [aiResponse, setAiResponse] = useState(null);
    const [userName, setUserName] = useState("Sir");

    const fetchBriefing = useCallback(async () => {
        setLoadingBriefing(true);
        try {
            const res = await API.get("/ai/briefing");
            setBriefing(res.data);
            
            // Auto trigger system-on alert popup if there are actionable items
            if (res.data.summary?.totalActionRequired > 0) {
                setShowBriefingPopup(true);
            }
            
            // Find the first due/overdue item to prompt
            findNextPrompt(res.data.agenda);
        } catch (err) {
            console.error("Fetch AI Briefing failed", err);
        } finally {
            setLoadingBriefing(false);
        }
    }, []);

    useEffect(() => {
        const storedName = localStorage.getItem("name");
        if (storedName) {
            setUserName(storedName);
        }
        fetchBriefing();
    }, [fetchBriefing]);

    const findNextPrompt = (agenda) => {
        if (!agenda) return;
        
        // Prioritize today's follow-ups, then overdue, then new leads
        if (agenda.todayFollowUps && agenda.todayFollowUps.length > 0) {
            setActivePrompt({ ...agenda.todayFollowUps[0], promptType: "today" });
        } else if (agenda.overdueLeads && agenda.overdueLeads.length > 0) {
            setActivePrompt({ ...agenda.overdueLeads[0], promptType: "overdue" });
        } else if (agenda.quotations && agenda.quotations.length > 0) {
            setActivePrompt({ ...agenda.quotations[0], promptType: "quotation" });
        } else if (agenda.newLeads && agenda.newLeads.length > 0) {
            setActivePrompt({ ...agenda.newLeads[0], promptType: "new" });
        } else {
            setActivePrompt(null);
        }
    };

    const handleFeedbackSubmit = async (e) => {
        e.preventDefault();
        if (!feedbackText.trim() || !activePrompt) return;

        setProcessingFeedback(true);
        setAiResponse(null);

        const payload = {
            itemId: activePrompt.id,
            type: activePrompt.type === "quotation" ? "quotation" : "lead",
            feedback: feedbackText
        };

        try {
            const res = await API.post("/ai/process-call", payload);
            setAiResponse(res.data.aiParsed);
            setFeedbackText("");
            toast.success("AI updated lead successfully!");
            
            // Refresh briefing to get updated agenda
            const briefingRes = await API.get("/ai/briefing");
            setBriefing(briefingRes.data);
            findNextPrompt(briefingRes.data.agenda);
        } catch (err) {
            console.error("AI call processing failed", err);
            toast.error(err.response?.data?.message || "Failed to process call feedback");
        } finally {
            setProcessingFeedback(false);
        }
    };

    const skipPrompt = () => {
        // Simple skip: remove active prompt from local array so user can see next
        if (!briefing || !activePrompt) return;

        const { agenda } = briefing;
        let nextAgenda = { ...agenda };

        if (activePrompt.promptType === "today") {
            nextAgenda.todayFollowUps = nextAgenda.todayFollowUps.filter(i => i.id !== activePrompt.id);
        } else if (activePrompt.promptType === "overdue") {
            nextAgenda.overdueLeads = nextAgenda.overdueLeads.filter(i => i.id !== activePrompt.id);
        } else if (activePrompt.promptType === "quotation") {
            nextAgenda.quotations = nextAgenda.quotations.filter(i => i.id !== activePrompt.id);
        } else if (activePrompt.promptType === "new") {
            nextAgenda.newLeads = nextAgenda.newLeads.filter(i => i.id !== activePrompt.id);
        }

        findNextPrompt(nextAgenda);
        setAiResponse(null);
    };

    return (
        <>
            {/* System On Briefing Slide-in Banner (Alert) */}
            {showBriefingPopup && briefing && (
                <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-slide-in">
                    <div className="bg-gradient-to-r from-indigo-900/90 to-purple-900/90 dark:from-slate-900/95 dark:to-indigo-950/95 backdrop-blur-md text-white p-5 rounded-2xl shadow-2xl border border-indigo-500/30 relative">
                        <button 
                            onClick={() => setShowBriefingPopup(false)} 
                            className="absolute top-3 right-3 text-indigo-200 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                        
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 animate-pulse border border-indigo-500/30">
                                <Bot size={26} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-extrabold text-base flex items-center gap-1.5 text-indigo-300">
                                    <Sparkles size={16} className="text-yellow-400 animate-spin" />
                                    AI CRM Assistant Briefing
                                </h4>
                                <p className="text-sm font-semibold mt-1">
                                    Hello, {userName}! Welcome back.
                                </p>
                                <p className="text-xs text-indigo-200/90 mt-1">
                                    Today you have <span className="font-black text-white bg-indigo-600 px-2 py-0.5 rounded-full">{briefing.summary?.totalActionRequired || 0}</span> urgent leads requiring your attention:
                                </p>
                                
                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-white/5 dark:bg-black/20 p-2 rounded-xl border border-white/5">
                                        <span className="text-indigo-300 font-bold block">Follow-ups Today</span>
                                        <span className="text-base font-black text-white">{briefing.summary?.todayFollowUpsCount || 0}</span>
                                    </div>
                                    <div className="bg-white/5 dark:bg-black/20 p-2 rounded-xl border border-white/5">
                                        <span className="text-indigo-300 font-bold block">Overdue Calls</span>
                                        <span className="text-base font-black text-red-400">{briefing.summary?.overdueLeadsCount || 0}</span>
                                    </div>
                                    <div className="bg-white/5 dark:bg-black/20 p-2 rounded-xl border border-white/5">
                                        <span className="text-indigo-300 font-bold block">New Leads</span>
                                        <span className="text-base font-black text-blue-400">{briefing.summary?.newLeadsCount || 0}</span>
                                    </div>
                                    <div className="bg-white/5 dark:bg-black/20 p-2 rounded-xl border border-white/5">
                                        <span className="text-indigo-300 font-bold block">Quote F/Us</span>
                                        <span className="text-base font-black text-purple-400">{briefing.summary?.quotationFollowUpsCount || 0}</span>
                                    </div>
                                </div>

                                <div className="mt-4 flex gap-2 justify-end">
                                    <button 
                                        onClick={() => {
                                            setShowBriefingPopup(false);
                                            setIsOpen(true);
                                        }} 
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl text-xs flex items-center gap-1 transition-all active:scale-95 shadow-lg shadow-indigo-600/30"
                                    >
                                        Let's Handle Them <ArrowRight size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Collapsed AI Floating Trigger Orb */}
            {!isOpen && (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center shadow-xl shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all group"
                    title="Open AI Assistant"
                >
                    <div className="absolute inset-0 w-full h-full rounded-full bg-purple-500/20 animate-ping group-hover:animate-none"></div>
                    <Bot size={26} className="group-hover:rotate-12 transition-transform" />
                    {briefing?.summary?.totalActionRequired > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-black flex items-center justify-center shadow-md animate-bounce">
                            {briefing.summary.totalActionRequired}
                        </span>
                    )}
                </button>
            )}

            {/* Main AI Assistant Side Panel */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-40 w-96 max-h-[85vh] bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col animate-fade-in">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 text-white px-5 py-4 flex items-center justify-between shadow-md">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white relative">
                                <Bot size={20} />
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-indigo-700 rounded-full animate-pulse"></span>
                            </div>
                            <div>
                                <h3 className="font-black text-sm tracking-wide leading-none">AI CRM Assistant</h3>
                                <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">Lead Tracker Agent</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button 
                                onClick={fetchBriefing} 
                                className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-100 hover:text-white transition-colors"
                                title="Sync Agenda"
                                disabled={loadingBriefing}
                            >
                                <RefreshCw size={16} className={loadingBriefing ? "animate-spin" : ""} />
                            </button>
                            <button 
                                onClick={() => setIsOpen(false)} 
                                className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-100 hover:text-white transition-all duration-200"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[60vh]">
                        {/* Summary Overview */}
                        {briefing && (
                            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100/30 flex justify-between items-center gap-3">
                                <div>
                                    <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest block">Pending Agenda</h4>
                                    <p className="text-sm font-black text-gray-800 dark:text-white mt-0.5">
                                        {briefing.summary?.totalActionRequired || 0} Lead{briefing.summary?.totalActionRequired !== 1 ? "s" : ""} to handle
                                    </p>
                                </div>
                                <div className="text-xs bg-indigo-600 text-white font-extrabold px-3 py-1.5 rounded-xl">
                                    Agent Active
                                </div>
                            </div>
                        )}

                        {/* Overdue/Prompt Cards Section */}
                        {activePrompt ? (
                            <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-150 dark:border-gray-700/50 space-y-3 relative overflow-hidden">
                                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-orange-400 to-indigo-500"></div>
                                <div className="flex justify-between items-start">
                                    <span className="text-[9px] font-black bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        {activePrompt.promptType === "quotation" ? "Proposal F/U" : activePrompt.promptType === "new" ? "New Lead Contact" : "Overdue Callback"}
                                    </span>
                                    <button onClick={skipPrompt} className="text-xs text-gray-400 hover:text-gray-600 font-semibold" title="Skip for now">
                                        Skip
                                    </button>
                                </div>

                                <div className="space-y-1">
                                    <h4 className="font-extrabold text-gray-900 dark:text-white text-base">
                                        {activePrompt.name || activePrompt.clientName}
                                    </h4>
                                    {activePrompt.scheduledDate && (
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1 font-semibold">
                                            <Clock size={10} />
                                            Scheduled: {new Date(activePrompt.scheduledDate).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                                        </p>
                                    )}
                                    {activePrompt.lastRemark && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 italic bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-750 mt-1">
                                            "{activePrompt.lastRemark}"
                                        </p>
                                    )}
                                </div>

                                {/* Prompt Instruction */}
                                <div className="pt-2">
                                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                        <Bot size={14} />
                                        Sir, did you make a call to this client?
                                    </p>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                                    <textarea
                                        required
                                        rows={2}
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        placeholder="Write what happened during the call..."
                                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                    />
                                    <button
                                        type="submit"
                                        disabled={processingFeedback || !feedbackText.trim()}
                                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20"
                                    >
                                        {processingFeedback ? (
                                            <>Updating CRM...</>
                                        ) : (
                                            <>
                                                <Send size={12} /> Save & Update via AI
                                            </>
                                        )}
                                    </button>
                                </form>

                                {/* AI Response Update Card */}
                                {aiResponse && (
                                    <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-xl border border-green-100 dark:border-green-900/30 text-xs space-y-1">
                                        <p className="font-extrabold text-green-700 dark:text-green-300 flex items-center gap-1">
                                            <Check size={12} />
                                            AI Update Logged:
                                        </p>
                                        <p className="text-gray-700 dark:text-gray-300 font-medium">
                                            Logged remark: <span className="italic">"{aiResponse.summary}"</span>
                                        </p>
                                        <p className="text-gray-700 dark:text-gray-300 font-medium">
                                            Status updated to: <span className="font-bold uppercase text-indigo-600 dark:text-indigo-400">{aiResponse.status}</span>
                                        </p>
                                        <p className="text-gray-500 dark:text-gray-400 text-[10px]">
                                            Next check: {new Date(aiResponse.nextFollowUpDate).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-8 text-center bg-gray-50 dark:bg-gray-900/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 space-y-2">
                                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center text-green-600 mx-auto">
                                    <Check size={24} />
                                </div>
                                <h4 className="font-bold text-gray-800 dark:text-white text-sm">All Clean, Sir!</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    No pending callbacks or follow-ups require prompt tracking right now. Awesome work!
                                </p>
                            </div>
                        )}

                        {/* List of today's Agenda */}
                        {briefing && briefing.summary?.totalActionRequired > 0 && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block">
                                    Today's Agenda Items
                                </label>
                                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                                    {/* Today's Follow-ups */}
                                    {briefing.agenda?.todayFollowUps?.map(i => (
                                        <div key={i.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-750 text-xs">
                                            <div className="truncate">
                                                <span className="font-extrabold text-gray-800 dark:text-white block truncate">{i.name}</span>
                                                <span className="text-[10px] font-mono text-indigo-500">{i.leadNumber}</span>
                                            </div>
                                            <span className="text-[9px] font-bold bg-green-50 dark:bg-green-900/20 text-green-600 px-2 py-0.5 rounded-full uppercase">
                                                Due Today
                                            </span>
                                        </div>
                                    ))}
                                    {/* Overdue */}
                                    {briefing.agenda?.overdueLeads?.map(i => (
                                        <div key={i.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-750 text-xs">
                                            <div className="truncate">
                                                <span className="font-extrabold text-gray-800 dark:text-white block truncate">{i.name}</span>
                                                <span className="text-[10px] font-mono text-red-500">{i.leadNumber}</span>
                                            </div>
                                            <span className="text-[9px] font-bold bg-red-50 dark:bg-red-900/20 text-red-500 px-2 py-0.5 rounded-full uppercase">
                                                Overdue
                                            </span>
                                        </div>
                                    ))}
                                    {/* Proposals */}
                                    {briefing.agenda?.quotations?.map(i => (
                                        <div key={i.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-750 text-xs">
                                            <div className="truncate">
                                                <span className="font-extrabold text-gray-800 dark:text-white block truncate">{i.clientName}</span>
                                                <span className="text-[10px] font-mono text-purple-500">{i.quotationNumber}</span>
                                            </div>
                                            <span className="text-[9px] font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-500 px-2 py-0.5 rounded-full uppercase">
                                                Quote Due
                                            </span>
                                        </div>
                                    ))}
                                    {/* New Leads */}
                                    {briefing.agenda?.newLeads?.map(i => (
                                        <div key={i.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-750 text-xs">
                                            <div className="truncate">
                                                <span className="font-extrabold text-gray-800 dark:text-white block truncate">{i.name}</span>
                                                <span className="text-[10px] font-mono text-blue-500">{i.leadNumber}</span>
                                            </div>
                                            <span className="text-[9px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-500 px-2 py-0.5 rounded-full uppercase">
                                                New
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Instructions footer */}
                    <div className="bg-gray-50 dark:bg-gray-900/30 px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1 font-semibold justify-center">
                        <Sparkles size={11} className="text-yellow-500 animate-pulse" />
                        AI updates status, next date & remarks automatically.
                    </div>
                </div>
            )}
        </>
    );
};

export default AIAssistantWidget;
