//backend/controllers/chatbotController.js
const Cart = require('../Models/cartModel');
const Order = require('../Models/orderModel');
const AssignOrder = require('../Models/AssignOrder');
const Product = require('../Models/productModel');
const intentHandler = require('../utils/intentHandler');
const axios = require("axios");
const Wishlist = require("../Models/wishlistModel");
const Feedback = require('../Models/feedbackModel');
const User = require('../Models/userModel');

// Function to handle feedback submission
const submitFeedback = async (req, res) => {
  const { userId, feedbackText, rating } = req.body;

  try {
      // Log the incoming data from the frontend
      console.log("Received feedback data from frontend:", {
          userId,
          feedbackText,
          rating,
      });

      // Validate the feedback data
      if (!userId || !feedbackText || !rating) {
          console.log("Validation failed. Missing fields.");
          return res.status(400).json({ success: false, message: 'All fields are required.' });
      }

      // Optionally, you can check if the user exists
      const user = await User.findById(userId);
      if (!user) {
          console.log(`User with ID ${userId} not found.`);
          return res.status(404).json({ success: false, message: 'User not found.' });
      }

      // Create new feedback entry
      const feedback = new Feedback({
          userId,
          feedbackText,
          rating,
      });

      // Save the feedback to the database
      await feedback.save();
      console.log("Feedback saved successfully.");

      // Return a success response
      res.status(201).json({ success: true, message: 'Feedback submitted successfully.' });
  } catch (error) {
      // Log the error details to the console
      console.error('Error submitting feedback:', error);

      // Return error response
      res.status(500).json({
          success: false,
          message: 'Oops! Something went wrong while submitting your feedback. Please try again.',
      });
  }
};



const recommend_products = async (user_query, mongo) => {
    try {
        // Fetch all products
        const allProducts = await Product.find();
        console.log("All products fetched:", allProducts);
        
        // Fetch user data from Cart, Orders, and Wishlist
        const cartItems = await Cart.find({ userId: user_query.userId }).populate('items.productId');
        const orders = await Order.find({ userId: user_query.userId });
        const wishlistItems = await Wishlist.find({ userId: user_query.userId }).populate('productId');
  
        // Log the fetched data for debugging
        console.log("Cart items:", cartItems);
        console.log("Orders:", orders);
        console.log("Wishlist items:", wishlistItems);
  
        // Combine products from cart, orders, and wishlist
        const viewedProducts = [
          ...cartItems.map(item => item.productId).filter(product => product !== null && product !== undefined),
          ...orders.flatMap(order => order.cartItems.map(cartItem => cartItem.productId)).filter(product => product !== null && product !== undefined),
          ...wishlistItems.map(item => item.productId).filter(product => product !== null && product !== undefined)
      ];
  
      console.log("Viewed products:", viewedProducts);
  
        // Ensure all viewed products are ObjectIds
        const viewedProductIds = viewedProducts.map(product => product._id ? product._id.toString() : product.toString());
  
        // Create a score for each product based on user's interaction
        let productScores = {};
  
        viewedProducts.forEach(product => {
            const productId = product._id ? product._id.toString() : product.toString();
            if (productScores[productId]) {
                productScores[productId]++;
            } else {
                productScores[productId] = 1;
            }
        });
  
        // Filter the all products based on product interactions (cart, orders, wishlist)
        const recommendedProducts = allProducts
            .filter(product => !viewedProductIds.includes(product._id.toString())) // Compare as strings
            .map(product => ({
                product,
                score: productScores[product._id.toString()] || 0
            }))
            .sort((a, b) => b.score - a.score)  // Sort by score (high to low)
            .slice(0, 1); // Return the top product
  
        // If no recommendation is found, return a default fallback
        if (recommendedProducts.length === 0) {
            return { reply: "Sorry, no products found for your recommendation." };
        }
  
        const recommendedProduct = recommendedProducts[0].product;
  
        // Return the product recommendation
        return {
            reply: {
                name: recommendedProduct.name,
                description: recommendedProduct.description,
                price: recommendedProduct.productPrice,
                category: recommendedProduct.category,
                imageUrl: recommendedProduct.images.imageUrl
            }
        };
    } catch (error) {
        console.error("Error recommending products:", error);
        return { reply: "Error fetching recommended products." };
    }
  };
  

