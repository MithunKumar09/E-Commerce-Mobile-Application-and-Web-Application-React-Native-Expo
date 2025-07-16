//backend/Models/orderModel.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  total: { type: Number, required: true },
  cartItems: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      image: { type: String, required: true },
      status: { 
        type: String, 
        enum: ['Pending', 'Processing', 'Shipped', 'Arrived', 'Delivered', 'Out for Delivery', 'Cancelled', 'Returned'], 
        default: 'Pending' 
      }
    }
  ],
  selectedAddressId: { type: mongoose.Schema.Types.ObjectId, ref: 'Address', required: true },
  paymentMethod: { type: String, enum: ['COD', 'Card', 'wallet'], required: true },
  paid: { type: Boolean, default: false },
  paymentDetails: [
    {
      intentId: { type: String },  // Stripe Payment Intent ID
      transactionType: { type: String, enum: ['credit', 'debit', 'direct'] },
      status: { type: String, enum: ['pending', 'succeeded', 'failed', 'refund'], default: 'pending' },
      amount: { type: Number },
      paymentMethod: { type: String },
      refundAmount: Number,
      timestamp: Date,
    }
  ],
  orderDate: { type: Date, default: Date.now },
  orderStatus: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'Arrived', 'Delivered', 'Out for Delivery', 'Cancelled', 'Returned'],
    default: 'Pending'
  },
  orderStatusHistory: [
    {
      status: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Arrived', 'Delivered', 'Out for Delivery', 'Cancelled', 'Returned'],
        required: true
      },
      updatedAt: { type: Date, default: Date.now }
    }
  ],
  cancellation: {
    type: {
      reason: String,
      cancelledAt: { type: Date, default: Date.now },
      status: { type: String, default: 'cancelled' },
      image: { type: String },
    },
    default: null,
  },
  orderSummary: { 
    type: Object,
    required: true
  },
  trackingId: {
    type: String,
  },
});

module.exports = mongoose.model('Order', OrderSchema);
