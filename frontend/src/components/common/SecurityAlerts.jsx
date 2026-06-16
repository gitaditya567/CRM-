import { useEffect } from "react";
import { io } from "socket.io-client";
import toast, { Toaster } from "react-hot-toast";

const SecurityAlerts = () => {
    const role = localStorage.getItem("role")?.toLowerCase();
    const isAdmin = role === "admin" || role === "superadmin";

    const playNotificationSound = (type) => {
        const audio = new Audio(
            type === "login" 
            ? "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3" // Ding sound
            : "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3" // Low pop sound
        );
        audio.play().catch(e => console.log("Sound play blocked by browser policy"));
    };

    useEffect(() => {
        if (!isAdmin) return;

        // Consistent URL logic with api.js (but without the /api suffix)
        const socketUrl = import.meta.env.VITE_API_URL 
            ? import.meta.env.VITE_API_URL.replace(/\/api$/, "")
            : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                ? "http://localhost:5000"
                : (window.location.port === "5173" || window.location.port === "5174"
                    ? `http://${window.location.hostname}:5000`
                    : window.location.origin));

        const socket = io(socketUrl);

        socket.on("connect", () => {
            console.log("Security Monitor Connected");
        });

        socket.on("userAction", (data) => {
            const { action, user } = data;
            const currentUserName = localStorage.getItem("name");

            if (action === "login") {
                playNotificationSound("login");
                toast.success(`🔐 ${user.name} (${user.role}) just logged in!`, {
                    duration: 5000,
                    position: "top-right",
                    style: {
                        background: "#1e293b",
                        color: "#fff",
                        border: "1px solid #334155",
                        fontWeight: "bold"
                    }
                });
            } else if (action === "logout") {
                playNotificationSound("logout");
                toast.error(`🚪 ${user.name} (${user.role}) logged out.`, {
                    duration: 5000,
                    position: "top-right",
                    style: {
                        background: "#1e293b",
                        color: "#fff",
                        border: "1px solid #ef4444",
                        fontWeight: "bold"
                    }
                });
            } else if (action === "delete") {
                toast.error(`🗑️ User Account Deleted: ${user.name}`, {
                    duration: 7000,
                    position: "top-right",
                });
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [isAdmin]);

    return <Toaster />;
};

export default SecurityAlerts;
