//backend/model/TodayDealModel.js
const mongoose = require('mongoose');

// Define the TodayDeal schema
const todayDealSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
    trim: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  discount: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  isAutomated: {
    type: Boolean,
    default: false,
  },
  automationStatus: {
    type: String,
    enum: ['scheduled', 'active', 'expired', 'inactive'],
    default: 'inactive',
  },
}, { timestamps: true });

const TodayDeal = mongoose.model('TodayDeal', todayDealSchema);

module.exports = TodayDeal;
