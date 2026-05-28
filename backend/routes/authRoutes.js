const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Setting = require("../models/Setting");
const { protect, adminOnly, clearUserCache } = require("../middleware/authMiddleware");

const router = express.Router();

const Role = require("../models/Role");

// GET CURRENT USER PROFILE
router.get("/me", protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    console.log(`DEBUG: /me request hit for user ${userId}`);
    const user = await User.findById(userId).select("-password").lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    let rolePermissions = {};
    if (user.role && user.role.toLowerCase() !== "admin") {
      const roleDoc = await Role.findOne({ name: user.role }).lean();
      if (roleDoc) {
        rolePermissions = {
          menuPermissions: roleDoc.menuPermissions || {},
          modulePermissions: roleDoc.modulePermissions || {}
        };
      }
    }

    res.json({ ...user, rolePermissions });
  } catch (err) {
    console.error("Profile Fetch Error:", err);
    res.status(500).json({ message: "Error fetching profile" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`DEBUG: Login attempt for ${email}`);

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    // Update Last Login
    user.lastLogin = new Date();
    await user.save();

    // Check Access Code for non-admins
    const roleLower = user.role?.toLowerCase();
    if (roleLower !== "admin" && roleLower !== "superadmin") {
      const settings = await Setting.findOne({ key: "global_ui_settings" });
      const requiredCode = settings?.features?.loginAccessCode;
      
      if (requiredCode && requiredCode !== req.body.accessCode) {
        return res.status(403).json({ message: "Invalid access code. Please contact admin." });
      }
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, tokenVersion: user.tokenVersion || 0 },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    let rolePermissions = {};
    if (user.role && user.role.toLowerCase() !== "admin") {
      const roleDoc = await Role.findOne({ name: user.role });
      if (roleDoc) {
        rolePermissions = {
          menuPermissions: roleDoc.menuPermissions || {},
          modulePermissions: roleDoc.modulePermissions || {}
        };
      }
    }

    // Notify Admin via Socket
    const io = req.app.get("io");
    if (io) {
      io.emit("userAction", { 
        action: "login", 
        user: { name: user.name, role: user.role, email: user.email } 
      });
    }

    res.json({
      token,
      userId: user._id,
      role: user.role,
      name: user.name,
      permissions: user.permissions || [],
      rolePermissions,
      uiSettings: user.uiSettings
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

// CREATE STAFF
router.post("/create-staff", protect, adminOnly, async (req, res) => {
  const { name, email, password, permissions, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required including role" });
  }

  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(400).json({ message: "Staff already exists" });
  }

  const hashed = await bcrypt.hash(password, 10);

  await User.create({
    name,
    email,
    password: hashed,
    role: role,
    permissions: permissions || []
  });

  res.json({ message: "Staff created successfully" });
});

// GET STAFF USERS (Include Admins for Admin View)
router.get("/staff-users", protect, adminOnly, async (req, res) => {
  const users = await User.find({})
    .select("name email role permissions lastLogin lastLogout createdAt");

  res.json(users);
});

// GET SINGLE STAFF SETTINGS
router.get("/staff/:id", protect, adminOnly, async (req, res) => {
  const user = await User.findById(req.params.id).select("name email uiSettings permissions");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

// DELETE STAFF
router.delete("/staff/:id", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role.toLowerCase() === "admin") return res.status(400).json({ message: "Cannot delete admin" });

    await user.deleteOne();

    // Notify Admin via Socket
    const io = req.app.get("io");
    if (io) {
      io.emit("userAction", { 
        action: "delete", 
        user: { name: user.name, role: user.role, email: user.email } 
      });
    }

    res.json({ message: "Staff removed" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting user" });
  }
});

// EXPLICIT LOGOUT ROUTE
router.post("/logout", protect, async (req, res) => {
  try {
    // Update Last Logout
    await User.findByIdAndUpdate(req.user._id, { lastLogout: new Date() });

    // Notify Admin via Socket
    const io = req.app.get("io");
    if (io) {
      io.emit("userAction", { 
        action: "logout", 
        user: { name: req.user.name, role: req.user.role, email: req.user.email } 
      });
    }
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ message: "Logout error" });
  }
});

// UPDATE STAFF
router.put("/staff/:id", protect, adminOnly, async (req, res) => {
  try {
    const { name, email, password, permissions, uiSettings, role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (permissions) user.permissions = permissions;
    if (uiSettings) user.uiSettings = uiSettings;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();
    res.json({ message: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error updating user" });
  }
});

// LOGOUT FROM ALL DEVICES (Admin Only)
router.post("/logout-all-devices/:id", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Incrementing tokenVersion invalidates all previous tokens
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Clear cache immediately
    clearUserCache(user._id);

    res.json({ message: "Logged out from all devices successfully" });
  } catch (err) {
    console.error("Logout All Devices Error:", err);
    res.status(500).json({ message: "Error logging out from all devices" });
  }
});





// --- MOVED TO TOP FOR 404 FIX ---

// GET ALL USERS (for dropdowns)
router.get("/users", protect, async (req, res) => {
  try {
    const start = Date.now();
    const users = await User.find({}).select("name _id").lean();
    console.log(`[DEBUG] /users fetched in ${Date.now() - start}ms`);
    res.json(users);
  } catch (err) {
    console.error("Fetch Users Error:", err);
    res.status(500).json({ message: "Error fetching users" });
  }
});

module.exports = router;
