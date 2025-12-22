const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    message: { type: String, required: true },
    image: { type: Buffer, default: null },
    imageType: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Client", clientSchema);