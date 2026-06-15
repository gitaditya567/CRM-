const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const compression = require("compression");
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const path = require("path");

console.log("Starting dotenv config...");
dotenv.config();
const app = express();
console.log("Express app created");

// Middleware
app.use(compression()); 
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});
console.log("Middleware set up");

// Routes
app.get("/", (req, res) => {
  res.send("Inventory Management System API is running...");
});

app.use("/api/auth", require("./routes/authRoutes"));
console.log("Auth routes loaded");
app.use("/api/products", require("./routes/productRoutes"));
console.log("Product routes loaded");
app.use("/api/leads", require("./routes/leadRoutes"));
console.log("Lead routes loaded");
app.use("/api/groups", require("./routes/groupRoutes"));
console.log("Group routes loaded");
app.use("/api/clients", require("./routes/clientRoutes"));
console.log("Client routes loaded");
app.use("/api/quotations", require("./routes/quotationRoutes"));
console.log("Quotation routes loaded");
app.use("/api/purchase-orders", require("./routes/poRoutes"));
console.log("Purchase Order routes loaded");
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
console.log("Dashboard routes loaded");
app.use("/api/settings", require("./routes/settingRoutes"));
console.log("Settings routes loaded");
app.use("/api/roles", require("./routes/roleRoutes"));
console.log("Role routes loaded");
app.use("/api/ai", require("./routes/aiRoutes"));
console.log("AI routes loaded");
app.use("/api/messages", require("./routes/messageRoutes"));
console.log("Message routes loaded");

// DB Connection
console.log("Connecting to MongoDB...");
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 100, // Handle more concurrent requests
  minPoolSize: 10,  // Keep some connections warm
  connectTimeoutMS: 10000,
  waitQueueTimeoutMS: 30000, // Wait longer for a connection if busy
})
  .then(async () => {
    console.log("MongoDB Connected");
    const ensureAdmin = async () => {
      try {
        const admin = await User.findOne({ role: "admin" });

        if (!admin) {
          const adminPassword = process.env.ADMIN_PASSWORD || "team12345";
          const hashed = await bcrypt.hash(adminPassword, 10);
          await User.create({
            name: process.env.ADMIN_NAME || "Administrator",
            email: process.env.ADMIN_EMAIL || "admin@shop.com",
            password: hashed,
            role: "admin"
          });
          console.log("Admin created with default credentials");
        } else if (process.env.ADMIN_PASSWORD) {
          // Only update if explicitly provided in environment
          const isMatch = await bcrypt.compare(process.env.ADMIN_PASSWORD, admin.password);
          if (!isMatch) {
            admin.password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
            if (process.env.ADMIN_EMAIL) admin.email = process.env.ADMIN_EMAIL;
            await admin.save();
            console.log("Admin credentials updated from environment settings");
          }
        }
      } catch (err) {
        console.error("ensureAdmin error:", err);
      }
    };
    await ensureAdmin();
    
    // Start Server after DB is ready
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("DB Error:", err);
    // Still start server but it will be in limited mode or fail on DB requests
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (DB Connection Failed)`);
    });
  });

// Server
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

io.on("connection", (socket) => {
  console.log("New client connected", socket.id);
  
  socket.on("join", (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`User ${userId} joined room`);
    }
  });

  // WebRTC calling signaling
  socket.on("callUser", ({ callerId, calleeId, callerName, type }) => {
    console.log(`Call request from ${callerId} (${callerName}) to ${calleeId} (${type})`);
    io.to(calleeId).emit("incomingCall", { callerId, callerName, type });
  });

  socket.on("answerCall", ({ callerId, calleeId, accept }) => {
    console.log(`Call answer from ${calleeId} to ${callerId}: accept=${accept}`);
    io.to(callerId).emit("callResponse", { calleeId, accept });
  });

  socket.on("webRtcSignal", ({ targetId, signal, senderId }) => {
    io.to(targetId).emit("webRtcSignal", { signal, senderId });
  });

  socket.on("endCall", ({ targetId }) => {
    console.log(`Call ended by a peer. Notifying ${targetId}`);
    io.to(targetId).emit("callEnded");
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });
});

app.set("io", io);

const PORT = process.env.PORT || 5000;

module.exports = app;

// Global error handlers to prevent silent crashes
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception thrown:", err);
  process.exit(1);
});