const chatbotResponse = async (req, res) => {
    console.log("Request received at /api/chatbot/message");

    const { intent, userId } = req.body;
    console.log("Message from frontend:", intent);

    if (!intent || !userId) {
        console.log("Missing intent or userId:", { intent, userId }); // Log the missing values
        return res.status(400).json({ reply: "Intent or User ID missing." });
    }

    if (intent.includes("My Cart Items")) {
        try {
            console.log("Fetching cart items for user:", userId);
            
            // Find cart by userId and populate the product information
            const cart = await Cart.findOne({ userId }).populate({
                path: 'items.productId',
                model: 'Product',
                select: 'name productPrice'
            });

            if (!cart || cart.items.length === 0) {
                console.log("No items found in cart.");
                return res.json({ reply: "Your cart is currently empty." });
            }

            // Format cart items for a cleaner response
            const formattedCartItems = cart.items.map(item => ({
              _id: item._id,
                name: item.productId.name,
                price: item.productId.productPrice,
            }));

            console.log("Formatted cart items:", formattedCartItems);

            return res.json({ reply: formattedCartItems });
        } catch (error) {
            console.error("Error fetching cart items:", error);
            return res.status(500).json({ reply: "Error fetching cart items." });
        }
    }

    if (intent.includes("My Orders")) {
        try {
            const orders = await Order.find({ userId }); // Fetch orders for the user
            if (orders.length === 0) {
                return res.json({ reply: "You have no orders yet." });
            }

            const formattedOrders = orders.map(order => ({
              _id: order._id,
                orderId: order._id,
                totalPrice: order.total,
                date: order.orderDate,
            }));
            console.log("Formatted orders items:", formattedOrders);

            return res.json({
                reply: formattedOrders.length > 0 ? formattedOrders : "You have no orders."
            });
        } catch (error) {
            console.error("Error fetching orders:", error);
            return res.status(500).json({ reply: "There was an error fetching your orders." });
        }
    }

// Check if message is related to product recommendations
if (intent.includes("Recommend Product")) {
  try {
      console.log("Retrieving recommended products for userId:", userId);  // Log userId for context
      const response = await recommend_products({ userId }, req.app.locals.mongo);
      
      console.log("Response from recommend_products:", response);  // Log the response to inspect the data
      return res.json(response);
  } catch (error) {
      console.error("Error recommending products:", error);  // Log error if there's an issue
      return res.status(500).json({ reply: "There was an error fetching recommended products." });
  }
}

    return res.json({ reply: "I'm here to assist you with any other questions!" });
};

/**
 * Track an assigned order based on the provided tracking ID.
 */
