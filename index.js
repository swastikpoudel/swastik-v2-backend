const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const Client = require("./models/Client");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Multer for image upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error("MongoDB error ❌", err));

// Test Routes
app.get("/", (req, res) => res.send("Backend running 🚀"));
app.get("/test", (req, res) => res.sendFile(path.join(__dirname, "test.html")));

// POST: Create message with image - FIXED VERSION
app.post("/api/client", upload.single("image"), async (req, res) => {
  try {
    const { name, phone, message } = req.body;
    
    console.log('=== POST /api/client ===');
    console.log('Received:', { name, phone, message });
    console.log('File:', req.file ? `Yes (${req.file.size} bytes)` : 'No');

    if (!name || !phone || !message) {
      return res.status(400).json({ error: "Name, phone and message are required" });
    }

    // Create client with image if exists
    const clientData = {
      name: name.trim(),
      phone: phone.trim(),
      message: message.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Only add image if file exists
    if (req.file) {
      clientData.image = req.file.buffer;
      clientData.imageType = req.file.mimetype;
      console.log(`Image saved: ${req.file.buffer.length} bytes`);
    }

    const client = new Client(clientData);
    await client.save();
    
    console.log(`✅ Saved: ${client.name} (ID: ${client._id})`);
    
    res.status(201).json({ 
      success: true, 
      message: "Message saved successfully",
      id: client._id 
    });
  } catch (err) {
    console.error("POST /api/client error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET: Get all messages - FIXED IMAGE CONVERSION
app.get("/api/client", async (req, res) => {
  try {
    const adminSecret = req.headers["x-admin-secret"];
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get all clients
    const clients = await Client.find()
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${clients.length} messages`);

    // Convert images to Base64
    const formatted = clients.map((client) => {
      const result = {
        _id: client._id,
        name: client.name,
        phone: client.phone,
        message: client.message,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        imageType: client.imageType || null
      };

      // Convert image buffer to Base64 if exists
      if (client.image && Buffer.isBuffer(client.image)) {
        try {
          const base64 = client.image.toString('base64');
          result.image = `data:${client.imageType || 'image/jpeg'};base64,${base64}`;
          console.log(`✓ Image for ${client.name}: ${base64.length} chars`);
        } catch (err) {
          console.error(`✗ Image conversion error for ${client.name}:`, err.message);
          result.image = null;
        }
      } else if (client.image && client.image.buffer && Buffer.isBuffer(client.image.buffer)) {
        // Sometimes buffer is nested
        try {
          const base64 = client.image.buffer.toString('base64');
          result.image = `data:${client.imageType || 'image/jpeg'};base64,${base64}`;
          console.log(`✓ Image for ${client.name} (nested): ${base64.length} chars`);
        } catch (err) {
          console.error(`✗ Nested image error for ${client.name}:`, err.message);
          result.image = null;
        }
      } else {
        result.image = null;
      }

      return result;
    });

    res.json(formatted);
  } catch (err) {
    console.error("GET /api/client error:", err);
    res.status(500).json({ error: err.message });
  }
});

// TEST endpoint for debugging
app.post("/api/test-upload", upload.single("image"), (req, res) => {
  console.log("=== TEST UPLOAD ===");
  console.log("Body:", req.body);
  console.log("File:", req.file ? {
    name: req.file.originalname,
    type: req.file.mimetype,
    size: req.file.size,
    bufferSize: req.file.buffer.length
  } : "No file");
  
  res.json({
    success: true,
    message: "Test received",
    body: req.body,
    fileReceived: !!req.file
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});