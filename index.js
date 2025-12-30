const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const Client = require("./models/Client");

const app = express();

// ========== MIDDLEWARE ==========
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ========== MULTER FOR IMAGES ==========
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// ========== MONGO DB CONNECTION ==========
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ========== ADMIN SESSIONS STORAGE ==========
const adminSessions = {};

// ========== ADMIN LOGIN ENDPOINT ==========
app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Login attempt by:', username);
    
    // Get credentials from .env
    const correctUsername = process.env.ADMIN_USERNAME;
    const correctPassword = process.env.ADMIN_PASSWORD;
    
    // Check credentials
    if (username === correctUsername && password === correctPassword) {
      // Create session ID
      const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      
      // Store session (24 hours)
      adminSessions[sessionId] = {
        loggedInAt: new Date(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000)
      };
      
      console.log('✅ Login successful for:', username);
      
      res.json({ 
        success: true, 
        sessionId: sessionId,
        message: "Login successful!" 
      });
    } else {
      console.log('❌ Login failed for:', username);
      res.status(401).json({ error: "Wrong username or password" });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ========== CHECK ADMIN AUTH ==========
const checkAdmin = (req, res, next) => {
  const sessionId = req.headers['x-admin-session'];
  
  if (!sessionId) {
    return res.status(401).json({ error: "Please login first" });
  }
  
  const session = adminSessions[sessionId];
  
  if (!session) {
    return res.status(401).json({ error: "Session expired. Login again" });
  }
  
  if (Date.now() > session.expiresAt) {
    delete adminSessions[sessionId];
    return res.status(401).json({ error: "Session expired. Login again" });
  }
  
  // Update expiry time
  session.expiresAt = Date.now() + (24 * 60 * 60 * 1000);
  next();
};

// ========== LOGOUT ==========
app.post("/api/admin/logout", (req, res) => {
  const sessionId = req.headers['x-admin-session'];
  if (sessionId) {
    delete adminSessions[sessionId];
  }
  res.json({ success: true, message: "Logged out" });
});

// ========== BASIC ROUTES ==========
app.get("/", (req, res) => res.send("✅ Backend is running"));
app.get("/test", (req, res) => res.send("Test route working"));

// ========== CONTACT FORM ==========
app.post("/api/client", upload.single("image"), async (req, res) => {
  try {
    const { name, phone, message } = req.body;
    
    if (!name || !phone || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const clientData = {
      name: name.trim(),
      phone: phone.trim(),
      message: message.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (req.file) {
      clientData.image = req.file.buffer;
      clientData.imageType = req.file.mimetype;
    }

    const client = new Client(clientData);
    await client.save();
    
    res.status(201).json({ 
      success: true, 
      message: "Message sent successfully!" 
    });
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ error: "Failed to save message" });
  }
});

// ========== GET MESSAGES (PROTECTED) ==========
app.get("/api/client", checkAdmin, async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 }).lean();
    
    const formatted = clients.map((client) => {
      const result = {
        _id: client._id,
        name: client.name,
        phone: client.phone,
        message: client.message,
        createdAt: client.createdAt,
        imageType: client.imageType || null,
        image: null
      };

      if (client.image && Buffer.isBuffer(client.image)) {
        try {
          const base64 = client.image.toString('base64');
          result.image = `data:${client.imageType || 'image/jpeg'};base64,${base64}`;
        } catch (err) {
          result.image = null;
        }
      }

      return result;
    });

    res.json(formatted);
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔐 Admin login: /api/admin/login`);
  console.log(`📨 Contact form: /api/client`);
});