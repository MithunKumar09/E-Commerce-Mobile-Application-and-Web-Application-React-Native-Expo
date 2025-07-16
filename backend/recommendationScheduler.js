//backend/recommendationScheduler.js
const mongoose = require("mongoose");
const cron = require("node-cron");
const Product = require("./Models/productModel");
const User = require("./Models/userModel");
const NotificationService = require("../backend/services/notificationService");
const Order = require("./Models/orderModel");
const Wishlist = require("./Models/wishlistModel");
const { sendOrderTrackingNotification } = require("./services/OrderTrackNotification");
const recommendedProductsCache = new Map();

/**
 * Function to generate recommended products for each user.
 */
const generateRecommendations = async () => {
  try {
    if (!mongoose.connection.readyState) {
      console.error("Database not connected. Skipping recommendations generation.");
      return;
    }

    console.log("Fetching users and products...");
    const users = await User.find(); // Fetch all users
    const products = await Product.find({ isListed: true }); // Fetch all active products

    if (!users.length) {
      console.log("No users found.");
      return;
    }
    if (!products.length) {
      console.log("No listed products found.");
      return;
    }

    for (const user of users) {
      console.log(`Generating recommendations for user ${user.email}...`);

      // Get user's preferences and past orders
      const userOrders = await Order.find({ userId: user._id }).populate("cartItems.productId");
      const wishlist = await Wishlist.find({ userId: user._id, wishlistStatus: "added" }).populate("productId");

      // Extract product categories from orders and wishlist
      const preferredCategories = [
        ...new Set([
          ...userOrders.flatMap(order => order.cartItems.map(item => item.productId.category)),
          ...wishlist.map(item => item.productId.category),
        ]),
      ];

      // Filter products based on preferred categories
      let recommendedProducts = products.filter(product => preferredCategories.includes(product.category));

      // If no preferred products, use FIFO fallback
      if (!recommendedProducts.length) {
        recommendedProducts = [...products];
      }

      // Avoid recommending the same product continuously
      const previouslyRecommendedProductId = recommendedProductsCache.get(user._id);
      recommendedProducts = recommendedProducts.filter(product => product._id.toString() !== previouslyRecommendedProductId);

      // Select the top product
      const topProduct = recommendedProducts[0];
      if (topProduct) {
        // Log the full images object and imageUrl field
        console.log(`Product images for ${topProduct.name}:`, topProduct.images);
        const imageUrl = topProduct.images?.imageUrl;
        console.log(`Image URL fetched for product ${topProduct.name}:`, imageUrl);

        // Cache the recommended product to avoid repetition
        recommendedProductsCache.set(user._id, topProduct._id.toString());

        const message = `Check out this recommended product: ${topProduct.name}`;
        console.log(`Sending notification to ${user.email}: ${message}`);

        const result = await NotificationService.sendNotification(
          user._id,
          "Product Recommendation",
          message,
          imageUrl
        );

        if (result.success) {
          console.log(`Notification successfully sent to user ${user.email}`);
        } else {
          console.error(`Failed to send notification to user ${user.email}`);
        }
      } else {
        console.log(`No recommendations available for user ${user.email}.`);
      }
    }

    console.log("Recommendations generated and notifications sent successfully.");
  } catch (error) {
    console.error("Error generating recommendations:", error.message);
  }
};

// Schedule the recommendation task to run every minute
cron.schedule("0 * * * *", async () => {
    try {
      console.log("Running recommendation generation task...");
      await generateRecommendations();
    } catch (err) {
      console.error("Error in recommendation cron job:", err.message);
    }
  });
  
  // Schedule the order tracking notification task to run every hour
  cron.schedule("0 * * * *", async () => {
    try {
      console.log("Running order tracking notification task...");
      await sendOrderTrackingNotification();
    } catch (err) {
      console.error("Error in order tracking cron job:", err.message);
    }
  });

module.exports = { generateRecommendations };
 