import React from "react";
import { Wallet, Plane, Receipt, Users, BarChart3 } from "lucide-react";

// 💼 Travel & Expenses — module placeholder (features to be built next)
const PLANNED = [
    { icon: Plane, title: "Tours / Trips", text: "Plan each staff tour with dates, cities, purpose and linked client / lead." },
    { icon: Receipt, title: "Expense Entries", text: "Record travel, hotel, food, fuel & other spends with bill photos." },
    { icon: Users, title: "Staff-wise Tracking", text: "See how much each staff member spent, per tour and per month." },
    { icon: BarChart3, title: "Reports & Approvals", text: "Approve / reject claims, track advances and settlements, export reports." },
];

const Expenses = () => (
    <div className="p-6 md:p-8 space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                <Wallet className="text-emerald-500" size={28} />
                Travel & Expenses
                <span className="text-xs font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-full">
                    Coming soon
                </span>
            </h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                Record and track every tour and expense — how much was spent, by which staff, and for what.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLANNED.map(({ icon: Icon, title, text }) => (
                <div key={title} className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-dashed border-gray-200 dark:border-gray-700 flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Icon size={22} />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-gray-800 dark:text-white">{title}</h2>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">{text}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default Expenses;
