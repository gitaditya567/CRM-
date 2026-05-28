const path = require('path');
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: path.join(__dirname, '..', '.env') });

const User = require("../models/User");

mongoose.connect(process.env.MONGO_URI);

const ensureAdmin = async () => {
  try {
    const exists = await User.findOne({ role: "admin" });
    if (!exists) {
      const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD || "team12345", 10);
      await User.create({
        name: process.env.ADMIN_NAME || "Administrator",
        email: process.env.ADMIN_EMAIL || "admin@shop.com",
        password: hashed,
        role: "admin"
      });
      console.log("Admin created");
    }
  } catch (err) {
    console.error("ensureAdmin error:", err);
  }
};

ensureAdmin().then(() => {
  console.log("Script finished");
  process.exit(0);
});
