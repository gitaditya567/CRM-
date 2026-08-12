const express = require("express");
const router = express.Router();
const poController = require("../controllers/poController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, poController.getPOs);
router.post("/create-from-pi/:id", protect, poController.createPOFromPI);
router.post("/outward", protect, poController.createOutwardPO);
router.post("/send-email", protect, poController.sendDispatchEmail);
router.put("/:id", protect, poController.updatePO);
router.get("/:id/pdf", protect, poController.generatePDF);
router.delete("/:id", protect, poController.deletePO);

module.exports = router;
