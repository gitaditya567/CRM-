import React from 'react';

const Skeleton = ({ type = 'table', count = 5 }) => {
    if (type === 'card') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                {[...Array(count)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'table') {
        return (
            <div className="w-full animate-pulse">
                <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded mb-4"></div>
                {[...Array(count)].map((_, i) => (
                    <div key={i} className="flex gap-4 mb-3">
                        <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded flex-1"></div>
                        <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded flex-1"></div>
                        <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded flex-1"></div>
                        <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded flex-1"></div>
                        <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded w-24"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'form') {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mt-6"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full mt-4"></div>
            </div>
        );
    }

    return (
        <div className="animate-pulse">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
    );
};

export default Skeleton;
