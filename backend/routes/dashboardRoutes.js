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
router.get("/master", protect, getMasterDashboardData);

module.exports = router;
