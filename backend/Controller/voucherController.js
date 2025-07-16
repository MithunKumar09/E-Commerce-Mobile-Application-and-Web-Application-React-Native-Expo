const Voucher = require("../Models/voucherModel");
const Winner = require("../Models/winnerModel");

const getVouchersUserSide = async (req, res) => {
  console.log("Fetching all vouchers");
  try {
      const vouchers = await Voucher.find({});
      res.status(200).json(vouchers);
  } catch (error) {
      console.error("Error fetching vouchers:", error);
      res.status(500).json({ error: "Failed to fetch vouchers" });
  }
};


const getWinners = async (req, res) => {
    try {
        const winners = await Winner.find().populate('userId voucherId winningBidId');
        res.json(winners);
      } catch (error) {
        console.error("Error fetching winners:", error);
        res.status(500).json({ message: "Internal server error" });
      }
  };
  

  const freeVoucher = async (req, res) => {
    try {
        const currentTime = new Date();
        const twentyFourHoursAgo = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);

        // Find winners within the last 24 hours
        const eligibleWinners = await Winner.aggregate([
            {
                $match: {
                    wonAt: { $gte: twentyFourHoursAgo, $lte: currentTime }
                }
            },
            {
                $group: {
                    _id: "$voucherId",
                    winnersCount: { $sum: 1 }
                }
            },
            {
                $match: { winnersCount: { $gte: 2 } }  // Only include vouchers with two or more winners
            }
        ]);

     
        const voucherIds = eligibleWinners.map(w => w._id);

        // Fetch full voucher details for eligible vouchers
        const eligibleVouchers = await Voucher.find({ _id: { $in: voucherIds } });

        res.status(200).json({ eligibleVouchers });
    } catch (error) {
        console.error("Error fetching eligible free vouchers:", error);
        res.status(500).json({ message: "Server error" });
    }
};
    




module.exports = { getVouchersUserSide, getWinners, freeVoucher
}