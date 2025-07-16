//backend/Models/userModel.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  currentAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
  }, 
  pushToken: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);