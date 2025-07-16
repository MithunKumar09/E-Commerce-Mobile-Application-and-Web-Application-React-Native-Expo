//backend/Rutes/userRoutes.js
const express = require('express'); // Import express module
const userRoute = express.Router();
const authenticateUser = require("../middleware/authMiddleware");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require("../Models/orderModel");
const NotificationService = require("../services/notificationService");
const User = require("../Models/userModel");
const mongoose = require('mongoose');
const WebSocket = require("ws");

const { placeBid, getVoucherById, getActiveAndExpiredVouchers, updateProduct, addWishlistToDatabase, removeFromWishlistDatabase, addToCart, fetchScheduledDeals, retrieveWishlist, cancelOrder, getSuggestions, getAllActiveDeals, removeCartItems, getUserDetails, getCarouselImages, getProducts,fetchimages,getCategories, fetchCategoryById, fetchSingleProduct,registerUser,sendOtp,verifyOtp,getCartItems,clearCart, addWishlist,getWishlist,removeWishlist,addAddress
    ,getAddress,deleteAddress, placeOrder, getOrders, getOrderDetail, getProductSuggestions, getUserInfo, removeFromWishlist, updateQuantityOfProduct, updateAddressUser, getUserAddress, getVouchersUserSide,
    getWallet, getAllProducts, getProductById, fetchCodDetails, removeCartProduct, editAddress, updateQuantity, fetchProductsByCategory, getProductDetails, getAssignOrderByOrderId, getCompleteOrderDetails, getCartProductDetails,
 } = require("../Controller/userController");

 // Route to get Active and Expired vouchers
userRoute.get('/vouchers', getActiveAndExpiredVouchers);
// Route to fetch voucher by ID
userRoute.get('/vouchers/:id', getVoucherById);
// Route to place a bid
userRoute.post('/vouchers/:voucherId/placeBid', placeBid);

 // Route to fetch wishlist (protected route)
userRoute.get("/retriveWishlist", authenticateUser, retrieveWishlist);

 // Cancel Order Route
userRoute.post('/order/cancel', authenticateUser, cancelOrder);

//backend/Routes/userRoutes.js
userRoute.post("/store-push-token", authenticateUser, async (req, res) => { 
   const { pushToken } = req.body;

   // Log the incoming push token to see if it's correctly received
   console.log("Received push token:", pushToken);

   if (!pushToken) {
     return res.status(400).send({ error: "Push token is required" });
   }

   try {
     // Log the userId decoded from the token to ensure the authentication middleware is working
     console.log("Authenticated user ID:", req.user.userId);

     // Convert the string userId from the token to an ObjectId and find the user
     const user = await User.findOne({ _id: new mongoose.Types.ObjectId(req.user.userId) }); 

     if (!user) {
       console.log("User not found for userId:", req.user.userId);
       return res.status(404).send({ error: "User not found" });
     }

     // Log the user object to verify if the correct user is fetched from the database
     console.log("User found:", user);

     // Update user's push token in the database
     user.pushToken = pushToken;
     await user.save();

     // Log confirmation that the push token is stored
     console.log("Push token stored successfully for user:", user.email);

     res.status(200).send({ message: "Push token stored successfully" });

     // Optionally, send a notification after storing the token
     await NotificationService.sendNotification(user._id, "Welcome", "You are now subscribed for notifications.");
     
   } catch (error) {
     console.error("Error storing push token:", error.message);
     res.status(500).send({ error: "Server error" });
   }
 });



 // Define the route for fetching suggestions
 userRoute.get('/suggestions', getSuggestions);

 // Fetch all deals
 userRoute.get('/todaydeals/active', getAllActiveDeals);
// Route to fetch scheduled deals
userRoute.get('/todaydeals/scheduled', fetchScheduledDeals);

// Route to fetch all products
userRoute.get("/products", getAllProducts);

 //backend/Routes/userRoutes.js
 userRoute.get("/products",getProducts);

// Route to fetch a single product by ID and populate fields
userRoute.get("/products/:id", getProductById);
// Update product (for testing WebSocket updates)
userRoute.put("/products/:id", updateProduct);

// Route to fetch cart product details by productId
userRoute.get('/:productId', getCartProductDetails);

// Route to retrieve assignOrder by orderId
userRoute.get('/assignOrder/:orderId', getAssignOrderByOrderId);
// Route to retrieve complete order details using orderId
userRoute.get('/orderDetails/:orderId', getCompleteOrderDetails);
//backend/Routes/userRoutes.js
userRoute.get("/images/:id",fetchimages);

userRoute.get("/products/category/:category", fetchProductsByCategory);
//backend/Routes/userRoutes.js
userRoute.get("/product/:productId",fetchSingleProduct);
// userRoute.get('/getUserDetails', authenticateUser, getUserDetails);

