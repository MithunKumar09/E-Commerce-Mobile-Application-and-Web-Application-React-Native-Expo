//model/AssignOrder.js
const mongoose = require('mongoose');

const assignOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    ref: 'Order',
    required: true,
  },
  salesmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salesman',
    required: true,
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  assignedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['Pending', 'Request Sent', 'Accepted', 'Cancelled'],
    default: 'Pending',
  },
  comments: {
    type: String,
    default: '',
  },
  trackingId: {
    type: String,
  },
  latitude: {
    type: Number,
  },
  longitude: {
    type: Number,
  },
  area: {
    type: String,
  },
  acceptedTime: {
    type: Date,
  },
  locationUpdateTime: {
    type: Date,
  },
  // New field to track order statuses with their timestamps
  orderStatusHistory: [
    {
      status: {
        type: String,
        required: true,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  // New field to track location history with timestamps
  locationHistory: [
    {
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
      area: {
        type: String,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

module.exports = mongoose.model('AssignOrder', assignOrderSchema);
