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

// POST: Create message with image
app.post("/api/client", upload.single("image"), async (req, res) => {
  try {
    const { name, phone, message } = req.body;
    if (!name || !phone || !message) {
      return res.status(400).json({ error: "All fields required" });
    }

    const client = new Client({
      name,
      phone,
      message,
      image: req.file ? req.file.buffer : null,
      imageType: req.file ? req.file.mimetype : null,
    });

    await client.save();
    res.status(201).json({ success: true, message: "Message saved successfully" });
  } catch (err) {
    console.error("POST /api/client error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET: Get all messages - WITH .lean() FOR CLEAN BASE64
app.get("/api/client", async (req, res) => {
  try {
    const adminSecret = req.headers["x-admin-secret"];
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // .lean() returns plain JS objects (no Mongoose wrapper)
    const clients = await Client.find().sort({ createdAt: -1 }).lean();

    // Manually convert Buffer to Base64 data URL
    const formatted = clients.map((client) => {
      if (client.image && client.imageType) {
        // Handle both direct Buffer and { buffer: Buffer } from lean
        const buffer = client.image.buffer || client.image;
        if (Buffer.isBuffer(buffer)) {
          const base64 = buffer.toString("base64");
          client.image = `data:${client.imageType};base64,${base64}`;
        } else {
          client.image = null;
        }
      } else {
        client.image = null;
      }
      return client;
    });

    console.log(`Sent ${formatted.length} messages with clean image URLs`);
    res.json(formatted);
  } catch (err) {
    console.error("GET /api/client error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});