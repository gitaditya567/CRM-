const jwt = require("jsonwebtoken");
const User = require("../models/User");

const userCache = new Map();
const CACHE_TTL = 2000; // 2 seconds

exports.clearUserCache = (userId) => {
  if (userId) {
    userCache.delete(userId.toString());
  } else {
    userCache.clear();
  }
};

exports.protect = async (req, res, next) => {
  let token = req.headers.authorization?.split(" ")[1];
  
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const tokenVersion = decoded.tokenVersion;

    // Check Cache
    const cached = userCache.get(userId);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      // Even in cache, we must verify tokenVersion if it exists in token
      if (tokenVersion !== undefined && cached.user.tokenVersion !== tokenVersion) {
        userCache.delete(userId); // Invalidate cache
        return res.status(401).json({ message: "Session expired. Please login again." });
      }
      req.user = cached.user;
      return next();
    }

    const user = await User.findById(userId).select("-password").lean();
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Verify tokenVersion
    if (tokenVersion !== undefined && user.tokenVersion !== tokenVersion) {
      return res.status(401).json({ message: "Session expired. Please login again." });
    }

    // Update Cache
    userCache.set(userId, { user, timestamp: Date.now() });
    
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    res.status(401).json({ message: "Invalid token" });
  }
};

// Admin Only
exports.adminOnly = (req, res, next) => {
  if (req.user.role?.toLowerCase() !== "admin") {
    return res.status(403).json({ message: "Admin access denied" });
  }
  next();
};
