const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema({
  voucher_name: {
    type: String,
    required: true
  },
  details: {
    type: String,
    required: true
  },
  product_name: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
  },
  price: {
    type: Number,
    required: true
  },
  productPrice: {
    type: Number,
    required: true
  },
  start_time: {
    type: Date,
    required: true
  },
  end_time: {
    type: Date,
    required: true
  },
  winner_bid_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid',
    default: null
  },
  is_expired: {
    type: String, // Changed to string to hold multiple states (Scheduled, Active, Expired, Inactive)
    enum: ['Scheduled', 'Active', 'Expired', 'Inactive'],
    default: 'Scheduled'
  },
  eligible_rebid_users: {
    type: [mongoose.Schema.Types.ObjectId], // Array of user IDs eligible for the rebid event
    ref: 'User',
    default: []
  },
  rebid_end_time: {
    type: Date, // Track the new 24-hour period end time
  },
  rebid_active: {
    type: Boolean, // Track if the voucher is in the rebid phase
    default: false
  },
  currentBids: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: { type: String, required: true },
    bidAmount: { type: Number, required: true }
  }]
});

module.exports = mongoose.model("Voucher", voucherSchema);
