import React from "react";
import { MoveUpRight, MoveDownRight } from "lucide-react";
import { motion } from "framer-motion";

const StatsCard = ({ title, value, icon: Icon, trend, color, trendValue, onClick }) => {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            onClick={onClick}
            className={`relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-lg border border-gray-100 dark:border-gray-700 ${onClick ? 'cursor-pointer hover:border-blue-500/30 dark:hover:border-blue-500/30' : ''}`}
        >
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</h3>
                </div>
                <div className={`p-3 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>

            <div className="mt-4 flex items-center text-sm">
                {trend === "up" ? (
                    <span className="flex items-center text-green-500 font-medium">
                        <MoveUpRight className="w-4 h-4 mr-1" />
                        {trendValue}%
                    </span>
                ) : trend === "down" ? (
                    <span className="flex items-center text-red-500 font-medium">
                        <MoveDownRight className="w-4 h-4 mr-1" />
                        {trendValue}%
                    </span>
                ) : (
                    <span className="text-gray-400">No change</span>
                )}
                <span className="ml-2 text-gray-400 dark:text-gray-500">vs last month</span>
            </div>

            {/* Decorative gradient blob */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 bg-${color}-500/10 rounded-full blur-2xl pointer-events-none`} />
        </motion.div>
    );
};

export default StatsCard;
