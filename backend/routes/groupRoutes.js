const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getGroups, createGroup, deleteGroup, updateGroup } = require("../controllers/groupController");

const router = express.Router();

router.get("/", protect, getGroups);
router.post("/", protect, createGroup);
router.put("/:id", protect, updateGroup);
router.delete("/:id", protect, deleteGroup);

module.exports = router;
