const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getMessages, sendMessage, getConversations, deleteMessage } = require("../controllers/messageController");
const upload = require("../middleware/upload");

const router = express.Router();

router.get("/conversations", protect, getConversations);
router.post("/upload", protect, upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype
    });
  } catch (err) {
    console.error("File upload error:", err);
    res.status(500).json({ message: "File upload failed" });
  }
});
router.get("/:otherUserId", protect, getMessages);
router.post("/", protect, sendMessage);
router.delete("/:messageId", protect, deleteMessage);

module.exports = router;
