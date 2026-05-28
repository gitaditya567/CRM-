import React from "react";
import { format } from "date-fns";
import { UserCheck, FileText, ShoppingBag, Clock } from "lucide-react";

const getIcon = (type) => {
    switch (type) {
        case 'lead': return <UserCheck className="w-5 h-5 text-blue-500" />;
        case 'quotation': return <FileText className="w-5 h-5 text-green-500" />;
        case 'product': return <ShoppingBag className="w-5 h-5 text-purple-500" />;
        default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
};

const RecentActivity = ({ activities }) => {
    const handleItemClick = (item) => {
        if (item.type === 'lead' && item._id) {
            window.location.href = `/leads?action=view&id=${item._id}`;
        } else if (item.type === 'quotation') {
            window.location.href = `/leads?tab=quotations`;
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Recent Activity</h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6" style={{ maxHeight: "400px" }}>
                {activities.length > 0 ? (
                    activities.map((item, index) => (
                        <div 
                            key={index} 
                            onClick={() => handleItemClick(item)}
                            className="flex items-start cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 p-2 -mx-2 rounded-xl transition-all hover:translate-x-1 group"
                            title="Click to view details"
                        >
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 dark:bg-gray-700 mr-4 group-hover:scale-110 transition-transform`}>
                                {getIcon(item.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {item.title}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                    {item.description}
                                </p>
                            </div>
                            <div className="inline-flex items-center text-xs font-semibold text-gray-400 dark:text-gray-500 ml-2">
                                {item.createdAt ? format(new Date(item.createdAt), "MMM d, h:mm a") : "Just now"}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 text-center py-4">No recent activity found.</p>
                )}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button className="w-full py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors">
                    View All Activity
                </button>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #334155;
                }
            `}} />
        </div>
    );
};

export default RecentActivity;
