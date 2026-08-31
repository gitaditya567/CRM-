const XLSX = require("xlsx");
const Product = require("../models/Product");
const User = require("../models/User");
const UploadHistory = require("../models/UploadHistory");
const StockLedger = require("../models/StockLedger");
const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");
const { getCache, setCache, clearCachePrefix } = require("../utils/cache");

/* ========= UPLOAD EXCEL ========= */
exports.uploadProducts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    let workbook;
    if (req.file.buffer) {
      workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    } else if (req.file.path) {
      workbook = XLSX.readFile(req.file.path);
    } else {
      return res.status(400).json({ message: "File data missing" });
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const errors = [];

    // Process in smaller chunks if needed, but for now let's just make it more efficient
    const bulkOps = rows.map((row, i) => {
      const pNo = String(row.productNo || row["Code"] || row["part Code"] || row["Part Code"] || row["part code"] || row["Part code"] || row["Material Code"] || row["Part No"] || "");

      if (!pNo || pNo === "undefined") {
        errors.push({
          row: i + 2,
          error: `Missing Code/ProductNo`
        });
        return null;
      }

      return {
        updateOne: {
          filter: { productNo: pNo, brand: row.brand || row["Brand"] || "" },
          update: {
            $set: {
              name: row.name || row["Part Name"] || row["Equipment Name"] || row.description || row["Part Discription"] || row["Part Description"] || "",
              description: row.description || row["Part Discription"] || row["Part Description"] || "",
              brand: row.brand || row["Brand"] || "",
              currency: row.currency || row["Currency"] || "USD",
              priceUSD: Number(row.priceUSD || row["Amount(USD)"] || row["Amount (USD)"] || row["USD"] || row["Price(USD)"] || row["Price (USD)"] || row["price (USD)"] || 0),
              dealerPriceINR: Number(row.dealerPriceINR || row["Dealer Price (INR)"] || row["Dealer Price(INR)"] || row["Dealer Price"] || 0),
              retailPriceINR: Number(row.retailPriceINR || row["Retail Price (INR)"] || row["Retail Price(INR)"] || row["Retail Price"] || 0),
              quantity: Number(row.quantity || 0),
              updatedAt: new Date()
            },
            $setOnInsert: {
              createdAt: new Date()
            }
          },
          upsert: true
        }
      };
    }).filter(op => op !== null);

    if (bulkOps.length > 0) {
      try {
        const result = await Product.bulkWrite(bulkOps);
        console.log("Bulk write result:", result);
      } catch (err) {
        console.error("Bulk write error:", err);
        return res.status(500).json({ message: "Bulk update failed", error: err.message });
      }
    }

    const totalCount = await Product.countDocuments();
    console.log(`DEBUG: Upload finished. Total products in DB: ${totalCount}`);

    // Save history
    if (req.user) {
      await UploadHistory.create({
        fileName: req.file.originalname,
        uploadedBy: req.user.id,
        fileSize: (req.file.size / 1024).toFixed(2) + " KB",
        recordCount: rows.length
      });
    }

    clearCachePrefix("product_");
    clearCachePrefix("dashboard_");

    res.json({ message: "Upload completed", errors, totalCount });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ message: "Upload failed" });
  }
};

exports.searchProduct = async (req, res) => {
  try {
    const query = (req.params.productNo || "").trim();
    if (!query) {
      return res.status(400).json({ message: "Search query required" });
    }

    console.log(`DEBUG: Searching for '${query}'`);

    // Escape special regex characters
    const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    const regex = new RegExp(escapeRegex(query), "i"); // Partial match

    const products = await Product.find({
      $or: [
        { productNo: regex },
        { name: regex },
        { description: regex },
        { brand: regex }
      ]
    }).limit(50).lean();

    if (!products || products.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    let results = products;

    // Results are already limited to relevant search fields by default. 
    // We only apply strict filtering for non-admin/non-sales roles if necessary.
    // For this organization, Sales should see full data like Admin.
    
    res.json(results);
  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ message: "Search failed" });
  }
};

