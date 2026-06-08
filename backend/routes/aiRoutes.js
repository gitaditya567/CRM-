const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getDailyBriefing, processCallFeedback } = require("../controllers/aiController");

const router = express.Router();

router.get("/briefing", protect, getDailyBriefing);
router.post("/process-call", protect, processCallFeedback);

module.exports = router;
