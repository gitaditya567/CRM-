import React from 'react';
import { Clock } from 'lucide-react';

const ClientSupport = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-6 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center max-w-lg border border-gray-100 dark:border-gray-700">
                <div className="flex justify-center mb-6">
                    <Clock size={64} className="text-blue-500 animate-pulse" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Client Support Management</h1>
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-8">
                    We are currently building this module. New support tools and client management features will be available here soon.
                </p>
                <div className="inline-block bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-bold px-6 py-2 rounded-full uppercase tracking-wider text-sm border border-blue-100 dark:border-blue-800">
                    Coming Soon
                </div>
            </div>
        </div>
    );
};

export default ClientSupport;
