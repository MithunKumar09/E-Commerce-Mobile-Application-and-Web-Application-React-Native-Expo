//backend/models/walletModel.js
const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {type: String, required: true },
  userEmail: { type: String, required: true },
  amount: { type: Number, required: true },
  transactionType: { type: String, enum: ['credit', 'debit'], required: true },
  stripePaymentIntentId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'pending' },
  intentType: { type: String, enum: ['wallet'], default: 'wallet' },
  timestamp: { type: Date, default: Date.now },
  debitTransactionHistory: { type: Array, default: [] },
});

module.exports = mongoose.model('Wallet', walletSchema);
