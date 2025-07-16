//backend/salesmanController.js
const Salesman = require("../Models/salesmanModel"); // Assuming there's a Salesman model in your database
const AssignOrder = require('../Models/AssignOrder');
const mongoose = require('mongoose');
const Order = require('../Models/orderModel');
const Address = require('../Models/addressModel'); 
const Product = require('../Models/productModel');

// backend/salesmanController.js
// Update order status
const updateActivitiesOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    console.log(`Attempting to update order ID: ${id} with status: ${orderStatus}`);

    const order = await Order.findById(id);

    if (!order) {
      console.log(`Order with ID: ${id} not found.`);
      return res.status(404).json({ message: "Order not found" });
    }

        // Add the new order status to the orderStatusHistory with timestamp
        order.orderStatusHistory.push({
          status: orderStatus,
          updatedAt: new Date(),
        });

    // Update the order status
    order.orderStatus = orderStatus;

    // Update the status of all cart items in the order
    order.cartItems = order.cartItems.map((item) => ({
      ...item,
      status: orderStatus,
    }));

    await order.save();

        // Also update the orderStatusHistory in AssignOrder model if necessary
        const assignOrder = await AssignOrder.findOne({ orderId: id });
        if (assignOrder) {
          assignOrder.orderStatusHistory.push({
            status: orderStatus,
            updatedAt: new Date(),
          });
          await assignOrder.save();
        }

    console.log(`Order updated successfully. Updated Order:`, order);

    res.status(200).json({ message: "Order status and cart item statuses updated successfully", order });
  } catch (error) {
    console.error("Error updating order status:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};




// Controller to fetch accepted orders for a salesman
const fetchAcceptedOrders = async (req, res) => {
  try {
    const { salesmanId } = req.params;

    console.log("Fetching accepted orders for salesman:", salesmanId);

    // Find orders assigned to the salesman with "Accepted" status
    const assignOrders = await AssignOrder.find({
      salesmanId,
      status: 'Accepted'
    })
      .populate('orderId')
      .exec();

    console.log("Assigned orders retrieved:", assignOrders);

    // Combine `assignOrders` with detailed `orderId` data
    const ordersWithDetails = assignOrders.map(assignOrder => ({
      ...assignOrder._doc,
      orderId: assignOrder.orderId ? assignOrder.orderId._doc : null // Spread populated order details
    }));

    console.log("Orders with details:", ordersWithDetails);
    res.json(ordersWithDetails);
  } catch (error) {
    console.error("Error fetching accepted orders:", error);
    res.status(500).send("Server error");
  }
};

// Controller function to fetch order details by orderId
const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Fetch the order from the database using the orderId
    const order = await Order.findById(orderId); // Assuming 'Order' is your Mongoose model for orders

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Return the order details
    res.status(200).json(order);
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ message: 'An error occurred while fetching the order details' });
  }
};



const sendLocation = async (req, res) => {
  try {
    const { orderId, trackingId, latitude, longitude, area, acceptedTime, locationUpdateTime } = req.body;
    console.log('Received location data:', req.body);

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const assignOrder = await AssignOrder.findOneAndUpdate(
      { orderId: orderId },
      { 
        $set: { 
          trackingId, 
          area, 
          latitude, 
          longitude, 
          locationUpdateTime, // Update the location update time
        },
        $setOnInsert: { acceptedTime }, // Set the accepted time only if the document is inserted
        $push: { // Push the new location data to the locationHistory array
          locationHistory: {
            latitude,
            longitude,
            area,
            updatedAt: new Date(),
          }
        }
      },
      { new: true, upsert: true } // Use upsert to create the document if it doesn't exist
    );

    await Order.findByIdAndUpdate(orderId, { $set: { trackingId } });

    return res.status(200).json({ message: 'Location sent successfully', assignOrder });
  } catch (error) {
    console.error('Error sending location:', error);
    return res.status(500).json({ message: 'Failed to send location to server' });
  }
};


const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status, trackingId, acceptedTime, locationUpdateTime } = req.body;
    console.log('Received order status update:', req.body);

    // Update the AssignOrder status and push to the orderStatusHistory array
    const assignOrder = await AssignOrder.findOneAndUpdate(
      { orderId: orderId },
      {
        $set: { status, trackingId, acceptedTime },
      },
      { new: true }
    );

    if (!assignOrder) {
      return res.status(404).json({ message: 'AssignOrder not found' });
    }

        // Also update the trackingId in the Order model if provided
        if (trackingId) {
          await Order.findByIdAndUpdate(orderId, { $set: { trackingId } });
        }

    return res.status(200).json({ message: 'Order status and history updated successfully', assignOrder });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ message: 'Failed to update order status' });
  }
};



