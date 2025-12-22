const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");    // ← ONLY NEW LINE
const path = require("path");
require("dotenv").config();
// added for image upload handling 
const Client = require("./models/Client");

const app = express();

// ===== MIDDLEWARE =====
app.use(cors());

app.use(express.json({ limit: "20mb" }));               // ← small update for large files
app.use(express.urlencoded({ extended: true }));        // ← needed for FormData

// ← ONLY NEW BLOCK: multer for image
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB max
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

// ===== CREATE CLIENT MESSAGE (NOW WITH IMAGE) =====
app.post("/api/client", upload.single("image"), async (req, res) => {  // ← added upload.single
  try {
    const { name, phone, message } = req.body;

    if (!name || !phone || !message) {
      return res.status(400).json({ error: "All fields required" });
    }

    const client = new Client({
      name,
      phone,
      message,
      image: req.file ? req.file.buffer : null,      // ← save image if attached
      imageType: req.file ? req.file.mimetype : null // ← save type
    });

    await client.save();

    res.status(201).json({ success: true, client });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== GET ALL MESSAGES (ADMIN – PROTECTED) =====
app.get("/api/client", async (req, res) => {
  try {
    const adminSecret = req.headers["x-admin-secret"];

    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const clients = await Client.find().sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});