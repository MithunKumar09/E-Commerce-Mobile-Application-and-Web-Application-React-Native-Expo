//backend/Routes/adminRoutes.js
const Router = require("express");
const jwt = require('jsonwebtoken');
const adminRoute = Router();
const bcrypt = require("bcrypt");
const Admin = require("../Models/adminModel");
const Order = require("../Models/orderModel");
const Bid = require('../Models/bidModel');
const User = require('../Models/userModel');
const Salesman = require('../Models/salesmanModel');
const { verifyAdminToken } = require("../middleware/adminMiddleware");
const mongoose = require('mongoose');
const WebSocket = require("ws");

const { loginAdmin, getAllSalesmen, createDeal, getAllDeals, deleteDealById, addCarouselImage, getCarouselImages, deleteCarouselImage, getAllUsers, addCategory, addBrand, getcategories, updateCategory, deleteCategory, getBrand, editBrand, deleteBrand, addProduct, fetchProduct, fetchimages,
  deleteProducts, createSalesman, assignOrderToSalesman, getAssignedOrders, acceptOrderBySalesman, fetchOrderStatus, editProduct, getOrders, updateOrderStatus, getDashboardCounts, createVoucher, updateVoucher, deleteVoucher, getVouchers, getVoucherById,
} = require("../Controller/adminController");

// Routes for managing vouchers
adminRoute.post("/voucher", createVoucher); // Create a new voucher
adminRoute.put("/voucher/:id", updateVoucher); // Update an existing voucher
adminRoute.delete("/voucher/:id", deleteVoucher); // Delete a voucher
adminRoute.get("/vouchers", getVouchers); // Get all vouchers
adminRoute.get("/voucher/:id", getVoucherById); // Get a specific voucher by ID


//backend/Routes/adminRoutes.js
adminRoute.post('/todaydeals', createDeal);
// Fetch all deals
adminRoute.get('/todaydeals', getAllDeals);
// Delete a deal by ID
adminRoute.delete('/todaydeals/:id', deleteDealById);

// Route to assign an order to a salesman
adminRoute.post('/assign-order', verifyAdminToken, assignOrderToSalesman);
adminRoute.get('/assigned-orders', verifyAdminToken, getAssignedOrders);
adminRoute.get('/assign-order/:orderId', verifyAdminToken, fetchOrderStatus);
adminRoute.post('/accept-order', verifyAdminToken, acceptOrderBySalesman);

//backend/Routes/adminRoutes.js
// Route to create a new salesman account
adminRoute.post('/create-salesman', createSalesman);

// Route to get all salesmen accounts
adminRoute.get('/salesman', getAllSalesmen);

//backend/Routes/adminRoutes.js
// Route to delete a salesman account
adminRoute.delete('/delete-salesman/:id', async (req, res) => {
  const { id } = req.params;

  // Validate if the id is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid salesman ID' });
  }

  try {
    const salesman = await Salesman.findById(id);

    if (!salesman) {
      return res.status(404).json({ error: 'Salesman not found' });
    }

    // Use findByIdAndDelete instead of remove
    await Salesman.findByIdAndDelete(id);

    res.status(200).json({ message: 'Salesman deleted successfully' });
  } catch (error) {
    console.error('Error deleting salesman:', error);
    res.status(500).json({ error: 'An error occurred while deleting the salesman account' });
  }
});


// Check if email exists in the database
adminRoute.get('/check-email', async (req, res) => {
  try {
    const { email } = req.query;

    // Check if the email exists in the database
    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      return res.json({ exists: true });
    }

    return res.json({ exists: false });
  } catch (error) {
    console.error("Error checking email:", error);
    return res.status(500).send('Server Error');
  }
});

//backend/Routes/adminRoutes.js
adminRoute.post('/login', loginAdmin);

