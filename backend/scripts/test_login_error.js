const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("../models/User");
const Role = require("../models/Role");
const Setting = require("../models/Setting");

async function testLogin() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    console.log("JWT_SECRET present?", !!process.env.JWT_SECRET);

    const users = await User.find({}).limit(5).lean();
    console.log(`Found ${users.length} users in database:`);
    for (const u of users) {
      console.log(`- User: ${u.name} | Email: ${u.email} | Role: ${u.role}`);
    }

    if (users.length > 0) {
      const user = await User.findOne({ email: users[0].email });
      console.log("Testing login flow for user:", user.email);

      user.lastLogin = new Date();
      await user.save();
      console.log("User lastLogin saved successfully.");

      const roleLower = user.role?.toLowerCase();
      if (roleLower !== "admin" && roleLower !== "superadmin") {
        const settings = await Setting.findOne({ key: "global_ui_settings" });
        console.log("Settings loaded:", !!settings);
      }

      if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is MISSING in environment variables!");
      }

      const token = jwt.sign(
        { id: user._id, role: user.role, name: user.name, tokenVersion: user.tokenVersion || 0 },
        process.env.JWT_SECRET || "default_fallback_secret",
        { expiresIn: "1d" }
      );
      console.log("JWT Token generated successfully:", token.substring(0, 20) + "...");
    }

    process.exit(0);
  } catch (err) {
    console.error("EXACT LOGIN ERROR TRACE:", err);
    process.exit(1);
  }
}

testLogin();
