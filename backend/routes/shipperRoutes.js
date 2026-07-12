const express = require("express");
const router = express.Router();
const shipperController = require("../controllers/shipperController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, shipperController.getShippers);
router.post("/", protect, shipperController.createShipper);

module.exports = router;