exports.getUploadHistory = async (req, res) => {
  try {
    const history = await UploadHistory.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("uploadedBy", "name email")
      .lean();
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: "Error fetching history" });
  }
};

exports.deleteUploadHistory = async (req, res) => {
  try {
    await UploadHistory.findByIdAndDelete(req.params.id);
    res.json({ message: "History deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete history" });
  }
};

/* ========= CREATE SINGLE PRODUCT ========= */
exports.createProduct = async (req, res) => {
  try {
    const {
      type,
      productNo,
      name,
      description,
      brand,
      hsnCode,
      uom,
      currency,
      priceUSD,
      dealerPriceINR,
      retailPriceINR
    } = req.body;

    if (!productNo || !name) {
      return res.status(400).json({ message: "Product Code/Model Code and Name are required" });
    }

    const newProduct = new Product({
      type,
      productNo,
      name,
      description: description || "",
      brand,
      hsnCode,
      uom: uom || "PCS",
      currency,
      priceUSD: Number(priceUSD) || 0,
      dealerPriceINR: Number(dealerPriceINR) || 0,
      retailPriceINR: Number(retailPriceINR) || 0,
      quantity: 0
    });

    await newProduct.save();
    clearCachePrefix("product_");
    clearCachePrefix("dashboard_");
    res.status(201).json({ message: "Product created successfully", product: newProduct });
  } catch (err) {
    // MongoDB duplicate key error (brand + productNo combo already exists)
    if (err.code === 11000) {
      const { brand, productNo } = req.body;
      return res.status(400).json({
        message: `Product with code '${productNo}' already exists for brand '${brand || "this brand"}'`
      });
    }
    console.error("Create Product Error:", err);
    res.status(500).json({ message: "Failed to create product", error: err.message });
  }
};

