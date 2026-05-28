import { createContext, useContext, useState, useEffect } from "react";
import API from "../api/api";

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const [uiSettings, setUiSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem("token");
            const role = localStorage.getItem("role");

            if (token && role !== "admin") {
                // Fetch latest user data from server (real-time)
                const meRes = await API.get("/auth/me");
                if (meRes.data.uiSettings) {
                    setUiSettings(meRes.data.uiSettings);
                    return;
                }
            }

            // Fallback to global settings if no user specific ones or if admin
            const res = await API.get("/settings/ui");
            setUiSettings(res.data);
        } catch (err) {
            console.error("Failed to fetch UI settings", err);
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async (newSettings, userId = null) => {
        try {
            if (userId) {
                // Update specific user's settings on backend
                await API.put(`/auth/staff/${userId}`, { uiSettings: newSettings });
                return true;
            } else {
                // Update global settings
                const res = await API.put("/settings/ui", newSettings);
                setUiSettings(res.data);
                return true;
            }
        } catch (err) {
            console.error("Failed to update UI settings", err);
            return false;
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    return (
        <SettingsContext.Provider value={{ uiSettings, loading, refreshSettings: fetchSettings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
