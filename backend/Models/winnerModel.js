const mongoose = require("mongoose");

const winnerSchema = new mongoose.Schema(
  {
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
    winningBidId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bid',
      required: true
    },
    winningAmount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'claimed'],
      default: 'pending'
    },
    wonAt: {
      type: Date,
      default: Date.now
    },
    endTime: {
      type: Date,
      default: function() {
        return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from `wonAt`
      }
    }
  },
  { timestamps: true }  // Automatically adds `createdAt` and `updatedAt` fields
);

module.exports = mongoose.model("Winner", winnerSchema);
