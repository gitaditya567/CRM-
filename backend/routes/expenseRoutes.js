const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const router = express.Router();
const c = require("../controllers/expenseController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// 🧾 Bill / receipt uploads → uploads/expenses (random names, images & PDF only, 5 MB each, max 5)
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "expenses");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];
const uploadBills = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, UPLOAD_DIR),
        filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${path.extname(file.originalname).toLowerCase()}`)
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 5 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED.includes(file.mimetype)) return cb(null, true);
        cb(new Error("Only image (JPG, PNG, WEBP, HEIC) or PDF bills are allowed"));
    }
}).array("bills", 5);

// Turn multer errors into a clean 400
const withBills = (req, res, next) => uploadBills(req, res, (err) => {
    if (!err) return next();
    const message = err.code === "LIMIT_FILE_SIZE" ? "Each bill must be 5 MB or smaller"
        : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE" ? "You can attach up to 5 bills"
        : err.message;
    res.status(400).json({ message });
});

router.get("/meta", protect, c.getMeta);
router.get("/summary", protect, c.getSummary);

// Tours are managed by Admin / SuperAdmin; staff can only view their own (to pick one on an expense)
router.get("/tours", protect, c.listTours);
router.post("/tours", protect, adminOnly, c.createTour);
router.get("/tours/:id", protect, c.getTour);
router.put("/tours/:id", protect, adminOnly, c.updateTour);
router.delete("/tours/:id", protect, adminOnly, c.deleteTour);

router.post("/bulk-status", protect, adminOnly, c.bulkStatus);
router.get("/", protect, c.listExpenses);
router.post("/", protect, withBills, c.createExpense);
router.put("/:id", protect, withBills, c.updateExpense);
router.delete("/:id", protect, c.deleteExpense);
router.post("/:id/submit", protect, c.submitDraft);
router.patch("/:id/status", protect, adminOnly, c.updateStatus);

module.exports = router;
