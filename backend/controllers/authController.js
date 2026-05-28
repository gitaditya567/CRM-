const bcrypt = require("bcryptjs");
const User = require("../models/User");

exports.createStaff = async (req, res) => {
  try {
    const { name, email, password, permissions } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: "staff",
      permissions: permissions || []
    });

    res.json({ message: "Staff user created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
exports.getStaffUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "staff" })
      .select("name email createdAt");

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
};
