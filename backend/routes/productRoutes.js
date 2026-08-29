const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const multer = require("multer");
const { 
  uploadProducts, 
  searchProduct, 
  getUploadHistory, 
  deleteUploadHistory, 
  createProduct, 
  getRecentProducts, 
  deleteProduct, 
  getProductMeta, 
  deleteBrand, 
  getProductById, 
  updateProduct, 
  getAllProducts,
  addStockToProduct,
  getProductLiveStock,
  getProductLedger
} = require("../controllers/productController");

const router = express.Router();

// Memory storage is standard for Vercel/Serverless and simple uploads
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/products (All Products)
router.get("/", protect, getAllProducts);

// POST /api/products/upload
router.post("/upload", protect, upload.single("file"), uploadProducts);

// POST /api/products/create (Single Product)
router.post("/create", protect, createProduct);

// GET /api/products/recent (Recent Products List)
router.get("/recent", protect, getRecentProducts);

// GET /api/products/meta (Brands & Currencies)
router.get("/meta", protect, getProductMeta);

// GET /api/products/history (Upload History)
router.get("/history", protect, getUploadHistory);

// DELETE /api/products/history/:id (Delete Upload History)
router.delete("/history/:id", protect, deleteUploadHistory);

// POST /api/products/:id/add-stock (Add Stock & Record in Ledger)
router.post("/:id/add-stock", protect, addStockToProduct);

// GET /api/products/:id/live-stock (Get Live Stock Metrics)
router.get("/:id/live-stock", protect, getProductLiveStock);

// GET /api/products/:id/ledger (Get Product Stock Ledger)
router.get("/:id/ledger", protect, getProductLedger);

// GET /api/products/:id (Get Single Product)
router.get("/:id", protect, getProductById);

// PUT /api/products/:id (Update Single Product)
router.put("/:id", protect, updateProduct);

// DELETE /api/products/:id (Delete Single Product)
router.delete("/:id", protect, deleteProduct);

// DELETE /api/products/brand/:brandName (Delete Brand)
router.delete("/brand/:brandName", protect, deleteBrand);

// GET /api/products/search/:productNo
router.get("/search/:productNo", protect, searchProduct);

module.exports = router;