userRoute.post("/register",registerUser);
//backend/Routes/userRoutes.js
userRoute.post("/sendOtp",sendOtp);
userRoute.post("/verify-otp",verifyOtp);

//backend/Routes/userRoutes.js
// Add to Cart with WebSocket notification
userRoute.post("/cart/add/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { productId, quantity, salesPrice } = req.body;

    const updatedCart = await addToCart(userId, { productId, quantity, salesPrice });

    // Notify WebSocket clients if connection exists
    const wss = req.app.get("wss");
    const clients = req.app.get("clients");
    if (clients && clients[userId]) {
      clients[userId].send(JSON.stringify({ event: "cartUpdated", cart: updatedCart }));
      console.log(`WebSocket notification sent to userId: ${userId}`);
    } else {
      console.warn(`WebSocket connection not available for userId: ${userId}`);
    }

    res.status(201).json({ message: "Product added to cart", cart: updatedCart });
  } catch (error) {
    console.error("Error adding to cart:", error.message);
    res.status(500).json({ error: "Failed to add product to cart" });
  }
});



//backend/Routes/userRoutes.js
userRoute.get("/cart/:userId", authenticateUser, getCartItems);

userRoute.delete("/cart/:userId/:itemId", authenticateUser, removeCartProduct);
userRoute.delete("/clearCart/:userId",clearCart);
userRoute.put("/cart/:userId/:productId",updateQuantity)

//backend/Routes/userRoutes.js
userRoute.post("/wishlist", authenticateUser, async (req, res) => {
  try {
    const { productId, wishlistStatus } = req.body;
    const userId = req.user.userId;

    const updatedWishlist = await addWishlistToDatabase(userId, productId, wishlistStatus);

    // WebSocket notification
    const clients = req.app.get("clients");
    if (clients && clients[userId]) {
      clients[userId].send(
        JSON.stringify({
          event: "wishlistUpdated",
          wishlist: updatedWishlist,
        })
      );
      console.log(`Wishlist update notification sent to userId: ${userId}`);
    }

    res.status(201).json({ message: "Wishlist updated successfully", wishlist: updatedWishlist });
  } catch (error) {
    console.error("Error updating wishlist:", error.message);
    res.status(500).json({ message: "Failed to update wishlist" });
  }
});

// Ensure WebSocket notification is added for removal as well
userRoute.delete("/wishlist/:productId", authenticateUser, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.userId;

    const updatedWishlist = await removeFromWishlistDatabase(userId, productId);

    const clients = req.app.get("clients");
    if (clients && clients[userId]) {
      clients[userId].send(
        JSON.stringify({
          event: "wishlistUpdated",
          wishlist: updatedWishlist,
        })
      );
      console.log(`Wishlist removal notification sent to userId: ${userId}`);
    }

    res.status(200).json({ message: "Product removed from wishlist successfully", wishlist: updatedWishlist });
  } catch (error) {
    console.error("Error removing from wishlist:", error.message);
    res.status(500).json({ message: "Failed to remove product from wishlist" });
  }
});

//backend/Routes/userRoutes.js
   // Route to get all categories
   userRoute.get("/category", getCategories);

   // Get all carousel images
   userRoute.get('/carousel', getCarouselImages);



userRoute.get("/wishlist", authenticateUser,getWishlist);

//backend/Routes/userRoutes.js
userRoute.post("/addAddress", addAddress);
userRoute.get("/addresses/:userId",getAddress);
//backend/Routes/userRoutes.js
userRoute.get("/address/:addressId", getUserAddress);
userRoute.delete('/deleteAddress/:addressId', authenticateUser, deleteAddress);
//backend/Routes/userRoutes.js
userRoute.put("/updateAddress/:userId", updateAddressUser);
userRoute.put("/editAddress/:addressId", authenticateUser, editAddress);
//backend/Routes/userRoutes.js
userRoute.get("/info/:userId",authenticateUser,getUserDetails);

//backend/Routes/userRoutes.js
// Route to place an order
userRoute.post('/place-order', placeOrder);
userRoute.post('/cart/remove-items', removeCartItems);

// userRoute.post("/checkout/placeorder",placeOrder);
//backend/Routes/userRoutes.js
userRoute.get("/orders/:userId", getOrders);
// Route to fetch product details by productId
userRoute.get("/:productId", getProductDetails);
//backend/Routes/userRoutes.js
userRoute.post('/fetch-cod-details', fetchCodDetails);
userRoute.get("/order/:userId", getOrderDetail);

userRoute.get("/product-suggestions",getProductSuggestions);

userRoute.post("/updateQuantity",updateQuantityOfProduct);

userRoute.get("/getVoucher", getVouchersUserSide);

userRoute.get("/wallet/:userId",getWallet);



module.exports = userRoute;