/* ========= GET RECENT PRODUCTS ========= */
exports.getRecentProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;
    const { search, brand, type } = req.query;

    const filter = {};

    if (type && type !== "All") {
      filter.type = type;
    }

    if (brand && brand !== "All") {
      filter.brand = brand;
    }

    if (search && search.trim()) {
      const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const regex = new RegExp(escapeRegex(search.trim()), "i");
      filter.$or = [
        { productNo: regex },
        { name: regex },
        { description: regex },
        { brand: regex }
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter)
    ]);

    res.json({
      products,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error("Fetch Recent Products Error:", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

/* ========= DELETE PRODUCT ========= */
exports.deleteProduct = async (req, res) => {
  try {

    const { id } = req.params;
    const deleted = await Product.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Product not found" });
    }

    clearCachePrefix("product_");
    clearCachePrefix("dashboard_");
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Delete Product Error:", err);
    res.status(500).json({ message: "Failed to delete product" });
  }
};

/* ========= GET PRODUCT META (BRANDS & CURRENCIES) ========= */
exports.getProductMeta = async (req, res) => {
  try {
    const cacheKey = "product_meta";
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const results = await Product.aggregate([
      {
        $facet: {
          brands: [
            { $match: { brand: { $ne: "" } } },
            { $group: { _id: "$brand" } },
            { $sort: { _id: 1 } }
          ],
          currencies: [
            { $match: { currency: { $ne: "" } } },
            { $group: { _id: "$currency" } },
            { $sort: { _id: 1 } }
          ]
        }
      }
    ]);

    const data = results[0];
    const responseData = {
      brands: data.brands.map(b => b._id),
      currencies: data.currencies.map(c => c._id)
    };

    setCache(cacheKey, responseData, 3600000); // Cache for 1 hour
    res.json(responseData);
  } catch (err) {
    console.error("Get Product Meta Error:", err);
    res.status(500).json({ message: "Failed to fetch product meta data" });
  }
};

/* ========= DELETE BRAND ========= */
exports.deleteBrand = async (req, res) => {
  try {
    const { brandName } = req.params;

    if (!brandName) {
      return res.status(400).json({ message: "Brand name is required" });
    }

    // Update all products with this brand to have an empty brand
    const result = await Product.updateMany(
      { brand: brandName },
      { $set: { brand: "" } }
    );

    clearCachePrefix("product_");
    clearCachePrefix("dashboard_");

    res.json({
      message: `Brand '${brandName}' deleted successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error("Delete Brand Error:", err);
    res.status(500).json({ message: "Failed to delete brand" });
  }
};

/* ========= GET PRODUCT BY ID ========= */
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    console.error("Get Product By ID Error:", err);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

/* ========= UPDATE PRODUCT ========= */
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const product = await Product.findByIdAndUpdate(id, updates, { new: true });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    clearCachePrefix("product_");
    clearCachePrefix("dashboard_");
    res.json({ message: "Product updated successfully", product });
  } catch (err) {
    console.error("Update Product Error:", err);
    res.status(500).json({ message: "Failed to update product" });
  }
};

/* ========= GET ALL PRODUCTS ========= */
exports.getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100; // Limit to 100 max for performance
    const skip = (page - 1) * limit;

    const products = await Product.find()
      .select("name productNo dealerPriceINR retailPriceINR brand description hsnCode uom gstRate")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments();
    res.json({ products, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Get All Products Error:", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

/* ========= ADD STOCK TO PRODUCT (STOCK IN WITH LEDGER) ========= */
exports.addStockToProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { piNo, invoiceNo, date, quantity, unitPrice, supplier, remarks } = req.body;

    const numQty = Number(quantity);
    if (!numQty || numQty <= 0) {
      return res.status(400).json({ message: "A valid positive quantity is required" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Atomically increment product quantity
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $inc: { quantity: numQty } },
      { new: true }
    );

    // Create Stock Ledger Entry
    const ledgerEntry = new StockLedger({
      product: updatedProduct._id,
      productNo: updatedProduct.productNo,
      brand: updatedProduct.brand || "",
      entryType: "IN",
      piNo: (piNo || "").trim(),
      invoiceNo: (invoiceNo || "").trim(),
      date: date ? new Date(date) : new Date(),
      quantity: numQty,
      unitPrice: Number(unitPrice) || 0,
      balanceAfter: updatedProduct.quantity,
      supplier: (supplier || "").trim(),
      remarks: (remarks || "").trim(),
      createdBy: req.user ? req.user.id : null,
    });

    await ledgerEntry.save();

    clearCachePrefix("product_");
    clearCachePrefix("dashboard_");

    res.status(201).json({
      message: "Stock added successfully!",
      product: updatedProduct,
      ledgerEntry
    });
  } catch (err) {
    console.error("Add Stock Error:", err);
    res.status(500).json({ message: "Failed to add stock", error: err.message });
  }
};

/* ========= GET LIVE STOCK METRICS ========= */
exports.getProductLiveStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { brand, name, productNo } = req.query;
    let product;

    // Check if passed parameter is ObjectId
    if (id && id !== "by-query" && id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id).lean();
    }
    
    // Check by productNo route parameter
    if (!product && id && id !== "by-query") {
      const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      product = await Product.findOne({ productNo: new RegExp(`^${escapeRegex(id)}$`, "i") }).lean();
    }

    // Check by brand + productNo / name query params if provided
    if (!product && (productNo || name || brand)) {
      const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const conditions = [];

      if (brand) {
        conditions.push({ brand: new RegExp(`^${escapeRegex(brand.trim())}$`, "i") });
      }

      if (productNo && name) {
        conditions.push({
          $or: [
            { productNo: new RegExp(`^${escapeRegex(productNo.trim())}$`, "i") },
            { name: new RegExp(`^${escapeRegex(name.trim())}$`, "i") }
          ]
        });
      } else if (productNo) {
        conditions.push({ productNo: new RegExp(`^${escapeRegex(productNo.trim())}$`, "i") });
      } else if (name) {
        conditions.push({ name: new RegExp(`^${escapeRegex(name.trim())}$`, "i") });
      }

      if (conditions.length > 0) {
        product = await Product.findOne({ $and: conditions }).lean();
      }
    }

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const pNo = product.productNo;
    const onHand = Number(product.quantity) || 0;

    // Reserved stock in confirmed POs (converted from PI or created as Outward POs) not yet fully dispatched
    const activeConfirmedPOs = await PurchaseOrder.find({
      status: { $nin: ["Dispatched", "Completed", "Cancelled"] },
      $or: [
        { "products.product": product._id },
        { "products.productNo": pNo }
      ]
    }).select("products status type pi").lean();

    let reserved = 0;
    activeConfirmedPOs.forEach(po => {
      (po.products || []).forEach(item => {
        const matches = (item.product && String(item.product) === String(product._id)) ||
                        (item.productNo && item.productNo.trim().toLowerCase() === pNo.trim().toLowerCase());
        if (matches) {
          const itemQty = Number(item.quantity) || 0;
          const dispatched = Number(item.dispatchedQuantity) || 0;
          reserved += Math.max(0, itemQty - dispatched);
        }
      });
    });

    // Incoming stock: Orders placed to Suppliers/Vendors (Outward POs) not yet received
    const activeSupplierPOs = await PurchaseOrder.find({
      type: "outward",
      status: { $nin: ["Completed", "Received", "Cancelled"] },
      $or: [
        { "products.product": product._id },
        { "products.productNo": pNo }
      ]
    }).select("products status").lean();

    let incoming = 0;
    activeSupplierPOs.forEach(po => {
      (po.products || []).forEach(item => {
        const matches = (item.product && String(item.product) === String(product._id)) ||
                        (item.productNo && item.productNo.trim().toLowerCase() === pNo.trim().toLowerCase());
        if (matches) {
          incoming += Number(item.quantity) || 0;
        }
      });
    });

    // In open quotes (Draft / Sent quotes that are NOT yet converted to PO)
    const openQuotes = await Quotation.find({
      status: { $in: ["Draft", "Sent"] },
      isConvertedToPO: { $ne: true },
      $or: [
        { "products.product": product._id },
        { "products.productNo": pNo }
      ]
    }).select("products status isConvertedToPO").lean();

    let inOpenQuotes = 0;
    openQuotes.forEach(q => {
      (q.products || []).forEach(item => {
        const matches = (item.product && String(item.product) === String(product._id)) ||
                        (item.productNo && item.productNo.trim().toLowerCase() === pNo.trim().toLowerCase());
        if (matches) {
          inOpenQuotes += Number(item.quantity) || 0;
        }
      });
    });

    const availableToSell = onHand;

    res.json({
      product: {
        _id: product._id,
        name: product.name || product.description || "N/A",
        description: product.description || "",
        brand: product.brand || "Generic",
        productNo: product.productNo,
        uom: product.uom || "Nos",
        type: product.type || "Spare Part",
        priceUSD: product.priceUSD || 0,
        dealerPriceINR: product.dealerPriceINR || 0,
        retailPriceINR: product.retailPriceINR || 0,
        quantity: onHand
      },
      onHand,
      reserved,
      incoming,
      inOpenQuotes,
      availableToSell,
      uom: product.uom || "Nos"
    });
  } catch (err) {
    console.error("Live Stock Error:", err);
    res.status(500).json({ message: "Failed to fetch live stock", error: err.message });
  }
};

/* ========= GET PRODUCT STOCK LEDGER ========= */
exports.getProductLedger = async (req, res) => {
  try {
    const { id } = req.params;

    let productFilter = {};
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      productFilter = { product: id };
    } else {
      productFilter = { productNo: id };
    }

    const ledger = await StockLedger.find(productFilter)
      .sort({ date: -1, createdAt: -1 })
      .populate("createdBy", "name email")
      .lean();

    res.json(ledger);
  } catch (err) {
    console.error("Fetch Ledger Error:", err);
    res.status(500).json({ message: "Failed to fetch stock ledger", error: err.message });
  }
};

