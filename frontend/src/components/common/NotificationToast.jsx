import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, UserCheck } from "lucide-react";
import { io } from "socket.io-client";

import { API_BASE_URL } from "../../api/api";

const SOCKET_URL = API_BASE_URL.replace("/api", "");

const NotificationToast = () => {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const socket = io(SOCKET_URL, {
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: 5,
        });

        socket.on("leadAdded", (newLead) => {
            const currentUserId = localStorage.getItem("userId");
            const currentUserRole = localStorage.getItem("role")?.toLowerCase();

            if (!currentUserId) return;

            const isAdmin = currentUserRole === "admin" || currentUserRole === "superadmin";

            // Extract IDs safely in case they are objects or strings
            const creatorId = newLead.createdBy?._id || newLead.createdBy;
            const assigneeId = newLead.assignedTo?._id || newLead.assignedTo;

            const isCreator = String(creatorId) === String(currentUserId);
            const isAssignee = String(assigneeId) === String(currentUserId);

            // Trigger notification if:
            // 1. Current user is Admin/Superadmin OR the assigned person
            // 2. Current user is NOT the creator of the lead
            if ((isAdmin || isAssignee) && !isCreator) {
                const creatorName = newLead.createdBy?.name || newLead.source || "System";
                const assigneeName = newLead.assignedTo?.name || "Unassigned";

                addNotification({
                    id: Date.now() + Math.random(),
                    title: "New Lead Created",
                    leadName: newLead.name,
                    leadNumber: newLead.leadNumber || "N/A",
                    createdBy: creatorName,
                    assignedTo: assigneeName,
                });
            }
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const addNotification = (notification) => {
        setNotifications((prev) => [...prev, notification]);

        // Auto remove after 7 seconds for complex notifications to give sufficient reading time
        setTimeout(() => {
            removeNotification(notification.id);
        }, 7000);
    };

    const removeNotification = (id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
            <AnimatePresence>
                {notifications.map((n) => (
                    <motion.div
                        key={n.id}
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                        className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-teal-500/30 dark:border-teal-500/20 shadow-2xl rounded-2xl p-4 w-full flex items-start gap-3.5 transition-all relative overflow-hidden pointer-events-auto"
                    >
                        {/* Elegant gradient top accent bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-emerald-400 to-blue-500" />
                        
                        <div className="bg-teal-100 dark:bg-teal-900/40 p-2.5 rounded-xl text-teal-600 dark:text-teal-400 shrink-0 mt-1">
                            <Sparkles size={18} className="animate-pulse" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
                                    {n.title}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                                    {n.leadNumber}
                                </span>
                            </div>
                            
                            <h4 className="font-extrabold text-gray-900 dark:text-white text-base truncate mt-1">
                                {n.leadName}
                            </h4>
                            
                            <div className="mt-3 space-y-1.5 border-t border-gray-100 dark:border-gray-800/80 pt-2.5 text-xs text-gray-600 dark:text-gray-300">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 dark:text-gray-500">Created by:</span>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800/50 px-2 py-0.5 rounded">
                                        {n.createdBy}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 dark:text-gray-500">Assigned to:</span>
                                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded flex items-center gap-1">
                                        <UserCheck size={11} />
                                        {n.assignedTo}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <button
                            onClick={() => removeNotification(n.id)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg mt-0.5"
                        >
                            <X size={14} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default NotificationToast;
