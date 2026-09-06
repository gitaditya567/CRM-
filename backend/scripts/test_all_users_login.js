const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("../models/User");
const Role = require("../models/Role");
const Setting = require("../models/Setting");

async function testAllLogins() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const users = await User.find({});
    console.log(`Testing login pipeline for ${users.length} users:`);

    for (const user of users) {
      try {
        console.log(`\nTesting user: ${user.name} (${user.email}) | Role: ${user.role}`);
        
        // 1. bcrypt check
        const dummyPassword = "testPassword123";
        if (user.password) {
          await bcrypt.compare(dummyPassword, user.password);
        } else {
          console.warn(`User ${user.email} HAS NO PASSWORD HASH!`);
        }

        // 2. lastLogin update & save
        user.lastLogin = new Date();
        await user.save();

        // 3. Settings check
        const roleLower = user.role?.toLowerCase();
        if (roleLower !== "admin" && roleLower !== "superadmin") {
          const settings = await Setting.findOne({ key: "global_ui_settings" });
        }

        // 4. JWT Sign
        const secret = process.env.JWT_SECRET || "fallback_secret";
        const token = jwt.sign(
          { id: user._id, role: user.role, name: user.name, tokenVersion: user.tokenVersion || 0 },
          secret,
          { expiresIn: "1d" }
        );

        // 5. Role permissions check
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

        console.log(`User ${user.email} login test PASSED OK!`);
      } catch (userErr) {
        console.error(`ERROR FOR USER ${user.email}:`, userErr);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

testAllLogins();
