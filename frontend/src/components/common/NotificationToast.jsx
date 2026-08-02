import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, UserCheck, FileText, Users, ShoppingBag, Building, Zap, BellRing, ArrowRight } from "lucide-react";
import { io } from "socket.io-client";
import { API_BASE_URL } from "../../api/api";

const SOCKET_URL = API_BASE_URL.replace("/api", "");

// Play a subtle high-tech chime sound using Web Audio API
const playChimeSound = () => {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12); // A5 note
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
        // AudioContext not permitted yet or unsupported
    }
};

// Send Native OS Browser Notification if tab is in background
const sendNativeNotification = (title, body) => {
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
        try {
            new Notification(title, {
                body,
                icon: "/logo.png",
                silent: false,
            });
        } catch (e) {
            console.warn("Native notification error:", e);
        }
    }
};

const NotificationToast = () => {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        // Request Native Notification Permission for background tab alerts
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        const socket = io(SOCKET_URL, {
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: 5,
        });

        const getCurrentUserRole = () => (localStorage.getItem("role") || "").toLowerCase();
        const getCurrentUserId = () => localStorage.getItem("userId");

        // Helper to check if current user is Admin or Superadmin
        const isAdminUser = () => {
            const role = getCurrentUserRole();
            return role === "admin" || role === "superadmin";
        };

        // 1. Lead Added
        socket.on("leadAdded", (newLead) => {
            const currentUserId = getCurrentUserId();
            if (!currentUserId) return;

            const creatorId = newLead.createdBy?._id || newLead.createdBy;
            const assigneeId = newLead.assignedTo?._id || newLead.assignedTo;
            const isCreator = String(creatorId) === String(currentUserId);
            const isAssignee = String(assigneeId) === String(currentUserId);

            if ((isAdminUser() || isAssignee) && !isCreator) {
                const creatorName = newLead.createdBy?.name || newLead.source || "System";
                const assigneeName = newLead.assignedTo?.name || "Unassigned";

                pushNotification({
                    id: Date.now() + Math.random(),
                    category: "lead",
                    typeTitle: "New Lead Created",
                    title: newLead.name,
                    code: newLead.leadNumber || "N/A",
                    detail1: `Created by: ${creatorName}`,
                    detail2: `Assigned to: ${assigneeName}`,
                    gradient: "from-blue-500 via-indigo-500 to-purple-600",
                    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
                    icon: Users,
                });
            }
        });

        // 2. Lead Status Updated
        socket.on("leadUpdated", (data) => {
            if (!data || !data.name) return;
            const currentUserId = getCurrentUserId();
            if (!currentUserId) return;

            if (isAdminUser()) {
                pushNotification({
                    id: Date.now() + Math.random(),
                    category: "lead_update",
                    typeTitle: "Lead Updated",
                    title: data.name,
                    code: data.leadNumber || "N/A",
                    detail1: `Status: ${data.status || "Updated"}`,
                    detail2: data.assignedTo?.name ? `Assignee: ${data.assignedTo.name}` : null,
                    gradient: "from-amber-500 via-orange-500 to-yellow-500",
                    badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                    icon: Sparkles,
                });
            }
        });

        // 3. Quotation Added
        socket.on("quotationAdded", (newQuote) => {
            if (!newQuote) return;
            const currentUserId = getCurrentUserId();
            if (!currentUserId) return;

            if (isAdminUser()) {
                const clientName = newQuote.lead?.name || newQuote.client?.clientName || "Client Offer";
                const grandTotal = newQuote.grandTotal ? `₹${Number(newQuote.grandTotal).toLocaleString("en-IN")}` : "N/A";

                pushNotification({
                    id: Date.now() + Math.random(),
                    category: "quotation",
                    typeTitle: "New Quotation Issued",
                    title: clientName,
                    code: newQuote.quotationNumber || "N/A",
                    detail1: `Total Value: ${grandTotal}`,
                    detail2: `Created by: ${newQuote.createdBy?.name || "Sales Team"}`,
                    gradient: "from-emerald-500 via-teal-500 to-green-600",
                    badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
                    icon: FileText,
                });
            }
        });

        // 4. Quotation Updated
        socket.on("quotationUpdated", (quote) => {
            if (!quote || !quote.quotationNumber) return;
            if (isAdminUser()) {
                pushNotification({
                    id: Date.now() + Math.random(),
                    category: "quotation_update",
                    typeTitle: "Quotation Updated",
                    title: quote.quotationNumber,
                    code: quote.status || "Updated",
                    detail1: `Status: ${quote.status || "Updated"}`,
                    detail2: quote.grandTotal ? `Amount: ₹${Number(quote.grandTotal).toLocaleString("en-IN")}` : null,
                    gradient: "from-teal-500 via-emerald-400 to-cyan-500",
                    badgeColor: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
                    icon: FileText,
                });
            }
        });

        // 5. Client Added
        socket.on("clientAdded", (client) => {
            if (!client || !client.clientName) return;
            if (isAdminUser()) {
                pushNotification({
                    id: Date.now() + Math.random(),
                    category: "client",
                    typeTitle: "New Client Registered",
                    title: client.clientName,
                    code: client.group?.name || "Client Pool",
                    detail1: `Entity: ${client.legalEntityName || client.clientName}`,
                    detail2: `City: ${client.billingAddress?.city || "N/A"}`,
                    gradient: "from-purple-500 via-fuchsia-500 to-pink-600",
                    badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
                    icon: Building,
                });
            }
        });

        // 6. Purchase Order Added / Updated
        socket.on("poAdded", (po) => {
            if (!po) return;
            if (isAdminUser()) {
                pushNotification({
                    id: Date.now() + Math.random(),
                    category: "po",
                    typeTitle: "New PO Submitted",
                    title: po.vendorName || po.clientName || "PO Order",
                    code: po.poNumber || "N/A",
                    detail1: `Total: ₹${po.grandTotal ? Number(po.grandTotal).toLocaleString("en-IN") : "0"}`,
                    detail2: `Status: ${po.status || "Pending"}`,
                    gradient: "from-rose-500 via-pink-500 to-red-600",
                    badgeColor: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
                    icon: ShoppingBag,
                });
            }
        });

        // 7. Security / User System Action Alert
        socket.on("userAction", (data) => {
            if (!data) return;
            if (isAdminUser()) {
                pushNotification({
                    id: Date.now() + Math.random(),
                    category: "security",
                    typeTitle: "System Security Alert",
                    title: data.type || "User Activity",
                    code: "SEC-LOG",
                    detail1: data.message || "User authentication event",
                    detail2: data.name ? `User: ${data.name}` : null,
                    gradient: "from-cyan-500 via-blue-600 to-indigo-600",
                    badgeColor: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
                    icon: Zap,
                });
            }
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const pushNotification = (item) => {
        playChimeSound();
        sendNativeNotification(item.typeTitle, `${item.title} - ${item.detail1 || ""}`);

        setNotifications((prev) => [item, ...prev].slice(0, 5)); // Keep max 5 side toasts visible

        // Auto dismiss after 7 seconds
        setTimeout(() => {
            removeNotification(item.id);
        }, 7000);
    };

    const removeNotification = (id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    return (
        <div className="fixed top-16 right-5 z-[999999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
            <AnimatePresence>
                {notifications.map((n) => {
                    const IconComponent = n.icon || BellRing;
                    return (
                        <motion.div
                            key={n.id}
                            initial={{ opacity: 0, x: 100, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 80, scale: 0.85, transition: { duration: 0.25 } }}
                            className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 shadow-2xl rounded-2xl p-4 w-full flex items-start gap-3.5 transition-all relative overflow-hidden pointer-events-auto group"
                        >
                            {/* Gradient top bar */}
                            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${n.gradient}`} />

                            {/* Category Icon Badge */}
                            <div className={`p-2.5 rounded-xl shrink-0 mt-1 shadow-sm ${n.badgeColor}`}>
                                <IconComponent size={18} className="animate-pulse" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                                        {n.typeTitle}
                                    </span>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono font-bold bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                        {n.code}
                                    </span>
                                </div>

                                <h4 className="font-extrabold text-gray-900 dark:text-white text-sm truncate mt-1 tracking-tight">
                                    {n.title}
                                </h4>

                                <div className="mt-2.5 space-y-1 border-t border-gray-100 dark:border-gray-800/80 pt-2 text-xs text-gray-600 dark:text-gray-300">
                                    {n.detail1 && (
                                        <div className="flex items-center justify-between font-medium">
                                            <span className="truncate">{n.detail1}</span>
                                        </div>
                                    )}
                                    {n.detail2 && (
                                        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                                            <span className="truncate">{n.detail2}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => removeNotification(n.id)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg mt-0.5"
                                title="Dismiss"
                            >
                                <X size={14} />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export default NotificationToast;
