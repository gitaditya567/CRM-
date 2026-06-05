const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getLeads, createLead, updateLead, deleteLead, deleteMultipleLeads, getLeadById, addFollowUp } = require("../controllers/leadController");

const router = express.Router();

router.get("/", protect, getLeads);
router.get("/:id", protect, getLeadById);
router.post("/", protect, createLead);
router.put("/:id", protect, updateLead);
router.delete("/:id", protect, deleteLead);
router.post("/bulk-delete", protect, deleteMultipleLeads);
router.post("/:id/followup", protect, addFollowUp);

module.exports = router;
