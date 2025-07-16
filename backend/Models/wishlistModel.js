//Backend/Models/wishlistModel.js
const mongoose = require("mongoose");

const WishlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  productId: { type: String, required: true },
  wishlistStatus: { type: String, enum: ['added', 'removed'], default: 'removed' },
});

module.exports = mongoose.model("Wishlist", WishlistSchema);