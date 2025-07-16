//backend/Models/bidModel.js
const mongoose = require("mongoose");

const bidSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  voucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Voucher',
    required: true
  },
  bidAmount: {
    type: Number,
    required: true,
  },
  bidId: {
    type: String,
    required: true,
    unique: true  // Ensure each bid ID is unique
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model("Bid", bidSchema);
