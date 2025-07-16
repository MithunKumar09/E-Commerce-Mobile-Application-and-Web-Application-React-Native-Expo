//backend/Controller/userController.js
const Category = require("../Models/categoryModel");
const Brand = require("../Models/brandModel");
const Images = require("../Models/imageModel");
const Product = require("../Models/productModel");
const User = require("../Models/userModel");
const OTP = require("../Models/otpModel");
const crypto = require("crypto");
const { sendOtpToEmail, sendOtpToPhone } = require('../utils/otpService');
const jwt = require('jsonwebtoken');
const Cart = require("../Models/cartModel");
const mongoose = require('mongoose');
const Wishlist = require("../Models/wishlistModel");
const Address = require("../Models/addressModel");
const Order = require("../Models/orderModel");
const Voucher = require("../Models/voucherModel");
const Wallet = require("../Models/walletModel");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const AssignOrder = require('../Models/AssignOrder');
const Carousel = require('../Models/CarouselModel');
const TodayDeal = require('../Models/TodayDealModel');

const clients = new Map();
const DebitTransactionHistory = require('../Models/debitTransactionHistoryModel');

// Backend - When a bid is placed
const placeBid = async (req, res) => {
  try {
    const { voucherId } = req.params;
    const { userId, email, bidAmount } = req.body;

    // Find the voucher by ID
    const voucher = await Voucher.findById(voucherId);
    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Voucher not found' });
    }

    // Get the current highest bid
    const highestBid = voucher.currentBids.length > 0
      ? Math.max(...voucher.currentBids.map((bid) => bid.bidAmount))
      : voucher.price;

    if (bidAmount <= highestBid) {
      return res.status(400).json({ success: false, message: 'Bid amount must be higher than the current highest bid' });
    }

    // Update the bid
    const existingBid = voucher.currentBids.find((bid) => bid.userId && bid.userId.toString() === userId);
    if (existingBid) {
      existingBid.bidAmount = bidAmount; // Update the existing bid amount
    } else {
      voucher.currentBids.push({ userId, email, bidAmount }); // Add a new bid
    }

    await voucher.save();

    // Notify all connected clients about the updated voucher
    const wss = req.app.get("wss");
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "voucherUpdated", voucher }));
        }
      });
    }

    return res.status(200).json({ success: true, message: 'Bid placed successfully', voucher });
  } catch (error) {
    console.error('Error placing bid:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};




// Controller to fetch Active and Expired vouchers
const getActiveAndExpiredVouchers = async (req, res) => {
  try {
    const vouchers = await Voucher.find({
      is_expired: { $in: ['Active', 'Expired'] }
    });

    if (!vouchers || vouchers.length === 0) {
      return res.status(404).json({ message: 'No vouchers found.' });
    }

    res.status(200).json(vouchers);
  } catch (error) {
    console.error('Error fetching vouchers:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

/**
 * Get voucher by ID
 * @route GET /user/vouchers/:id
 * @access Public
 */
const getVoucherById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Fetching voucher with ID: ${id}`); // Log the ID received in the request
    
    // Fetch voucher from the database
    const voucher = await Voucher.findById(id);
    
    console.log('Voucher data retrieved:', voucher); // Log the voucher data retrieved

    if (!voucher) {
      console.log('Voucher not found for ID:', id); // Log if voucher is not found
      return res.status(404).json({ message: 'Voucher not found' });
    }

    res.status(200).json(voucher); // Send the voucher data in the response
  } catch (error) {
    console.error('Error fetching voucher by ID:', error); // Log the error if an exception occurs
    res.status(500).json({ message: 'Server error' });
  }
};



//backend/Controller/userController.js
const cancelOrder = async (req, res) => {
  const { orderId, reason, imageUri, paymentIntentId } = req.body;
  const { userId } = req.user;

  try {
    console.log("Request received with data:", { orderId, reason, imageUri, userId, paymentIntentId });

    const validOrderId = mongoose.Types.ObjectId.isValid(orderId) ? new mongoose.Types.ObjectId(orderId) : orderId;
    const validUserId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    console.log("Validated orderId and userId:", { validOrderId, validUserId });

    const order = await Order.findOne({ _id: validOrderId, userId: validUserId });
    if (!order) {
      console.log("Order not found for provided ID and user.");
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    if (order.cancellation && order.cancellation.status === "cancelled") {
      console.log("Order is already cancelled.");
      return res.status(400).json({ success: false, message: "Order is already cancelled." });
    }

    console.log("Order found:", order);

    // Webhook verification for payment refund
    if (paymentIntentId) {
      const isVerified = await verifyWebhookForRefund(paymentIntentId);
      if (!isVerified) {
        return res.status(400).json({ success: false, message: "Refund verification failed." });
      }
    }

    // Handle cancellation logic based on payment method
    if (order.paymentMethod === "wallet") {
      console.log("Processing Wallet cancellation.");
      let userWallet = await Wallet.findOne({ userId: validUserId });
      if (!userWallet) {
        console.log("User wallet not found.");
        return res.status(404).json({ success: false, message: "User wallet not found." });
      }

      let refundAmount = Number(order.total) || 0;
      console.log("Refund amount calculated:", refundAmount);

      // Analyze debit history with FIFO logic for refund calculation
      const debitHistory = [...userWallet.debitTransactionHistory].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      console.log("Sorted debit history:", debitHistory);

      const refundDetails = [];
      for (const entry of debitHistory) {
        if (refundAmount <= 0) break;

        const refundable = Math.min(entry.amount, refundAmount);
        refundDetails.push({ ...entry, refundAmount: refundable });
        entry.amount -= refundable;
        refundAmount -= refundable;
      }

      console.log("Refund details prepared:", refundDetails);

      // Update wallet with refund amount
      userWallet.debitTransactionHistory = debitHistory.filter((entry) => entry.amount > 0);
      userWallet.amount += refundDetails.reduce((sum, ref) => sum + ref.refundAmount, 0);

      // Record each refunded amount in the debit transaction history
      refundDetails.forEach((ref) => {
        userWallet.debitTransactionHistory.push({
          userId: validUserId,
          userEmail: order.userEmail,
          amount: ref.refundAmount,
          transactionId: new mongoose.Types.ObjectId(),
          transactionType: "debit",
          status: "succeeded",
          intentType: "wallet",
        });
      });

      await userWallet.save();
      console.log("Wallet updated successfully.");

      // Mark the order as cancelled
      order.cancellation = { reason, cancelledAt: new Date(), status: "cancelled" };
      order.orderStatus = "Cancelled";
      order.orderStatusHistory.push({ status: "Cancelled", updatedAt: new Date() });
      order.cartItems.forEach((item) => (item.status = "Cancelled"));
    } else {
      console.log("Invalid payment method provided.");
      return res.status(400).json({ success: false, message: "Invalid payment method." });
    }

    if (reason === "Damaged Product" && imageUri) {
      console.log("Damaged product with image URI:", imageUri);
      if (!imageUri || imageUri === "") {
        return res.status(400).json({ success: false, message: "Image URI is missing or invalid." });
      }
      order.cancellation.image = imageUri;
    }

    await order.save();
    console.log("Order cancellation saved successfully.");
    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully.",
      data: { order },
    });
  } catch (error) {
    console.error("Error canceling order:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};


// Helper function for webhook verification
const verifyWebhookForRefund = async (paymentIntentId) => {
  if (!paymentIntentId || paymentIntentId.trim() === "") {
    console.error("Error: paymentIntentId is missing or invalid.");
    return false;
  }

  try {
    console.log("Retrieving payment intent from Stripe:", paymentIntentId);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      console.error("Payment intent not found:", paymentIntentId);
      return false;
    }

    console.log("Payment intent retrieved:", paymentIntent);

    if (paymentIntent.status !== "succeeded") {
      console.error(`Payment intent verification failed. Status: ${paymentIntent.status}`);
      return false;
    }

    console.log("Payment intent verified successfully.");
    return true;
  } catch (error) {
    console.error("Error verifying webhook for payment intent:", paymentIntentId, "Error:", error.message);
    return false;
  }
};



const retrieveWishlist = async (req, res) => {
  const { userId } = req.user;  // Get the user ID from the decoded token (assuming token contains userId)

  try {
    console.log("Fetching wishlist for userId:", userId);  // Log the userId for which wishlist is being fetched

    // Fetch the wishlist for the user
    const wishlistItems = await Wishlist.find({ userId });

    if (!wishlistItems || wishlistItems.length === 0) {
      console.log("No wishlist items found for userId:", userId);  // Log if no wishlist items are found
      return res.status(404).json({ message: "Wishlist not found" });
    }

    // Retrieve detailed product information for each productId in the wishlist
    const detailedWishlist = [];

    for (let item of wishlistItems) {
      const product = await Product.findById(item.productId);

      if (!product) {
        console.log("Product not found for productId:", item.productId);  // Log if product is not found
        detailedWishlist.push({ ...item.toObject(), productDetails: null });
      } else {
        detailedWishlist.push({
          ...item.toObject(),
          productDetails: {
            productId: product._id,
            name: product.name,
            description: product.description,
            productPrice: product.productPrice,
            salePrice: product.salePrice,
            category: product.category,
            discount: product.discount,
            brand: product.brand,
            quantity: product.quantity,
            color: product.color,
            images: product.images,
            cashOnDelivery: product.cashOnDelivery,
            codAmount: product.codAmount,
          },
        });
      }
    }

    console.log("Wishlist with product details:", detailedWishlist);  // Log the detailed wishlist

    res.status(200).json(detailedWishlist);
  } catch (error) {
    console.error('Error occurred while fetching wishlist:', error);  // Log the error in detail
    res.status(500).json({ message: "An error occurred while fetching the wishlist" });
  }
};

//backend/Controller/userController.js
const getSuggestions = async (req, res) => {
  const { query } = req.query;

  if (!query || query.trim() === '') {
    console.log('Query parameter is missing or empty.');
    return res.status(400).json({ error: 'Query parameter is required.' });
  }

  try {
    const regex = new RegExp(query, 'i'); // Case-insensitive regex for partial matching

    console.log(`Fetching suggestions for query: "${query}"`);

    // Search in Brands
    const brands = await Brand.find({ name: regex }).select('_id name').limit(5);
    console.log('Brands found:', brands);

    // Search in Categories
    const categories = await Category.find({ name: regex }).select('_id name').limit(5);
    console.log('Categories found:', categories);

    // Search in Products
    const products = await Product.find({ name: regex }).select('_id name').limit(5);
    console.log('Products found:', products);

    // Combine results and remove duplicates
    const suggestions = [...brands, ...categories, ...products];
    const uniqueSuggestions = suggestions.filter(
      (v, i, a) => a.findIndex((t) => t.name === v.name) === i
    );

    console.log('Combined suggestions:', suggestions);
    console.log('Unique suggestions:', uniqueSuggestions);

    return res.status(200).json({ suggestions: uniqueSuggestions });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error. Please try again later.' });
  }
};



//backend/Controller/userController.js
// Fetch all deals
const getAllActiveDeals = async (req, res) => {
  try {
    // Fetch deals with automationStatus 'active' or 'expired'
    const deals = await TodayDeal.find({ automationStatus: { $in: ['active', 'expired'] } })
      .sort({ createdAt: -1 });
    // Add console log to check retrieved deals
    console.log('Retrieved active deals:', deals);

    res.status(200).json(deals);
  } catch (error) {
    console.error('Error fetching active deals:', error);
    res.status(500).json({ message: 'Failed to fetch active deals', error: error.message });
  }
};

// Controller to fetch scheduled deals
const fetchScheduledDeals = async (req, res) => {
  try {
    // Fetch only deals that are 'scheduled' and populate the product details using productId
    const scheduledDeals = await TodayDeal.find({ automationStatus: 'scheduled' })
      .populate('productId')  // Populating complete product details using productId
      .exec();

    console.log("Fetched scheduled deals:", scheduledDeals);  // Log the fetched data

    // Log the populated product details for each scheduled deal
    scheduledDeals.forEach(deal => {
      console.log("Populated product details for deal:", deal.productId);
    });

    if (scheduledDeals.length === 0) {
      return res.status(404).json({ message: 'No scheduled deals found.' });
    }

    res.status(200).json(scheduledDeals);
  } catch (error) {
    console.error("Error fetching scheduled deals:", error);
    res.status(500).json({ message: 'Server error while fetching deals.' });
  }
};


// Controller function to get assignOrder details by orderId
const getAssignOrderByOrderId = async (req, res) => {
  try {
    const assignOrder = await AssignOrder.findOne({ orderId: req.params.orderId }).populate('assignedBy');
    if (!assignOrder) {
      return res.status(404).send({ message: "Order not found" });
    }
    res.status(200).send(assignOrder);
  } catch (error) {
    res.status(500).send({ error: "Server error" });
  }
};

// Controller function to get complete order details by orderId
const getCompleteOrderDetails = async (req, res) => {
  try {
    const orderDetails = await Order.findOne({ _id: req.params.orderId }).populate([
      { path: 'cartItems.productId', select: 'name price' },
      { path: 'selectedAddressId', select: 'street city state zip' },
    ]);
    if (!orderDetails) {
      return res.status(404).send({ message: "Order not found" });
    }
    res.status(200).send(orderDetails);
  } catch (error) {
    res.status(500).send({ error: "Server error" });
  }
};

// Validate ObjectId helper function
const isValidObjectId = (id) => {
  console.log("Validating ObjectId:", id);
  const isValid = typeof id === "string" && mongoose.Types.ObjectId.isValid(id);
  console.log("Is valid ObjectId:", isValid);
  return isValid;
};

//backend/Controller/userController.js
// Fetch products controller
const getProducts = async (req, res) => {
  try {
    console.log("Fetching products from the database...");

    const products = await Product.find({});
    
    if (products && products.length > 0) {
      console.log("Products retrieved successfully:", products.length, "products found.");
    } else {
      console.log("No products found in the database.");
    }

    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:");
    console.error("Error message:", error.message);
    console.error("Error stack trace:", error.stack);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

// Fetch all products
const getAllProducts = async (req, res) => {
  try {
    console.log("Fetching all products...");
    const products = await Product.find({});
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching all products:", error.message);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

// Fetch single product by ID and populate fields
const getProductById = async (req, res) => {
  try {
    // console.log(`Fetching product with ID: ${req.params.id}...`);

    const { id } = req.params;
    const { populate } = req.query;

    // Validate ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      console.error("Invalid Product ID format.");
      return res.status(400).json({ message: "Invalid Product ID format" });
    }

    // Query the product by ID
    let query = Product.findById(id);

    // Dynamically populate fields based on query parameters
    if (populate) {
      query = query.populate(populate);
    }

    const product = await query;

    if (!product) {
      console.error(`Product with ID ${id} not found.`);
      return res.status(404).json({ message: "Product not found" });
    }

    // console.log("Product details fetched successfully:", product);
    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product by ID:", error.message);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

const updateProduct = async (req, res) => {
  try {
      const { id } = req.params;

      console.log(`[UpdateProduct] Request received to update product with ID: ${id}`);
      console.log(`[UpdateProduct] Request body:`, req.body);

      const updatedProduct = await Product.findByIdAndUpdate(id, req.body, { new: true });
      if (!updatedProduct) {
          console.log(`[UpdateProduct] Product with ID ${id} not found.`);
          return res.status(404).json({ message: "Product not found" });
      }

      console.log(`[UpdateProduct] Product updated successfully:`, updatedProduct);

      res.status(200).json(updatedProduct);

      // Notify connected clients
      const sendProductUpdate = req.app.get("sendProductUpdate");
      if (sendProductUpdate) {
          console.log(`[UpdateProduct] Broadcasting updated product to connected clients...`);
          sendProductUpdate(updatedProduct);
      } else {
          console.error(`[UpdateProduct] sendProductUpdate function is not defined on app.`);
      }
  } catch (error) {
      console.error(`[UpdateProduct] Error updating product:`, error);
      res.status(500).json({ message: "Failed to update product" });
  }
};






//backend/Controller/userController.js
const fetchimages = async (req, res) => {
  try {
    const id = req.params.id;
    const image = await Images.findById(id);
    if (image) {
      res.json({ imageUrl: image.thumbnailUrl }); // Adjust based on your image model structure
    } else {
      res.status(404).json({ error: "Image not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
}

//backend/Controller/userController.js
// Function to get all categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find(); // Retrieve all categories from the database
    res.status(200).json(categories); // Send categories in response
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error });
  }
};

// Function to get all carousel images
const getCarouselImages = async (req, res) => {
  try {
    const carouselImages = await Carousel.find(); // Retrieve all carousel images from the database
    res.status(200).json(carouselImages); // Send carousel images in response
  } catch (error) {
    res.status(500).json({ message: 'Error fetching carousel images', error });
  }
};


const fetchProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.find({ category });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching related products" });
  }
};

//backend/Controller/userController.js
const fetchSingleProduct = async (req, res) => {
  const { productId } = req.params;
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }

}

//backend/Controller/userController.js
const registerUser = async (req, res) => {
  try {
    console.log('Received data from frontend:', req.body);
    const { username, email, phone } = req.body;

    if (!username || !email || !phone) {
      console.log('Validation failed: Missing fields');
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Conflict: Email already in use');
      return res.status(409).json({ message: 'Email already in use' });
    }

    const newUser = new User({ username, email, phone });
    await newUser.save();
    console.log('New user registered:', newUser);

    // Generate a JWT token for the user
    const token = jwt.sign({ id: newUser._id, email: newUser.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ id: newUser._id, token });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};


const sendOtp = async (req, res) => {
  try {
    const { identifier } = req.body;
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otpCode = crypto.randomInt(100000, 999999).toString();

    // Store the OTP in the database with expiration
    await OTP.create({ userId: user._id, otp: otpCode });

    if (/^\d+$/.test(identifier)) {
      // If it's a phone number, format it with the country code
      const formattedPhoneNumber = `+91${identifier}`;
      await sendOtpToPhone(formattedPhoneNumber, otpCode);
    } else {
      // If it's an email, send the OTP to email
      await sendOtpToEmail(identifier, otpCode);
    }

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { identifier, otp } = req.body; // identifier can be phone or email

    // Step 1: Find the user by email or phone
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Step 2: Find the OTP record for the retrieved userId
    const otpRecord = await OTP.findOne({ userId: user._id });

    if (!otpRecord) {
      return res.status(404).json({ message: 'OTP not found or expired' });
    }

    // Step 3: Check if the OTP matches
    if (otpRecord.otp === otp) {

      user.isVerified = true;
      await user.save();

      // Step 4: Generate JWT token
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET, // Adjust token expiration as needed
      );

      res.status(200).json({ message: 'OTP verified, login successful', token, username: user.username, id: user._id });
    } else {
      res.status(400).json({ message: 'Invalid OTP or OTP expired' });
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// backend/Controller/userController.js
const addToCart = async (userId, { productId, quantity, salesPrice }) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid User ID");
    }
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error("Invalid Product ID");
    }

    // Fetch product details
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Check stock availability
    if (product.quantity < quantity) {
      throw new Error("Not enough stock available");
    }

    // Deduct product quantity
    product.quantity -= quantity;
    await product.save();

    // Find or create cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // Check if product is already in the cart
    if (cart.items.some((item) => item.productId.toString() === productId.toString())) {
      throw new Error("Product is already in the cart");
    }

    // Add product to cart
    cart.items.push({ productId, quantity, salesPrice });
    await cart.save();

    return cart;
  } catch (error) {
    console.error("Error in addToCart:", error.message);
    throw error;
  }
};

// backend/Controller/userController.js
// Fetch cart data for a specific user
const getCartItems = async (req, res) => {
  const { userId } = req.params;

  try {
    console.log("Fetching cart for userId:", userId); // Log userId

    // Validate userId as a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error("Invalid User ID format:", userId); // Log invalid userId
      return res.status(400).json({ error: "Invalid User ID format" });
    }

    const cart = await Cart.findOne({ userId }).select("items.productId items.quantity items.salesPrice"); // Only select productId, no population

    if (!cart) {
      console.log("No cart found for userId:", userId); // Log when no cart is found
      return res.status(404).json({ message: "Cart not found" });
    }

    console.log("Cart data retrieved successfully:", cart); // Log retrieved cart data
    return res.status(200).json(cart);
  } catch (error) {
    console.error("Error fetching cart:", error.message); // Log error details
    return res.status(500).json({ error: "Failed to fetch cart data" });
  }
};


// Controller function to fetch cart product details by productId
const getCartProductDetails = async (req, res) => {
  const { productId } = req.params; // Get the productId from the request parameters

  try {
    if (!isValidObjectId(productId)) {
      console.log("Invalid Product ID format:", productId);
      return res.status(400).json({ message: "Invalid Product ID" });
    }
    // Find the product by productId
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Return the product details in the response
    return res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product details:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// backend/Controller/userController.js

const removeCartProduct = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user?.id || req.params.userId;

    console.log("Remove Cart Product Request: ", { userId, itemId }); // Log request details

    if (!userId || !itemId) {
      console.warn("Missing userId or itemId in the request.");
      return res.status(400).json({ message: "User ID and Cart Item ID are required." });
    }

    const cart = await Cart.findOne({ userId });
    console.log("Cart found for User ID:", userId, cart ? "Yes" : "No"); // Log if cart exists

    if (!cart) {
      return res.status(404).json({ message: "Cart not found." });
    }

    // Locate the item by its unique _id
    const itemIndex = cart.items.findIndex((item) => item.productId.toString() === itemId);
    console.log("Item Index:", itemIndex); // Log the index of the item in the cart

    if (itemIndex === -1) {
      console.warn(`Item with ID: ${itemId} not found in cart for User ID: ${userId}`);
      return res.status(404).json({ message: "Item not found in cart." });
    }

    const item = cart.items[itemIndex];
    const productId = item.productId;

    // Find the product in the Product model
    const product = await Product.findById(productId);
    if (!product) {
      console.warn("Product not found for ID:", productId);
      return res.status(404).json({ message: "Product not found." });
    }

    // Add the quantity back to the product model
    product.quantity += item.quantity;
    await product.save();
    console.log(`Product quantity updated successfully for product ID: ${productId}`);

    // Remove the item from the cart
    cart.items.splice(itemIndex, 1);
    await cart.save();

    console.log(`Item with ID: ${itemId} removed successfully for User ID: ${userId}`);
    res.status(200).json({ message: "Item removed from cart and product quantity updated." });
  } catch (error) {
    console.error("Error removing item:", error.message);
    res.status(500).json({ message: "Internal server error.", error: error.message });
  }
};



const clearCart = async (req, res) => {
  const { userId } = req.params;

  try {
    // Find the user's cart and clear the items array
    const result = await Cart.findOneAndUpdate(
      { userId: userId }, // Find the cart for the specific user
      { $set: { items: [] } }, // Clear the items array
      { new: true } // Return the updated cart
    );

    if (result) {
      return res.status(200).json({ message: 'Cart cleared successfully' });
    } else {
      return res.status(404).json({ message: 'Cart not found' });
    }
  } catch (error) {
    console.error("Error clearing cart:", error);
    return res.status(500).json({ message: 'Server error while clearing cart' });
  }
};

// backend/Controller/userController.js
const addAddress = async (req, res) => {
  const { userId, username, addressLine, pincode, street, state, flatNumber, phoneNumber, addressType, default: isDefault } = req.body;

  try {
    // Log received data to check the incoming request
    console.log('Received data:', req.body);

    // Check if userId is valid
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Invalid user ID:', userId);  // Log invalid userId
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Ensure userName is provided
    if (!username || username.trim() === '') {
      console.error('User name is missing or empty');  // Log missing userName
      return res.status(400).json({ message: 'User name is required' });
    }

    // Normalize addressType to match the enum ('Home', 'Work', 'Others')
    const validAddressTypes = ['Home', 'Work', 'Others'];
    const normalizedAddressType = addressType.charAt(0).toUpperCase() + addressType.slice(1).toLowerCase();

    console.log('Normalized addressType:', normalizedAddressType);  // Log the normalized addressType

    if (!validAddressTypes.includes(normalizedAddressType)) {
      console.error('Invalid address type:', normalizedAddressType);  // Log invalid address type
      return res.status(400).json({ message: `Invalid address type. Valid types are: ${validAddressTypes.join(', ')}` });
    }

    // Ensure userId is converted to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // If no address is marked as default, set the new one as default
    let newAddressDefault = isDefault;
    if (!newAddressDefault) {
      const existingAddresses = await Address.find({ userId });
      if (existingAddresses.length === 0) {
        newAddressDefault = true; // Mark first address as default if none exists
      }
    }

    // Create a new address document
    const newAddress = new Address({
      userId: userObjectId,
      username,
      addressLine,
      pincode,
      street,
      state,
      flatNumber,
      phoneNumber,
      addressType: normalizedAddressType,  // Use the normalized addressType
      default: newAddressDefault,
    });

    // Log the address before saving to ensure all data is correct
    console.log('Creating new address:', newAddress);

    // Save address to the database
    await newAddress.save();

    res.status(200).json({ message: 'Address saved successfully', address: newAddress });
  } catch (error) {
    console.error('Error saving address:', error);  // Log any errors that occur during the save process
    res.status(500).json({ message: 'Failed to save address' });
  }
};


const getAddress = async (req, res) => {
  console.log("Fetching addresses for user:", req.params.userId); // Log to see if the route is being triggered
  try {
    const addresses = await Address.find({ userId: req.params.userId });
    console.log("Fetched addresses:", addresses); // Log the fetched addresses
    res.status(200).json(addresses);
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// backend/Controller/userController.js
const getUserAddress = async (req, res) => {
  const { addressId } = req.params; // Get address ID from request parameters

  try {
    const address = await Address.findById(addressId); // Find the address by ID

    if (!address) {
      return res.status(404).json({ message: 'Address not found' }); // Handle not found
    }

    res.status(200).json(address); // Respond with the address
  } catch (error) {
    console.error("Error fetching address:", error);
    res.status(500).json({ message: 'Server error' }); // Handle server error
  }
};


//successful
const editAddress = async (req, res) => {
  const { addressId } = req.params;  // Extracting addressId from params
  const { userName, addressLine, pincode, street, state, flatNumber, phoneNumber, addressType } = req.body;

  try {
    // Ensure that addressId is valid
    if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({ message: 'Invalid address ID' });
    }

    // Find and update the address by ID
    const updatedAddress = await Address.findOneAndUpdate(
      { _id: addressId, userId: req.body.userId },  // Use addressId and userId for matching
      {
        userName,
        addressLine,
        pincode,
        street,
        state,
        flatNumber,
        phoneNumber,
        addressType
      },
      { new: true }
    );

    if (!updatedAddress) {
      return res.status(404).json({ message: 'Address not found or does not belong to the user' });
    }

    res.status(200).json({ message: 'Address updated successfully', address: updatedAddress });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ message: 'Failed to update address' });
  }
};

// userController.js - updateAddressUser 
const updateAddressUser = async (req, res) => {
  const { selectedAddressId } = req.body;
  const { userId } = req.params; // User ID from URL parameters

  try {
    // Ensure valid userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Ensure valid selectedAddressId
    if (!mongoose.Types.ObjectId.isValid(selectedAddressId)) {
      return res.status(400).json({ message: 'Invalid address ID' });
    }

    // Set all other addresses to non-default
    await Address.updateMany({ userId, _id: { $ne: selectedAddressId } }, { $set: { default: false } });

    // Set the selected address to default
    const updatedAddress = await Address.findOneAndUpdate(
      { _id: selectedAddressId, userId },
      { $set: { default: true } },
      { new: true }
    );

    if (!updatedAddress) {
      return res.status(404).json({ message: 'Address not found or user mismatch' });
    }

    res.status(200).json({ message: 'Address updated successfully', address: updatedAddress });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ message: 'Failed to update address' });
  }
};



// userController.js - deleteAddress
const deleteAddress = async (req, res) => {
  const { addressId } = req.params;  // Getting the addressId from the URL parameter
  const { userId } = req.body; // User ID for validation

  try {
    // Ensure addressId is provided and valid
    if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
      console.error('Invalid or missing address ID:', addressId);  // Log invalid addressId
      return res.status(400).json({ message: 'Invalid address ID' });
    }

    // Ensure userId is provided and valid
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Invalid or missing user ID:', userId);  // Log invalid userId
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Find and delete the address by addressId and userId
    const deletedAddress = await Address.findOneAndDelete({
      _id: addressId,
      userId: userId, // Ensure address belongs to the correct user
    });

    if (!deletedAddress) {
      return res.status(404).json({ message: 'Address not found or does not belong to the user' });
    }

    res.status(200).json({ message: 'Address deleted successfully', address: deletedAddress });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ message: 'Failed to delete address' });
  }
};




const removeWishlist = async (req, res) => {
  try {
    // Ensure the userId exists in the request user object
    if (!req.user || !req.user.userId) {
      return res.status(400).json({ message: "User ID not found in token" });
    }

    await Wishlist.findOneAndDelete({ productId: req.params.itemId, userId: req.user.userId });
    res.status(200).json({ message: 'Item removed from wishlist' });
  } catch (error) {
    console.error("Error in removeWishlist:", error);  // Log detailed error
    res.status(500).json({ message: error.message, error: error.message });
  }
};

// backend/controllers/userController.js
const getWishlist = async (req, res) => {
  try {
    // Ensure userId is available from the token
    if (!req.user || !req.user.userId) {
      return res.status(400).json({ message: "User ID not found in token" });
    }

    const userId = req.user.userId;

    // Check if the userId is valid as an ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Ensure correct instantiation of ObjectId using new keyword
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Find wishlist items associated with the userId
    const wishlistItems = await Wishlist.find({ userId: userObjectId })
      .populate('productId');  // Populate the associated product details

    if (!wishlistItems || wishlistItems.length === 0) {
      return res.status(404).json({ message: "No wishlist items found" });
    }

    // Log the retrieved wishlist items for debugging
    console.log("Wishlist items retrieved:", wishlistItems);

    // Return the wishlist items along with the populated product details
    res.status(200).json(wishlistItems);
  } catch (error) {
    console.error("Error in getWishlist:", error);
    res.status(500).json({ message: "Error retrieving wishlist", error: error.message });
  }
};

// backend/controllers/userController.js
const addWishlistToDatabase = async (userId, productId, wishlistStatus) => {
  try {
    console.log("Received request to add/update wishlist item:", { userId, productId, wishlistStatus });

    // Add or update wishlist logic
    const existingWishlistItem = await Wishlist.findOne({ userId, productId });

    if (existingWishlistItem) {
      console.log("Wishlist item found. Updating status:", existingWishlistItem);
      existingWishlistItem.wishlistStatus = wishlistStatus;
      await existingWishlistItem.save();
      console.log("Wishlist item updated successfully:", existingWishlistItem);

      // Return the updated wishlist with populated productId
      const updatedWishlist = await Wishlist.find({ userId }).populate("productId");
      console.log("Updated wishlist after modification:", updatedWishlist);
      return updatedWishlist;
    }

    const newWishlistItem = new Wishlist({ userId, productId, wishlistStatus });
    console.log("No existing item found. Creating new wishlist item:", newWishlistItem);
    await newWishlistItem.save();
    console.log("New wishlist item added successfully:", newWishlistItem);

    // Return the updated wishlist with populated productId
    const updatedWishlist = await Wishlist.find({ userId }).populate("productId");
    console.log("Updated wishlist after adding new item:", updatedWishlist);
    return updatedWishlist;
  } catch (error) {
    console.error("Error in addWishlistToDatabase:", error.message);
    throw error;
  }
};

const removeFromWishlistDatabase = async (userId, productId) => {
  try {
    console.log("Received request to remove wishlist item:", { userId, productId });

    // Remove the item from the wishlist
    const result = await Wishlist.findOneAndDelete({ userId, productId });
    if (!result) {
      console.log("No wishlist item found to remove for userId:", userId, "productId:", productId);
      return null;  // Return null if no item was found to delete
    }

    console.log("Wishlist item removed successfully:", result);

    // Return the updated wishlist after deletion
    const updatedWishlist = await Wishlist.find({ userId }).populate("productId");
    console.log("Updated wishlist after removal:", updatedWishlist);
    return updatedWishlist;
  } catch (error) {
    console.error("Error in removeFromWishlistDatabase:", error.message);
    throw error;
  }
};




// backend/controllers/userController.js
// Controller to place an order
const placeOrder = async (req, res) => {
  try {
    console.log('Received order data:', req.body);

    const { userId, total, cartItems, selectedAddressId, paymentMethod, orderId, orderSummary, paymentDetails } = req.body;

    if (!userId || !total || !cartItems || !selectedAddressId || !paymentMethod || !orderId || !orderSummary) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newOrder = new Order({
      _id: orderId,
      userId,
      total,
      cartItems,
      selectedAddressId,
      paymentMethod,
      paid: paymentMethod !== 'COD',
      paymentDetails: paymentMethod === 'COD' ? null : paymentDetails,
      orderSummary,
      orderStatus: 'Pending',
      orderStatusHistory: [{ status: 'Pending', updatedAt: new Date() }],
    });

    console.log('New order to be saved:', newOrder);

    await newOrder.save();

    // Update product stock
    for (const item of cartItems) {
      const product = await Product.findById(item.productId);
      if (product) {
        const deductQuantity = item.quantity > 1 ? item.quantity - 1 : 0; // Deduct only extra quantities beyond 1
        product.quantity = Math.max(0, product.quantity - deductQuantity);
        await product.save();
      } else {
        console.warn(`Product not found for ID: ${item.productId}`);
      }
    }

    res.status(201).json({
      message: 'Order placed successfully',
      order: newOrder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


const removeCartItems = async (req, res) => {
  try {
      const { userId, productIds } = req.body;

      if (!userId || !productIds || !Array.isArray(productIds)) {
          return res.status(400).json({ success: false, message: 'Invalid request data.' });
      }

      const updatedCart = await Cart.updateOne(
          { userId },
          { $pull: { items: { productId: { $in: productIds } } } }
      );

      if (updatedCart.nModified === 0) {
          return res.status(404).json({ success: false, message: 'No items found in the cart to remove.' });
      }

      res.status(200).json({ success: true, message: 'Cart updated successfully.' });
  } catch (error) {
      console.error('Error updating cart:', error.message);
      res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};



// backend/controllers/userController.js
const getOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, orderId } = req.query;

    // Query for orders based on userId and optionally orderId
    const query = { userId };
    if (orderId) {
      query._id = orderId;
    }

    // Fetch orders from the database
    const orders = await Order.find(query)
      .populate('cartItems.productId', 'name price imageUrl') // Populate product details
      .populate('selectedAddressId', 'addressLine street state pincode flatNumber phoneNumber addressType') // Populate address details
      .populate('paymentDetails', 'intentId transactionType status amount paymentMethod')
      .exec();

    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, message: 'No orders found.' });
    }

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error('Error retrieving orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error. Unable to retrieve orders.',
    });
  }
};

// Fetch product details by productId
const getProductDetails = async (req, res) => {
  try {
    const productId = req.params.productId;

    // Validate productId
    if (!productId) {
      return res.status(400).json({ message: "Product ID is required." });
    }

    // Find the product in the database by productId
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    // Return product details
    res.status(200).json({
      productId: product._id,
      name: product.name,
      description: product.description,
      productPrice: product.productPrice,
      salePrice: product.salePrice,
      category: product.category,
      brand: product.brand,
      quantity: product.quantity,
      color: product.color,
      images: product.images,
      cashOnDelivery: product.cashOnDelivery,
      codAmount: product.codAmount,
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(500).json({ message: "Server error, please try again later." });
  }
};



const fetchCodDetails = async (req, res) => {
  const { productIds } = req.body;

  try {
    const products = await Product.find({ _id: { $in: productIds } }).select('cashOnDelivery codAmount');
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching COD details:', error);
    res.status(500).json({ success: false, message: 'Error fetching COD details' });
  }
};



// backend/controllers/userController.js
const getOrderDetail = async (req, res) => {
  try {
    const { userId } = req.params;
    const { orderId } = req.query;

    // Query for orders based on userId and optionally orderId
    const query = { userId };
    if (orderId) {
      query._id = orderId;
    }

    // Fetch orders from the database
    const orders = await Order.find(query)
      .populate('cartItems.productId', 'name price imageUrl') // Populate product details
      .populate('selectedAddressId', 'address city state zipCode') // Populate address details
      .populate('paymentDetails', 'intentId transactionType status amount paymentMethod')
      .exec();

    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, message: 'No orders found.' });
    }

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error('Error retrieving orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error. Unable to retrieve orders.',
    });
  }
};











const getProductSuggestions = async (req, res) => {
  try {
    // Fetch product words from the database
    const products = await Product.find({}, 'word'); // Fetch only the 'word' field
    const suggestions = products.map(product => product.word); // Map to an array of words

    // Respond with the suggestions
    res.status(200).json({ suggestions });
  } catch (error) {
    console.error("Error fetching product suggestions:", error);
    res.status(500).json({ message: "Error fetching product suggestions" });
  }
};

//userController.js
const getUserDetails = async (req, res) => {
  try {
    // Log the incoming request
    console.log("[APP LOG] Incoming request: GET /api/user/info/:id");
    
    // Get the userId from the request params or token
    const userId = req.params.id || req.user?.userId; // Use `req.user.userId` if no `:id` in params
    console.log("Validating ObjectId:", userId);

    // Check if userId exists
    if (!userId) {
      console.error("User ID not provided");
      return res.status(400).json({ message: "User ID is required" });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error("Invalid ObjectId format");
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    console.log("Is valid ObjectId:", true);

    // Query all users to verify data presence
    const allUsers = await User.find({});
    console.log("[APP LOG] Available users in the database:", allUsers);

    // Query the specific user
    const user = await User.findById(userId).select("username email phone isVerified");
    console.log("[APP LOG] Query result for user ID:", user);

    if (!user) {
      console.warn("[APP LOG] User not found for ID:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("[APP LOG] Fetched user info:", user);
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user info:", error);
    res.status(500).json({ message: "Error fetching user information" });
  }
};


const updateQuantityOfProduct = async (req, res) => {
  const { productId, quantity } = req.body;

  try {
    // Validate that productId and quantity are provided
    if (!productId || !quantity) {
      return res.status(400).json({ error: 'Product ID and quantity are required' });
    }

    // Update the product's stock in the database
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $inc: { quantity: -quantity } }, // Decrease stock by the ordered quantity
      { new: true } // Return the updated document
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({ message: 'Quantity updated successfully', product: updatedProduct });
  } catch (error) {
    console.error('Error updating quantity:', error);
    res.status(500).json({ error: 'Server error updating quantity' });
  }
};

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

const getWallet = async (req, res) => {
  const userId = req.params.userId;

  try {
    let wallet = await Wallet.findOne({ userId });

    // If no wallet is found, create a new one with default values
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0, transactions: [] });
      await wallet.save();
    }

    res.json({
      balance: wallet.balance,
      transactions: wallet.transactions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};



const updateQuantity = async (req, res) => {
  const { userId, productId } = req.params;
  const { quantity } = req.body;

  try {
    const cart = await Cart.findOne({ userId });
    if (cart) {
      const item = cart.items.find(item => item.productId.toString() === productId);
      if (item) {
        item.quantity = quantity;
        await cart.save();
        return res.status(200).json({ message: 'Quantity updated successfully' });
      }
    }
    return res.status(404).json({ message: 'Item not found in cart' });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error });
  }
};





module.exports = { placeBid, getVoucherById, getActiveAndExpiredVouchers, updateProduct, addWishlistToDatabase, removeFromWishlistDatabase, addToCart, fetchScheduledDeals, retrieveWishlist, cancelOrder, getAllActiveDeals, getSuggestions, getUserDetails, getAllProducts, getProductById, getCarouselImages,
  
  getProducts, removeCartItems, fetchimages, fetchCodDetails, getCategories, fetchProductsByCategory, fetchSingleProduct, registerUser, sendOtp, verifyOtp, getCartItems, clearCart,
  getWishlist, removeWishlist, addAddress, getAddress, deleteAddress, placeOrder, getOrders, getOrderDetail, getProductSuggestions, updateQuantityOfProduct, getCartProductDetails,
  updateAddressUser, getUserAddress, getVouchersUserSide, getWallet, removeCartProduct, editAddress, updateQuantity, getProductDetails, getAssignOrderByOrderId, getCompleteOrderDetails,
}