import { lazy } from "react";
import { History } from "lucide-react";

const POManagement = lazy(() => import("../pages/POManagement"));

// 📊 Report Registry
// Naya report add karna ho to bas is list me ek entry add karo —
// Sidebar ka "Reports" section aur /reports page dono automatically update ho jayenge.
export const REPORTS = [
  {
    id: "completed-history",
    name: "Completed History",
    description: "Fully completed & dispatched Inward / Outward POs with dispatch history and CSV export.",
    icon: History,
    component: POManagement,
    props: { reportTab: "completed" },
  },
];

export const getReportById = (id) => REPORTS.find((r) => r.id === id);
