import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

const SecurityShield = () => {
    const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);

    useEffect(() => {
        // 1. Disable Right-Click Context Menu
        const handleContextMenu = (e) => {
            e.preventDefault();
            toast.error("Right-click is disabled for security reasons.", {
                id: "security-contextmenu",
                duration: 2000,
                position: "bottom-center",
                style: { background: "#1e293b", color: "#f87171", border: "1px solid #ef4444", fontWeight: "bold" }
            });
            return false;
        };

        // 2. Disable DevTools & View Source Keyboard Shortcuts
        const handleKeyDown = (e) => {
            const isF12 = e.keyCode === 123 || e.key === "F12";
            const isCtrlShiftI = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i" || e.keyCode === 73);
            const isCtrlShiftJ = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "J" || e.key === "j" || e.keyCode === 74);
            const isCtrlShiftC = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "C" || e.key === "c" || e.keyCode === 67);
            const isCtrlU = (e.ctrlKey || e.metaKey) && (e.key === "U" || e.key === "u" || e.keyCode === 85);
            const isCtrlS = (e.ctrlKey || e.metaKey) && (e.key === "S" || e.key === "s" || e.keyCode === 83);

            if (isF12 || isCtrlShiftI || isCtrlShiftJ || isCtrlShiftC || isCtrlU || isCtrlS) {
                e.preventDefault();
                e.stopPropagation();
                toast.error("Developer inspection shortcuts are disabled.", {
                    id: "security-shortcut",
                    duration: 2500,
                    position: "bottom-center",
                    style: { background: "#1e293b", color: "#f87171", border: "1px solid #ef4444", fontWeight: "bold" }
                });
                return false;
            }
        };

        // 3. DevTools Detection via Dimension Threshold
        let checkTimer;
        const checkDevTools = () => {
            const widthThreshold = window.outerWidth - window.innerWidth > 180;
            const heightThreshold = window.outerHeight - window.innerHeight > 180;

            if (widthThreshold || heightThreshold) {
                if (!isDevToolsOpen) {
                    setIsDevToolsOpen(true);
                }
            } else {
                if (isDevToolsOpen) {
                    setIsDevToolsOpen(false);
                }
            }
        };

        // 4. Override Console in production to prevent memory leakage
        if (import.meta.env.PROD) {
            try {
                console.log("%cSTOP!", "color: red; font-size: 36px; font-weight: bold;");
                console.log("%cSecurity monitoring is active on TeamInspire CRM.", "font-size: 13px; font-weight: bold; color: #3b82f6;");
                console.log = () => {};
                console.info = () => {};
                console.debug = () => {};
            } catch (err) {
                // Ignore
            }
        }

        window.addEventListener("contextmenu", handleContextMenu);
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("resize", checkDevTools);
        checkTimer = setInterval(checkDevTools, 2000);

        return () => {
            window.removeEventListener("contextmenu", handleContextMenu);
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("resize", checkDevTools);
            if (checkTimer) clearInterval(checkTimer);
        };
    }, [isDevToolsOpen]);

    if (!isDevToolsOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999999] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center text-white animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-red-600/20 border border-red-500/40 flex items-center justify-center mb-6 text-red-500 animate-pulse">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white mb-2">Security Protection Active</h2>
            <p className="text-gray-400 max-w-md text-sm font-medium leading-relaxed mb-6">
                Developer tools inspection and element modification are restricted on TeamInspire CRM to protect corporate data.
            </p>
            <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-all text-xs uppercase tracking-wider"
            >
                Reload Secured Workspace
            </button>
        </div>
    );
};

export default SecurityShield;
