import React from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { BarChart3, ChevronRight } from "lucide-react";
import { REPORTS, getReportById } from "../config/reports";

const Reports = () => {
  const { reportId } = useParams();

  // Single report view
  if (reportId) {
    const report = getReportById(reportId);
    if (!report) return <Navigate to="/reports" replace />;
    const ReportComponent = report.component;
    return <ReportComponent {...(report.props || {})} />;
  }

  // Reports index
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-3">
          <BarChart3 className="text-blue-500" size={28} />
          Reports
          <span className="text-sm font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-full">
            {REPORTS.length}
          </span>
        </h1>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
          All business reports in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {REPORTS.map((report) => (
          <Link
            key={report.id}
            to={`/reports/${report.id}`}
            className="group bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all flex items-start gap-4"
          >
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 shrink-0">
              <report.icon size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-black text-gray-800 dark:text-white">{report.name}</h2>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">{report.description}</p>
            </div>
            <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500 transition shrink-0 mt-1" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Reports;
