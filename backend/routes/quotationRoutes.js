const express = require("express");
const router = express.Router();
const quotationController = require("../controllers/quotationController");
const auth = require("../middleware/authMiddleware"); // Assuming auth middleware exists

router.get("/", auth.protect, quotationController.getQuotations);
router.post("/", auth.protect, quotationController.createQuotation);
router.get("/:id/pdf", auth.protect, quotationController.generatePDF);
router.put("/:id", auth.protect, quotationController.updateQuotation);
router.delete("/:id", auth.protect, quotationController.deleteQuotation);
router.post("/:id/followup", auth.protect, quotationController.addFollowUp);

module.exports = router;
