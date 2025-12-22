const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    image: {
      type: Buffer,        // Stores raw image binary data
      default: null,
    },
    imageType: {
      type: String,        // e.g., "image/jpeg", "image/png", "image/webp"
      default: null,
    },
  },
  { timestamps: true } // automatically adds createdAt and updatedAt
);

module.exports = mongoose.model("Client", clientSchema);