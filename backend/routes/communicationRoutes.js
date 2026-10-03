const express = require("express");
const router = express.Router();
const communicationController = require("../controllers/communicationController");
const { protect } = require("../middleware/authMiddleware");

// Meta WhatsApp webhook — public (Meta calls it), secured by verify token + signature
router.get("/whatsapp/webhook", communicationController.verifyWebhook);
router.post("/whatsapp/webhook", communicationController.receiveWebhook);

router.get("/whatsapp/config", protect, communicationController.getWhatsAppConfig);
router.get("/settings", protect, communicationController.getSettings);
router.put("/settings", protect, communicationController.updateSettings);
router.post("/whatsapp/send", protect, communicationController.sendWhatsApp);
router.post("/email/send", protect, communicationController.sendEmail);
router.get("/latest", protect, communicationController.getLatestStatuses);
router.get("/po/:poId", protect, communicationController.getPOLogs);
router.post("/:logId/retry", protect, communicationController.retry);

module.exports = router;
