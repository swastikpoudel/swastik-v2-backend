const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
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
  limits: { fileSize: 15 * 1024 * 1024 }
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
    
    const correctUsername = process.env.ADMIN_USERNAME;
    const correctPassword = process.env.ADMIN_PASSWORD;
    
    if (username === correctUsername && password === correctPassword) {
      const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      
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
    console.log('📦 FORM SUBMISSION RECEIVED');
    
    const { name, phone, message } = req.body;
    
    if (!name || !phone || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const clientData = {
      name: name.trim(),
      phone: phone.trim(),
      message: message.trim()
    };

    // SAVE IMAGE IF EXISTS
    if (req.file && req.file.buffer) {
      console.log('📸 IMAGE FOUND - Size:', req.file.size, 'bytes');
      clientData.image = req.file.buffer;
      clientData.imageType = req.file.mimetype;
    } else {
      console.log('ℹ️ NO IMAGE ATTACHED');
    }

    const client = new Client(clientData);
    await client.save();
    
    console.log('✅ MESSAGE SAVED TO DATABASE');
    
    res.status(201).json({ 
      success: true, 
      message: "Message sent successfully!" 
    });
  } catch (err) {
    console.error("❌ SAVE ERROR:", err);
    res.status(500).json({ error: "Failed to save message" });
  }
});

// ========== GET MESSAGES (FIXED VERSION) ==========
app.get("/api/client", checkAdmin, async (req, res) => {
  try {
    console.log('📥 FETCHING MESSAGES FROM DB');
    
    // FIX: Don't use .lean() - get full documents
    const clients = await Client.find().sort({ createdAt: -1 });
    
    console.log(`📊 FOUND ${clients.length} MESSAGES`);
    
    const messagesWithImages = [];
    
    for (const client of clients) {
      const messageData = {
        _id: client._id,
        name: client.name,
        phone: client.phone,
        message: client.message,
        createdAt: client.createdAt,
        hasImage: false,
        image: null
      };
      
      // CHECK IF IMAGE EXISTS IN DATABASE
      if (client.image && client.imageType) {
        console.log(`🖼️ Processing image for ${client.name}`);
        console.log(`   - Image type: ${client.imageType}`);
        console.log(`   - Buffer size: ${client.image.length} bytes`);
        console.log(`   - Is Buffer?: ${Buffer.isBuffer(client.image)}`);
        
        try {
          // Convert buffer to base64
          const base64Image = client.image.toString('base64');
          messageData.image = `data:${client.imageType};base64,${base64Image}`;
          messageData.hasImage = true;
          console.log(`   ✅ Image converted successfully`);
        } catch (error) {
          console.log(`   ❌ Error converting: ${error.message}`);
          messageData.image = null;
        }
      } else {
        console.log(`📭 No image for ${client.name}`);
      }
      
      messagesWithImages.push(messageData);
    }
    
    const imageCount = messagesWithImages.filter(m => m.hasImage).length;
    console.log(`🎯 FINAL: ${imageCount} images converted out of ${clients.length} messages`);
    
    res.json(messagesWithImages);
    
  } catch (err) {
    console.error("❌ FETCH ERROR:", err);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

// ========== DEBUG ROUTE ==========
app.get("/api/debug", async (req, res) => {
  try {
    const clients = await Client.find().limit(3);
    
    const debugInfo = clients.map(client => ({
      id: client._id,
      name: client.name,
      hasImageField: !!client.image,
      hasImageType: !!client.imageType,
      imageIsBuffer: Buffer.isBuffer(client.image),
      imageLength: client.image ? client.image.length : 0,
      imageType: client.imageType,
      allFields: Object.keys(client.toObject())
    }));
    
    res.json({
      totalMessages: await Client.countDocuments(),
      sampleData: debugInfo,
      message: "Debug info - check if images are stored"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📨 Form endpoint: /api/client`);
  console.log(`🔐 Admin login: /api/admin/login`);
  console.log(`🐛 Debug route: /api/debug`);
});