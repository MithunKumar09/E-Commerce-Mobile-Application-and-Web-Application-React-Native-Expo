const Voucher = require("../Models/voucherModel");
const Bid = require("../Models/bidModel");
const User = require("../Models/userModel");

const BidConfirmed = async (req, res) => {
    const { userId, voucherId, bidAmount, bidId } = req.body;

    try {

  
      // Create a new bid
      const newBid = new Bid({
        userId,
        voucherId,
        bidAmount,
        bidId,
      });
  
      await newBid.save();
      res.status(201).json({ message: 'Bid successfully placed!' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Failed to place bid.' });
    }
};



module.exports = { BidConfirmed
}