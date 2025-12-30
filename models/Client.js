const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: Buffer,
    required: false
  },
  imageType: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ✅ FIXED: Remove next parameter for sync operations
clientSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Client', clientSchema);