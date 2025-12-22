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
      type: Buffer,  // stores the image
    },
    imageType: {
      type: String,  // e.g., "image/jpeg" – useful if you view later
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Client", clientSchema);