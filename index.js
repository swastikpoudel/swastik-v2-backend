const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config();
const Client = require("./models/Client");


const app = express();

// middleware
app.use(cors());
app.use(express.json());

// connect MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error("MongoDB error ❌", err));


// test route
app.get("/", (req, res) => {
  res.send("Backend + Database running 🚀");
});
app.get("/test", (req, res) => {
  res.sendFile(path.join(__dirname, "test.html"));
});

app.post("/api/client", async (req, res) => {
  try {
    const { name, phone, message } = req.body;

    if (!name || !phone || !message) {
      return res.status(400).json({ error: "All fields required" });
    }

    const client = new Client({ name, phone, message });
    await client.save();

    res.status(201).json({ success: true, client });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// get all client messages (ADMIN)
app.get("/api/client", async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
