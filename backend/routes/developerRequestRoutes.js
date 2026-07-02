const express = require("express");
const router = express.Router();
const devController = require("../controllers/developerRequestController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// All routes require authentication and admin/superadmin role
router.use(protect);
router.use(adminOnly);

router.get("/", devController.getRequests);
router.post("/", devController.createRequest);
router.put("/:id", devController.updateRequest);
router.delete("/:id", devController.deleteRequest);

module.exports = router;
