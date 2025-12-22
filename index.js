const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const Client = require("./models/Client");

const app = express();

// MIDDLEWARE
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

// Multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// MongoDB
mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error("MongoDB error ❌", err));

// Routes
app.get("/", (req, res) => res.send("Backend running 🚀"));

app.get("/test", (req, res) => res.sendFile(path.join(__dirname, "test.html")));

// POST - Send message + image
app.post("/api/client", upload.single("image"), async (req, res) => {
  try {
    const { name, phone, message } = req.body;
    if (!name || !phone || !message) return res.status(400).json({ error: "All fields required" });

    const client = new Client({
      name,
      phone,
      message,
      image: req.file ? req.file.buffer : null,
      imageType: req.file ? req.file.mimetype : null,
    });

    await client.save();
    res.status(201).json({ success: true, client });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET - Get all messages + CONVERT IMAGE TO BASE64
app.get("/api/client", async (req, res) => {
  try {
    const adminSecret = req.headers["x-admin-secret"];
    if (adminSecret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: "Unauthorized" });

    const clients = await Client.find().sort({ createdAt: -1 });

    // THIS IS THE FIX: Convert Buffer to Base64 data URL
    const formatted = clients.map((client) => {
      const obj = client.toObject();
      if (obj.image && obj.imageType) {
        const base64 = obj.image.toString("base64");
        obj.image = `data:${obj.imageType};base64,${base64}`;
      } else {
        obj.image = null;
      }
      return obj;
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));