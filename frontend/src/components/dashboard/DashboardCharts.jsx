import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { motion } from "framer-motion";

const transformData = (data) => {
    return data.map(item => ({
        name: item.name,
        value: item.leads || item.sales || item.products
    }));
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#8b5cf6", "#ec4899"];

const STATUS_COLORS = {
    "draft": "#64748b",      // Slate gray for Draft
    "sent": "#3b82f6",       // Professional Blue for Sent
    "accepted": "#10b981",   // Emerald Green for Accepted
    "won": "#10b981",        // Emerald Green for Won
    "rejected": "#ef4444",   // Crimson Red for Rejected
    "lost": "#ef4444",       // Crimson Red for Lost
    "expired": "#f59e0b",    // Amber/Gold for Expired
};

const getStatusColor = (name, index) => {
    const key = String(name || "").toLowerCase().trim();
    return STATUS_COLORS[key] || COLORS[index % COLORS.length];
};

// Premium Custom Tooltip Component for Donut Chart
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-gray-900/95 dark:bg-gray-950/95 text-white px-4 py-3 rounded-xl border border-gray-800 shadow-2xl space-y-1.5 text-xs font-semibold backdrop-blur-md">
                <p className="text-gray-400 uppercase tracking-wider text-[9px] font-bold">{data.name}</p>
                <div className="flex justify-between gap-6 border-b border-gray-800 pb-1.5">
                    <span className="text-gray-300">Total Count:</span>
                    <span className="text-teal-400 font-bold">{data.value} {data.value === 1 ? "Quote" : "Quotes"}</span>
                </div>
                <div className="flex justify-between gap-6 pt-0.5">
                    <span className="text-gray-300">Total Value:</span>
                    <span className="text-blue-400 font-bold">₹{data.amount?.toLocaleString() || 0}</span>
                </div>
            </div>
        );
    }
    return null;
};

const DashboardCharts = ({ leadData, salesData }) => {
    // Calculate conversion rate dynamically (Won/Accepted vs Total)
    const totalQuotes = salesData ? salesData.reduce((acc, curr) => acc + curr.value, 0) : 0;
    const wonQuotes = salesData ? salesData.filter(item => {
        const name = String(item.name || "").toLowerCase().trim();
        return name === "won" || name === "accepted";
    }).reduce((acc, curr) => acc + curr.value, 0) : 0;
    const conversionRate = totalQuotes > 0 ? Math.round((wonQuotes / totalQuotes) * 100) : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Leads Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
            >
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Lead Trends</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={leadData || []}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', color: '#fff', borderRadius: '8px', border: 'none' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="leads" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Quotation Pipeline Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col"
            >
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Quotation Pipeline</h3>
                <div className="h-[300px] w-full flex items-center justify-center relative">
                    {(!salesData || salesData.length === 0) ? (
                        <div className="text-gray-400 italic text-sm">No pipeline data available</div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={salesData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {salesData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={getStatusColor(entry.name, index)} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        height={36}
                                        iconType="circle"
                                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none flex flex-col items-center justify-center">
                                <span className="block text-2xl font-black text-gray-900 dark:text-white leading-none">{conversionRate}%</span>
                                <span className="block text-[8px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider mt-1.5">Won Rate</span>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default DashboardCharts;
