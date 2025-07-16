//backend/models/debitTransactionHistoryModel.js
const mongoose = require('mongoose');

const debitTransactionHistorySchema = new mongoose.Schema({
  transactionId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Wallet' },
  userId: { type: String, required: true },
  userEmail: { type: String, required: true },
  amount: { type: Number, required: true },
  stripePaymentIntentId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('DebitTransactionHistory', debitTransactionHistorySchema);
