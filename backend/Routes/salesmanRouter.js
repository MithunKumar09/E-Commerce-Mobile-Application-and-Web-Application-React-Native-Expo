//backend/Routes/salesmanRouter.js
const Router = require("express");
const jwt = require('jsonwebtoken');
const salesmanRoute = Router();
const bcrypt = require("bcrypt");
const Admin = require("../Models/adminModel");
const Order = require("../Models/orderModel");
const User = require('../Models/userModel');
const Salesman = require('../Models/salesmanModel');
const AssignOrder = require('../Models/AssignOrder');
const mongoose = require('mongoose');
const { authenticateSalesman } = require("../middleware/salesmanMiddleware");

const { getSalesmanProfile, updateSalesmanProfile, getAssignedOrders, getOrderById, getAddressById, getProductById, sendLocation, updateOrderStatus, updateLiveLocation, fetchAcceptedOrders, getOrderDetails, updateActivitiesOrderStatus,
} = require("../Controller/salesmanController");

// Update order status route
salesmanRoute.patch("/updateOrderStatus/:id", authenticateSalesman, updateActivitiesOrderStatus);
// Route to fetch accepted orders for a salesman
salesmanRoute.get('/acceptedOrders/:salesmanId', authenticateSalesman, fetchAcceptedOrders);
// Fetch all order details by orderId
salesmanRoute.get('/allOrders/:orderId', authenticateSalesman, getOrderDetails);

// Route to send the location
salesmanRoute.post('/sendLocation', sendLocation);
// Route to update order status
salesmanRoute.put('/updateOrderStatus', updateOrderStatus);
// Route to update live location
salesmanRoute.post('/updateLiveLocation', authenticateSalesman, updateLiveLocation);


// Route to get orders assigned to a specific salesman
salesmanRoute.get('/assignOrders/:salesmanId', authenticateSalesman, getAssignedOrders);
// Route to fetch specific order details
salesmanRoute.get('/orders/:orderId', getOrderById);
salesmanRoute.get('/addresses/:addressId', getAddressById);
salesmanRoute.get('/products/:productId', getProductById);

//backend/Routes/salesmanRouter.js
// Route to fetch the salesman's profile
salesmanRoute.get("/profile", authenticateSalesman, getSalesmanProfile);

// Route to update the salesman's profile
salesmanRoute.put("/profile", authenticateSalesman, updateSalesmanProfile);

salesmanRoute.post('/login', async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const salesman = await Salesman.findOne({ email });
      if (!salesman) {
        console.log(`Salesman not found with email: ${email}`);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      // Log both the password in the request and the stored hashed password
      console.log(`Received password: ${password}`);
      console.log(`Stored hashed password: ${salesman.password}`);
  
      // Directly compare the plaintext password with the stored hashed password
      const passwordMatch = await bcrypt.compare(password, salesman.password);
      if (!passwordMatch) {
        console.log(`Password mismatch for salesman: ${email}`);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      // Create JWT token
      const token = jwt.sign(
        { id: salesman._id, email: salesman.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
  
      console.log(`Salesman login successful: ${email}`);
      res.status(200).json({ token, email: salesman.email });
    } catch (err) {
      console.error('Error during salesman login:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });
  


  module.exports = salesmanRoute;