// Update Admin profile (email & password)
adminRoute.put("/update", verifyAdminToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const email = req.body.email || req.admin.email; // Use provided email or authenticated admin's email

  console.log("Request to update admin profile received. Admin Email:", email);
  // console.log("Old Password Provided:", oldPassword);
  // console.log("New Password Provided:", newPassword);

  try {
    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, req.admin.password);
    if (!isMatch) {
      console.log("Old password does not match.");
      return res.status(401).json({ message: "Incorrect old password" });
    }
    console.log("Old password verified successfully.");

    // Validate email (must start with "admin")
    if (!email.startsWith("admin")) {
      console.log("Email validation failed: Email must start with 'admin'");
      return res.status(400).json({ message: 'Email must start with "admin"' });
    }
    console.log("Email validated successfully.");

    // Update email and password
    req.admin.email = email;
    console.log("Updated admin email to:", req.admin.email);

    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      console.log("Hashed password before saving:", hashedPassword);
      req.admin.password = hashedPassword;
      console.log("Updated password successfully.");
    }

    // Save updated admin data
    await req.admin.save();
    console.log("Admin profile updated in the database.");

    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error" });
  }
});




// Admin cancel order route
adminRoute.put('/cancel-order/:orderId', async (req, res) => {
  try {
    console.log(req.body, "kkkkkkkkkkkkkkkkk");

    const { userId, productId, cancelReason } = req.body;
    const { orderId } = req.params;

    // Find the order by ID
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Find the specific product in cartItems by productId
    const productToCancel = order.cartItems.find(
      (item) => item.productId.toString() === productId
    );

    if (!productToCancel) {
      return res.status(404).json({ message: 'Product not found in order' });
    }

    // Update the status of the specific product to 'Cancelled'
    productToCancel.status = 'Cancelled';

    // Set the cancellation details for the order
    order.cancellation = {
      reason: cancelReason,  // Reason for cancellation
      cancelledAt: new Date(), // Cancellation timestamp
      status: 'Cancelled',  // Mark as cancelled
    };



    // Save the order with the updated details
    await order.save();
    // Return the updated order with cancellation details
    res.status(200).json({
      message: 'Order cancelled successfully',
      cancellation: order.cancellation,  // Return the cancellation details
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error handling cancellation request' });
  }
});

adminRoute.put('/return-order/:orderId', async (req, res) => {
  try {
    const { userId, productId, selectedReason } = req.body;
    const { orderId } = req.params;

    // Find the order by ID
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const productToReturn = order.cartItems.find(
      (item) => item.productId.toString() === productId
    );

    if (!productToReturn) {
      return res.status(404).json({ message: 'Product not found in order' });
    }

    // Update the status of the specific product to 'Cancelled'
    productToReturn.status = 'Returned';


    // Save the order with the updated details
    await order.save();

    // Return the updated order with return details
    res.status(200).json({
      message: 'Order returned successfully',
      returnDetails: order.returnDetails,  // Return the return details
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error handling return request' });
  }
});

adminRoute.get('/dashboardCounts', getDashboardCounts);
//backend/Routes/adminRoutes.js
adminRoute.get('/carousel', getCarouselImages);
adminRoute.post('/carousel', addCarouselImage);
adminRoute.delete('/carousel/:id', deleteCarouselImage);  // Added delete route

adminRoute.get("/users", getAllUsers);
// backend/Routes/adminRoutes.js
adminRoute.post("/addcategory", addCategory);
adminRoute.get("/categories", getcategories);
adminRoute.put('/updateCategory/:id', updateCategory);
adminRoute.delete('/categories/:id', deleteCategory);  // Updated endpoint for delete


adminRoute.post("/addbrand", addBrand);
adminRoute.get("/brands", getBrand);
adminRoute.put('/updateBrand/:id', editBrand);
adminRoute.delete("/deleteBrand/:id", deleteBrand);

// backend/Routes/adminRoutes.js
adminRoute.post("/addProducts", addProduct);
adminRoute.get("/products", fetchProduct);
adminRoute.get('/products/:id', fetchimages);
adminRoute.delete("/deleteProducts/:id", deleteProducts);
adminRoute.put('/updateProducts/:id', editProduct);

adminRoute.get("/orders", getOrders);
// backend/Routes/adminRoutes.js
adminRoute.patch("/orders/:orderId", updateOrderStatus);

module.exports = adminRoute;