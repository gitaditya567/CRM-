const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "Staff",
    },
    permissions: {
      type: [String],
      default: [],
    },
    uiSettings: {
      type: Object,
      default: null
    },
    tokenVersion: {
      type: Number,
      default: 0
    },
    lastLogin: {
      type: Date,
      default: null
    },
    lastLogout: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