/**
 * Update the live location of a salesman
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 */
const updateLiveLocation = async (req, res) => {
  const { orderId, salesmanId, latitude, longitude, area, locationUpdateTime } = req.body;

  console.log("Received data for live location:", { orderId, salesmanId, latitude, longitude, area, locationUpdateTime });

  if (!salesmanId || !orderId || !latitude || !longitude || !area || !locationUpdateTime) {
    return res.status(400).json({
      message: "All fields (orderId, salesmanId, latitude, longitude, area) are required.",
    });
  }

  try {
    // Verify if the order status is "Accepted"
    const assignOrder = await AssignOrder.findOne({ orderId });
    if (!assignOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (assignOrder.status !== "Accepted") {
      return res.status(403).json({ message: "Live location updates are only allowed for accepted orders." });
    }

    // Add new location data to locationHistory
    assignOrder.locationHistory.push({
      latitude,
      longitude,
      area,
      updatedAt: new Date(locationUpdateTime),
    });

    // Update the live location fields as well
    assignOrder.latitude = latitude;
    assignOrder.longitude = longitude;
    assignOrder.area = area;
    assignOrder.locationUpdateTime = locationUpdateTime;

    // Save the updated order with the new location history
    const updatedOrder = await assignOrder.save();

    console.log("Live location updated successfully:", updatedOrder);

    res.status(200).json({
      message: "Live location updated successfully.",
      updatedOrder,
    });
  } catch (error) {
    console.error("Error updating live location:", error.message);
    res.status(500).json({ message: "An error occurred while updating the live location." });
  }
};





// Controller to fetch orders assigned to a specific salesman
const getAssignedOrders = async (req, res) => {
  try {
    const { salesmanId } = req.params;

    console.log("Received salesmanId:", salesmanId);

    // Validate salesmanId to ensure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(salesmanId)) {
      console.error("Invalid salesmanId:", salesmanId);
      return res.status(400).json({ msg: 'Invalid salesmanId' });
    }

    console.log("Fetching assigned orders for salesmanId:", salesmanId);

    // Fetch assigned orders for the salesman
    const assignOrders = await AssignOrder.find({ salesmanId })
      .populate('orderId', 'productName customerName deliveryAddress') // Populate order details
      .exec();

    console.log("Assigned orders retrieved:", assignOrders);
    res.json(assignOrders);
  } catch (error) {
    console.error("Error fetching assigned orders:", error.message);
    res.status(500).send('Server Error');
  }
};

// Controller to fetch order details by orderId
const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log("Fetching details for orderId:", orderId);

    // If orderId is a string, no need to check ObjectId validity
    if (!orderId) {
      console.error("Missing orderId:", orderId);
      return res.status(400).json({ msg: 'Missing orderId' });
    }

    // Fetch the order details (as orderId is a string, no need for ObjectId validation)
    const order = await Order.findById(orderId);  // This works if orderId is an ObjectId
    if (!order) {
      console.error("Order not found:", orderId);
      return res.status(404).json({ msg: 'Order not found' });
    }

    console.log("Order details retrieved:", order);
    res.json(order);
  } catch (error) {
    console.error("Error fetching order details:", error.message);
    res.status(500).send('Server Error');
  }
};

// Controller to fetch address details by addressId
const getAddressById = async (req, res) => {
  try {
    const { addressId } = req.params;  // Extract addressId from the route params

    console.log("Fetching details for addressId:", addressId);

    // If addressId is a string, no need to check ObjectId validity
    if (!addressId) {
      console.error("Missing addressId:", addressId);
      return res.status(400).json({ msg: 'Missing addressId' });
    }

    // Fetch the address details
    const address = await Address.findById(addressId);
    if (!address) {
      console.error("Address not found:", addressId);
      return res.status(404).json({ msg: 'Address not found' });
    }

    console.log("Address details retrieved:", address);
    res.json(address);
  } catch (error) {
    console.error("Error fetching address details:", error.message);
    res.status(500).send('Server Error');
  }
};

const getProductById = async (req, res) => {
  try {
    const { productId } = req.params;  // Extract productId from the route params

    console.log("Fetching details for productId:", productId);

    // If productId is a string, no need to check ObjectId validity
    if (!productId) {
      console.error("Missing productId:", productId);
      return res.status(400).json({ msg: 'Missing productId' });
    }

    // Fetch the product details
    const product = await Product.findById(productId);
    if (!product) {
      console.error("Product not found:", productId);
      return res.status(404).json({ msg: 'Product not found' });
    }

    console.log("Product details retrieved:", product);
    res.json(product);
  } catch (error) {
    console.error("Error fetching product details:", error.message);
    res.status(500).send('Server Error');
  }
};




const getSalesmanProfile = async (req, res) => {
  try {
    const { salesmanId } = req.user; // Extract the salesmanId from the authenticated token

    if (!salesmanId) {
      return res.status(400).json({ error: "Salesman ID is missing from the request." });
    }

    const salesman = await Salesman.findById(salesmanId);
    if (!salesman) {
      return res.status(404).json({ error: "Salesman not found." });
    }

    res.status(200).json({
      _id: salesman._id, // Include salesman ID in the response
      email: salesman.email,
      name: salesman.name,
      state: salesman.state || "",
      nationality: salesman.nationality || "",
    });
  } catch (error) {
    console.error("Error fetching salesman profile:", error.message);
    res.status(500).json({ error: "Failed to fetch salesman profile." });
  }
};


// Controller to update the salesman's profile
const updateSalesmanProfile = async (req, res) => {
  try {
    const { salesmanId } = req.user; // Extract the salesmanId from the authenticated token
    const { name, state, nationality } = req.body;

    const salesman = await Salesman.findById(salesmanId);
    if (!salesman) {
      return res.status(404).json({ error: "Salesman not found." });
    }

    // Update profile details
    salesman.name = name || salesman.name;
    salesman.state = state || salesman.state;
    salesman.nationality = nationality || salesman.nationality;

    await salesman.save();

    res.status(200).json({ message: "Profile updated successfully." });
  } catch (error) {
    console.error("Error updating salesman profile:", error.message);
    res.status(500).json({ error: "Failed to update salesman profile." });
  }
};

module.exports = {   getSalesmanProfile, updateSalesmanProfile, getAssignedOrders, getOrderById, getAddressById, getProductById,   sendLocation,
  updateOrderStatus, updateLiveLocation, fetchAcceptedOrders, getOrderDetails, updateActivitiesOrderStatus,
}