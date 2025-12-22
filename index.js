const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const Client = require("./models/Client");

const app = express();

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ===== MULTER FOR IMAGE UPLOAD =====
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
});

// ===== MONGODB CONNECTION =====
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error("MongoDB error ❌", err));

// ===== TEST ROUTES =====
app.get("/", (req, res) => {
  res.send("Backend + Database running 🚀");
});

app.get("/test", (req, res) => {
  res.sendFile(path.join(__dirname, "test.html"));
});

// ===== CREATE MESSAGE (WITH IMAGE) =====
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
    res.status(201).json({ success: true, message: "Message saved" });
  } catch (err) {
    console.error("POST error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===== GET ALL MESSAGES - WITH SAFE BASE64 CONVERSION =====
app.get("/api/client", async (req, res) => {
  try {
    const adminSecret = req.headers["x-admin-secret"];
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const clients = await Client.find().sort({ createdAt: -1 });

    const formattedClients = clients.map((client) => {
      let obj = {};

      // Safely convert Mongoose document to plain object
      try {
        obj = client.toObject ? client.toObject() : client.toJSON();
      } catch (e) {
        obj = JSON.parse(JSON.stringify(client));
      }

      // Safe image conversion
      if (obj.image && Buffer.isBuffer(obj.image) && obj.imageType) {
        try {
          const base64 = obj.image.toString("base64");
          obj.image = `data:${obj.imageType};base64,${base64}`;
        } catch (convertError) {
          console.error("Base64 conversion failed:", convertError);
          obj.image = null;
          obj.imageType = null;
        }
      } else {
        obj.image = null;
        obj.imageType = null;
      }

      return obj;
    });

    console.log("Successfully sent", formattedClients.length, "messages with converted images");
    res.json(formattedClients);
  } catch (err) {
    console.error("GET /api/client error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});