const trackOrder = async (req, res) => {
  const { trackingId } = req.body;

  try {
    // Validate input
    if (!trackingId) {
      console.log("No tracking ID provided.");
      return res.status(400).json({ message: "Tracking ID is required." });
    }

    console.log("Received tracking ID:", trackingId);

    // Find the assigned order details by tracking ID
    const assignOrderDetails = await AssignOrder.findOne({ trackingId }).populate('orderId', 'orderId');

    if (!assignOrderDetails) {
      console.log("No assigned order found for the tracking ID:", trackingId);
      return res.status(404).json({ message: "Assigned order not found." });
    }

    console.log("Retrieved assigned order details:", assignOrderDetails);

    // Retrieve the full order details using the populated orderId
    const fullOrderDetails = await Order.findById(assignOrderDetails.orderId)
      .select('orderStatus cartItems')
      .populate('cartItems.productId', 'name description'); // Populate product details in cart items if needed

    if (!fullOrderDetails) {
      console.log("No order found for the order ID:", assignOrderDetails.orderId);
      return res.status(404).json({ message: "Order details not found." });
    }

    console.log("Retrieved full order details:", fullOrderDetails);

    // Prepare the response
    const response = {
      orderId: assignOrderDetails.orderId,
      latitude: assignOrderDetails.latitude,
      longitude: assignOrderDetails.longitude,
      area: assignOrderDetails.area,
      locationUpdateTime: assignOrderDetails.locationUpdateTime,
      orderStatus: fullOrderDetails.orderStatus,
      cartItems: fullOrderDetails.cartItems,
    };

    console.log("Prepared response:", response);

    // Respond with the extracted details
    return res.status(200).json({ assignOrderDetails: response });
  } catch (error) {
    console.error("Error fetching assigned order details:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};





module.exports = { chatbotResponse, trackOrder, submitFeedback };



  // Check if message is related to product recommendations
//   if (message.toLowerCase().includes("recommend")) {
//     try {
//       const response = await axios.post('http://192.168.89.187:5001/api/query', { query: message });
//       console.log("Full response data from /api/query:", response.data);
      
//       if (response.status !== 200) {
//         console.error("Error fetching recommendations: Status code", response.status);
//         return res.status(500).json({ reply: "There was an error fetching recommended products." });
//       }
      
//       const { intent, products } = response.data;
//       console.log("Extracted intent:", intent);
//       console.log("Extracted products:", products);

//       if (products && products.length > 0) {
//         const formattedProducts = products.map(product => formatProductDetails(product));
//         return res.json({ reply: formattedProducts });
//       } else {
//         return res.json({ reply: "Sorry, no products found for your recommendation." });
//       }
//     } catch (error) {
//       console.error("Error fetching recommendation products:", error.message);
//       return res.status(500).json({ reply: "There was an error fetching recommended products." });
//     }
//   }

//   // Product-related responses
//   if (message.toLowerCase().includes("recent products")) {
//     try {
//       const recentProducts = await Product.find().sort({ createdAt: -1 }).limit(3);
//       const formattedProducts = recentProducts.map(formatProductDetails);
//       return res.json({ reply: formattedProducts });
//     } catch (error) {
//       console.error("Error fetching recent products:", error);
//       return res.status(500).json({ reply: "There was an error fetching recent products." });
//     }
//   }

//   if (message.toLowerCase().includes("costly product") || message.toLowerCase().includes("expensive item")) {
//     try {
//       const costlyProducts = await Product.find().sort({ price: -1 }).limit(5);
//       const formattedProducts = costlyProducts.map(formatProductDetails);
//       return res.json({ reply: formattedProducts });
//     } catch (error) {
//       console.error("Error fetching expensive products:", error);
//       return res.status(500).json({ reply: "There was an error fetching the most expensive products." });
//     }
//   }

//   if (message.toLowerCase().includes("low budget product") || message.toLowerCase().includes("cheap product")) {
//     try {
//       const lowBudgetProducts = await Product.find().sort({ price: 1 }).limit(5);
//       const formattedProducts = lowBudgetProducts.map(formatProductDetails);
//       return res.json({ reply: formattedProducts });
//     } catch (error) {
//       console.error("Error fetching low-budget products:", error);
//       return res.status(500).json({ reply: "There was an error fetching low-budget products." });
//     }
//   }

//   // Rule-based response check
//   const ruleBasedResponse = intentHandler(message);
//   if (ruleBasedResponse !== null) {
//     return res.json({ reply: ruleBasedResponse });
//   }
// };

// // Helper function to format product details for response
// function formatProductDetails(product) {
//   return {
//     id: product._id,
//     name: product.name,
//     description: product.description || 'No description available.',
//     price: product.price || 'N/A',
//     imageUrl: product.imageUrl || null
//   };
// }
