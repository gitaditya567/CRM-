const express = require("express");
const router = express.Router();
const { 
  getDashboardStats, 
  getDashboardSummary, 
  getDashboardCharts, 
  getDashboardActivity 
} = require("../controllers/dashboardController");
const { getMasterDashboardData } = require("../controllers/masterDashboardController");
const { protect } = require("../middleware/authMiddleware");

// Protected routes to get dashboard data
router.get("/stats", protect, getDashboardStats); // Legacy support
router.get("/summary", protect, getDashboardSummary);
router.get("/charts", protect, getDashboardCharts);
router.get("/activity", protect, getDashboardActivity);
// Master Dashboard: not for the services role
const notServices = (req, res, next) => (String(req.user?.role || "").toLowerCase() === "services"
    ? res.status(403).json({ message: "Master Dashboard is not available for your role" })
    : next());
router.get("/master", protect, notServices, getMasterDashboardData);

module.exports = router;
