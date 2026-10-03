const express = require("express");
const router = express.Router();
const poController = require("../controllers/poController");
const communicationController = require("../controllers/communicationController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, poController.getPOs);
router.post("/create-from-pi/:id", protect, poController.createPOFromPI);
router.post("/outward", protect, poController.createOutwardPO);
router.post("/send-email", protect, communicationController.sendEmail); // logs status in CommunicationLog
router.put("/:id", protect, poController.updatePO);
router.patch("/:id/star", protect, poController.updatePOStar);
router.get("/:id/pdf", protect, poController.generatePDF);
router.delete("/:id", protect, poController.deletePO);

module.exports = router;
