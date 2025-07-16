//backend/Controller/adminController.js
const Carousel = require('../Models/CarouselModel');
const Category = require("../Models/categoryModel");
const Brand = require("../Models/brandModel");
const Images = require("../Models/imageModel");
const Product = require("../Models/productModel");
const Order = require("../Models/orderModel");
const Voucher = require("../Models/voucherModel");
const User = require('../Models/userModel');
const Bid = require('../Models/bidModel'); 
const Admin = require("../Models/adminModel");
const Salesman = require('../Models/salesmanModel');
const AssignOrder = require('../Models/AssignOrder');
const jwt = require('jsonwebtoken');
const bcrypt = require("bcrypt");
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const TodayDeal = require('../Models/TodayDealModel');
const nodeCron = require('node-cron');

// Create a new voucher
const createVoucher = async (req, res) => {
  try {
    const {
      name,
      description,
      productName,
      voucherPrice,
      productPrice,
      image,
      startDate,
      startTime,
      endDate,
      endTime,
    } = req.body;

    // Log the received data
    console.log('Received voucher data:', {
      name,
      description,
      productName,
      voucherPrice,
      productPrice,
      image,
      startDate,
      startTime,
      endDate,
      endTime,
    });

    // Ensure that the startDate, startTime, endDate, and endTime are properly formatted
    const startDateTime = new Date(`${startDate} ${startTime}`);
    const endDateTime = new Date(`${endDate} ${endTime}`);

    // Log date parsing results
    console.log('Parsed start date and time:', startDateTime);
    console.log('Parsed end date and time:', endDateTime);

    if (isNaN(startDateTime) || isNaN(endDateTime)) {
      return res.status(400).json({ error: 'Invalid date or time format.' });
    }

    // Initialize the currentBids array with the default bid (voucher price)
    const defaultBid = {
      userId: null, // No user for the default bid
      email: 'default@admin.com', // Placeholder email for the default bid
      bidAmount: voucherPrice, // Default bid is the starting price
    };

    const voucher = new Voucher({
      voucher_name: name,
      details: description,
      product_name: productName,
      imageUrl: image, // Assuming the image is a file path or URL
      price: voucherPrice,
      productPrice: productPrice,
      start_time: startDateTime,
      end_time: endDateTime,
      winner_bid_id: null,
      is_expired: 'Scheduled', // Changed from false to 'Scheduled'
      eligible_rebid_users: [],
      rebid_active: false,
      currentBids: [defaultBid], // Add the default bid here
    });

    console.log('Voucher object to be saved:', voucher);

    await voucher.save();

    // Broadcast updated vouchers to all connected clients
    const updatedVouchers = await Voucher.find({});
    const { sendVoucherUpdate } = req.app.settings;
    sendVoucherUpdate(updatedVouchers);

    return res.status(201).json({ message: "Voucher created successfully", voucher });
  } catch (error) {
    console.error("Error creating voucher: ", error);
    return res.status(500).json({ error: "Error creating voucher" });
  }
};


const updateVoucherStatus = async () => {
  try {
    const currentDate = new Date(); // Current date and time
    const currentTimestamp = currentDate.getTime(); // Get the current timestamp

    // Retrieve all vouchers
    const vouchers = await Voucher.find({});

    for (const voucher of vouchers) {
      const voucherStartDate = new Date(voucher.start_time); // Start date and time
      const voucherEndDate = new Date(voucher.end_time); // End date and time

      const voucherStartTimestamp = voucherStartDate.getTime(); // Timestamp for start datetime
      const voucherEndTimestamp = voucherEndDate.getTime(); // Timestamp for end datetime

      if (currentTimestamp >= voucherStartTimestamp && currentTimestamp <= voucherEndTimestamp) {
        // Update to active if within the active window
        if (voucher.is_expired !== 'Active') {
          voucher.is_expired = 'Active';
          await voucher.save();
          console.log(`Voucher ${voucher._id} status updated to Active.`);
        }
      } else if (currentTimestamp < voucherStartTimestamp) {
        // Update to scheduled if before the active window
        if (voucher.is_expired !== 'Scheduled') {
          voucher.is_expired = 'Scheduled';
          await voucher.save();
          console.log(`Voucher ${voucher._id} status updated to Scheduled.`);
        }
      } else if (currentTimestamp > voucherEndTimestamp) {
        // Update to expired if beyond the end datetime
        if (voucher.is_expired !== 'Expired') {
          voucher.is_expired = 'Expired';
          await voucher.save();
          console.log(`Voucher ${voucher._id} status updated to Expired.`);
        }
      }
    }
  } catch (error) {
    console.error('Error updating voucher statuses:', error);
  }
};

// Schedule the voucher status update to run every minute (adjust the interval as needed)
nodeCron.schedule('* * * * *', updateVoucherStatus);



// Update an existing voucher
const updateVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      productName,
      voucherPrice,
      productPrice,
      image,
      startDate,
      startTime,
      endDate,
      endTime,
    } = req.body;

    // Convert date strings to Date objects
    const startTimeDate = new Date(`${startDate}T${startTime}`);
    const endTimeDate = new Date(`${endDate}T${endTime}`);

    const updatedVoucher = await Voucher.findByIdAndUpdate(
      id,
      {
        voucher_name: name,
        details: description,
        product_name: productName,
        price: voucherPrice,
        productPrice,
        imageUrl: image,
        start_time: startTimeDate,
        end_time: endTimeDate,
      },
      { new: true }
    );

    if (!updatedVoucher) {
      return res.status(404).json({ message: "Voucher not found" });
    }

    res.status(200).json({ message: "Voucher updated successfully", voucher: updatedVoucher });
  } catch (error) {
    console.error("Error updating voucher: ", error);
    res.status(500).json({ message: "Failed to update voucher", error: error.message });
  }
};

// Delete a voucher
const deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedVoucher = await Voucher.findByIdAndDelete(id);

    if (!deletedVoucher) {
      return res.status(404).json({ message: "Voucher not found" });
    }

    res.status(200).json({ message: "Voucher deleted successfully" });
  } catch (error) {
    console.error("Error deleting voucher: ", error);
    res.status(500).json({ message: "Failed to delete voucher", error: error.message });
  }
};

// Get all vouchers
const getVouchers = async (req, res) => {
  try {
    const vouchers = await Voucher.find();
    res.status(200).json({ vouchers });
  } catch (error) {
    console.error("Error retrieving vouchers: ", error);
    res.status(500).json({ message: "Failed to retrieve vouchers", error: error.message });
  }
};

// Get a single voucher by ID
const getVoucherById = async (req, res) => {
  try {
    const { id } = req.params;

    const voucher = await Voucher.findById(id);

    if (!voucher) {
      return res.status(404).json({ message: "Voucher not found" });
    }

    res.status(200).json({ voucher });
  } catch (error) {
    console.error("Error retrieving voucher: ", error);
    res.status(500).json({ message: "Failed to retrieve voucher", error: error.message });
  }
};


//backend/Controller/adminController.js
const createDeal = async (req, res) => {
  try {
      console.log('Data received from frontend:', req.body);

      const { productName, productId, discount, startDate, endDate, startTime, endTime, isAutomated } = req.body;

      const currentDate = new Date();
      const parsedStartDateTime = new Date(`${startDate}T${startTime}:00`);
      const parsedEndDateTime = new Date(`${endDate}T${endTime}:00`);

      // Validate input fields
      if (!productName || !productId || !discount || !startDate || !endDate || !startTime || !endTime) {
          return res.status(400).json({ error: 'All fields are required.' });
      }

      // Validate start date and time
      if (parsedStartDateTime < currentDate) {
          return res.status(400).json({ error: 'Start date and time cannot be in the past.' });
      }

      // Validate end date and time
      if (parsedEndDateTime <= parsedStartDateTime) {
          return res.status(400).json({ error: 'End date and time must be after the start date and time.' });
      }

      // Save the deal
      const newDeal = new TodayDeal({
          productName,
          productId,
          discount,
          startDate,
          endDate,
          startTime,
          endTime,
          isAutomated,
          automationStatus: 'scheduled',
      });

      await newDeal.save();

      res.status(201).json({ message: 'Deal added successfully', deal: newDeal });
      console.log('Deal added successfully:', newDeal);
          // Trigger automation check immediately after creating the deal
    if (isAutomated) {
      await checkDealAutomation(); // Call the automation check function
    }
  } catch (error) {
      console.error('Error adding deal:', error);
      res.status(500).json({ message: 'Failed to add deal', error: error.message });
  }
};



nodeCron.schedule('* * * * *', async () => {
  try {
    await checkDealAutomation();
  } catch (error) {
    console.error('Error in cron job:', error);
  }
});

const checkDealAutomation = async () => {
  try {
    const currentDate = new Date(); // Current date and time
    const currentTimestamp = currentDate.getTime(); // Get the timestamp for current date and time

    // Retrieve all automated deals
    const deals = await TodayDeal.find({ isAutomated: true });

    for (const deal of deals) {
      // Parse startDate and endDate into Date objects
      const dealStartDate = new Date(deal.startDate);
      const dealEndDate = new Date(deal.endDate);

      // Add time to startDate and endDate
      const [startHours, startMinutes] = deal.startTime.split(':');
      const [endHours, endMinutes] = deal.endTime.split(':');

      dealStartDate.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
      dealEndDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

      const dealStartTimestamp = dealStartDate.getTime(); // Get timestamp for start datetime
      const dealEndTimestamp = dealEndDate.getTime(); // Get timestamp for end datetime

      if (currentTimestamp >= dealStartTimestamp && currentTimestamp <= dealEndTimestamp) {
        // Update to active if within the active window
        if (deal.automationStatus !== 'active') {
          deal.automationStatus = 'active';
          await deal.save();
          console.log(`Deal ${deal._id} status updated to active.`);
        }
      } else if (currentTimestamp < dealStartTimestamp) {
        // Update to scheduled if before the active window
        if (deal.automationStatus !== 'scheduled') {
          deal.automationStatus = 'scheduled';
          await deal.save();
          console.log(`Deal ${deal._id} status updated to scheduled.`);
        }
      } else if (currentTimestamp > dealEndTimestamp) {
        // Update to expired if beyond the end datetime
        if (deal.automationStatus !== 'expired') {
          deal.automationStatus = 'expired';
          await deal.save();
          console.log(`Deal ${deal._id} status updated to expired.`);
        }

        // Update to inactive if the current date exceeds the end date
        const dealEndDateWithoutTime = new Date(
          dealEndDate.getFullYear(),
          dealEndDate.getMonth(),
          dealEndDate.getDate(),
          23,
          59,
          59
        ).getTime();

        if (currentTimestamp > dealEndDateWithoutTime) {
          if (deal.automationStatus !== 'inactive') {
            deal.automationStatus = 'inactive';
            await deal.save();
            console.log(`Deal ${deal._id} status updated to inactive.`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking deal automation:', error);
  }
};







// Fetch all deals
const getAllDeals = async (req, res) => {
  try {
    const deals = await TodayDeal.find().sort({ createdAt: -1 }); // Fetch deals and sort by date
    res.status(200).json(deals);
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ message: 'Failed to fetch deals', error: error.message });
  }
};

// Delete a deal by ID
const deleteDealById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the deal and delete it
    const deletedDeal = await TodayDeal.findByIdAndDelete(id);

    if (!deletedDeal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    res.status(200).json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ message: 'Failed to delete deal', error: error.message });
  }
};


// Controller to handle order assignment
const assignOrderToSalesman = async (req, res) => {
  const { salesmanId, orderId } = req.body;

  try {
      // Log the received request data to check the payload
      console.log('Received request data:', req.body);
      
      // Validate request payload
      if (!salesmanId || !orderId) {
          console.log('Missing Salesman ID or Order ID');
          return res.status(400).json({ message: 'Salesman ID and Order ID are required.' });
      }

      // Log the extracted salesmanId and orderId
      console.log('Extracted Salesman ID:', salesmanId);
      console.log('Extracted Order ID:', orderId);

      // Find the order and salesman
      const order = await Order.findById(orderId);
      const salesman = await Salesman.findById(salesmanId);

      // Log the found order and salesman objects
      console.log('Found Order:', order);
      console.log('Found Salesman:', salesman);

      if (!order) {
          console.log('Order not found with ID:', orderId);
          return res.status(404).json({ message: 'Order not found.' });
      }
      if (!salesman) {
          console.log('Salesman not found with ID:', salesmanId);
          return res.status(404).json({ message: 'Salesman not found.' });
      }

      // Update the order with the salesman ID
      order.assignedTo = salesmanId;
      await order.save();

      // Log the updated order object
      console.log('Updated Order:', order);

      // Optionally, update the salesman's orders list
      salesman.assignedOrders = salesman.assignedOrders || [];
      salesman.assignedOrders.push(orderId);
      await salesman.save();

      // Log the updated salesman object
      console.log('Updated Salesman:', salesman);

      // Create a new AssignOrder record
      const assignOrder = new AssignOrder({
          orderId,
          salesmanId,
          assignedBy: req.admin.id, // Assuming admin's ID is available in req.user
          status: 'Request Sent',
      });
      await assignOrder.save();

      // Log the new AssignOrder record
      console.log('New AssignOrder created:', assignOrder);

      return res.status(200).json({ message: 'Order assigned to salesman successfully.' });
  } catch (error) {
      console.error('Error assigning order to salesman:', error);
      return res.status(500).json({ message: 'An error occurred while assigning the order.' });
  }
};

//backend/Controller/adminController.js
const fetchOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { salesmanId } = req.query; // Fetch salesmanId from query parameters

  try {
      console.log('Fetching order status for orderId:', orderId, 'and salesmanId:', salesmanId);

      // Validate that salesmanId is provided and is a valid MongoDB ObjectId
      if (!salesmanId || !mongoose.Types.ObjectId.isValid(salesmanId)) {
          console.log('Invalid salesmanId format:', salesmanId);
          return res.status(400).json({ message: 'Invalid or missing salesmanId.' });
      }

      // Find the assignOrder record based on orderId and salesmanId
      const assignOrder = await AssignOrder.findOne({ orderId, salesmanId });
      console.log('Found assignOrder:', assignOrder);

      if (!assignOrder) {
          console.log('No order found for the given salesman and orderId.');
          return res.status(404).json({ message: 'Assigned order not found for the given salesman.' });
      }

      console.log('Order Status - Request Sent:', assignOrder.requestSent);
      console.log('Order Status - Accepted:', assignOrder.accepted);

      // Return the order status
      return res.status(200).json({
          requestSent: assignOrder.requestSent,
          accepted: assignOrder.accepted,
      });
  } catch (error) {
      console.error('Error fetching order status:', error);
      return res.status(500).json({ message: 'An error occurred while fetching the order status.' });
  }
};

// Controller to get assigned orders
const getAssignedOrders = async (req, res) => {
  try {
    // Fetch orders with their assigned salesman
    const assignedOrders = await Order.aggregate([
      {
        $match: { "assignedTo.salesmanId": { $ne: null } } // Filter orders that have a salesman assigned
      },
      {
        $project: {
          orderId: 1, // Keep the orderId field as it is in the schema
          salesmanId: "$assignedTo.salesmanId" // Get assigned salesman ID
        }
      }
    ]);

    if (!assignedOrders || assignedOrders.length === 0) {
      return res.status(404).json({ error: "No assigned orders found." });
    }

    console.log('Assigned Orders:', assignedOrders); // Log to ensure the data is correct
    return res.status(200).json({ assignedOrders });
  } catch (error) {
    console.error("Error fetching assigned orders:", error);
    return res.status(500).json({ error: "An error occurred while fetching assigned orders." });
  }
};


// Controller to handle accepting the order
const acceptOrderBySalesman = async (req, res) => {
  const { orderId } = req.body;

  try {
      // Validate request payload
      if (!orderId) {
          return res.status(400).json({ message: 'Order ID is required.' });
      }

      // Find the AssignOrder record
      const assignOrder = await AssignOrder.findOne({ orderId });

      if (!assignOrder) {
          return res.status(404).json({ message: 'AssignOrder not found.' });
      }

      // Update the "accepted" status to true
      assignOrder.accepted = true;
      assignOrder.status = 'In Progress';  // You can change the status if required
      await assignOrder.save();

      return res.status(200).json({ message: 'Order request accepted successfully.' });
  } catch (error) {
      console.error('Error accepting order:', error);
      return res.status(500).json({ message: 'An error occurred while accepting the order.' });
  }
};

// Create Salesman Account
const createSalesman = async (req, res) => {
  const { name, email, role, password } = req.body; // Get password from the frontend request

  if (!name || !email || !role || !password) {  // Check if all required fields are present
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Check if a salesman with the same email already exists
    const existingSalesman = await Salesman.findOne({ email });

    if (existingSalesman) {
      return res.status(400).json({ error: 'A salesman with this email already exists.' });
    }

    // Hash the password received from the frontend
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the tempPassword sent from the frontend

    // Create a new salesman document
    const newSalesman = new Salesman({
      name,
      email,
      role,
      password: hashedPassword,
    });

    // Save to the database
    await newSalesman.save();

    // Respond with the created salesman data
    res.status(201).json({
      message: 'Salesman account created successfully.',
      salesman: { _id: newSalesman._id, name, email, role },
    });
  } catch (error) {
    console.error('Error creating salesman:', error);
    res.status(500).json({ error: 'An error occurred while creating the salesman account.' });
  }
};


// Get all Salesman Accounts
const getAllSalesmen = async (req, res) => {
  try {
    const salesmen = await Salesman.find(); // Fetch all salesmen from the existing collection
    res.status(200).json({ salesmen });
  } catch (error) {
    console.error('Error fetching salesmen:', error);
    res.status(500).json({ error: 'An error occurred while fetching salesman accounts.' });
  }
};



const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  // Correcting the reference here from 'admin' to 'Admin'
  let admin = await Admin.findOne({ email });

  if (!admin) {
    return res.status(404).json({ message: 'Admin not found' });
  }

  // Log the stored password (hashed) from the database
  console.log("Stored hashed password from database:", admin.password);

  // Compare the provided password with the stored hashed password
  const isMatch = await bcrypt.compare(password, admin.password);

  if (!isMatch) {
    console.log("Password comparison failed, incorrect credentials");
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  console.log("Password comparison successful");

  // Log the token creation step
  const token = jwt.sign({ adminId: admin._id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

  res.status(200).json({ message: 'Login successful', token });
};


const getCarouselImages = async (req, res) => {
  try {
    const images = await Carousel.find();
    res.status(200).json({ images });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch carousel images.' });
  }
};

const addCarouselImage = async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ message: 'Image URL is required.' });
  }

  try {
    const newImage = new Carousel({ url: image.uri });
    await newImage.save();
    res.status(201).json({ message: 'Image added successfully.', image: newImage });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save image.' });
  }
};

// New deleteCarouselImage function
const deleteCarouselImage = async (req, res) => {
  const { id } = req.params;

  try {
    await Carousel.findByIdAndDelete(id);
    res.status(200).json({ message: 'Image deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete the image.' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    
    if (!users || users.length === 0) {
      console.warn('No users found');
      return res.status(404).json({ message: 'No users found' });
    }

    console.log('Fetched users:', users);
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    const errorMessage = error.message || 'Unknown error occurred while fetching users';
    res.status(500).json({ message: 'Error fetching users', error: errorMessage });
  }
};

//backend/Controller/adminController.js
const addCategory = async (req, res) => {
  const { name, image } = req.body;

  if (!name || !image) {
    return res.status(400).json({ message: 'Name and image are required.' });
  }

  try {
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category name must be unique.' });
    }

    const newCategory = new Category({ name, image });
    const savedCategory = await newCategory.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

const getcategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories' });
  }
};

const updateCategory = async (req, res) => {
  const { name, image } = req.body;

  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { name, image },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    res.json(updatedCategory);
  } catch (error) {
    res.status(500).json({ message: 'Error updating category' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting category' });
  }
};


const addBrand = async (req,res) =>{
    try {
        const {name, description} = req.body;
        const brand = new Brand({name,description});

        const savedbrand = await brand.save();

        res.status(201).json(savedbrand);
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

const getBrand = async (req,res) =>{
    try {
        const brands = await Brand.find();
        res.json(brands);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching brands' });
    }
}

const editBrand = async (req,res) =>{
    const { name, description } = req.body;

    try {
        const updatedBrand = await Brand.findByIdAndUpdate(
            req.params.id,
            { name, description },
            { new: true }
        );

        res.json(updatedBrand);
    } catch (error) {
        res.status(500).json({ message: 'Error updating brand' });
    }
}

const deleteBrand = async (req,res) =>{
    try {
        await Brand.findByIdAndDelete(req.params.id);
        res.json({ message: 'Brand deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting brand' });
    }
}


//backend/Controller/adminController.js
const addProduct = async (req, res) => {
  try {
    // Destructure necessary fields from the request body
    const { 
      name, 
      description, 
      productPrice, 
      salePrice, 
      category, 
      brand, 
      quantity, 
      discount, 
      color, 
      images,
      cashOnDelivery,  // Added cashOnDelivery
      codAmount,
      demoVideoUrl 
    } = req.body;

        // Log the received data for debugging
        console.log("Received data:", req.body);

    // Validate images object structure
    if (!images || !images.imageUrl || !Array.isArray(images.thumbnailUrl)) {
      return res.status(400).json({ message: "Invalid image data" });
    }

    // Create new product
    const newProduct = new Product({
      name,
      description,
      productPrice,
      salePrice,
      category,
      brand,
      quantity,
      discount,
      color,
      cashOnDelivery,
      codAmount,
      images, 
      demoVideoUrl 
    });

    // Save the product to the database
    await newProduct.save();
    return res.status(201).json(newProduct);

  } catch (error) {
    console.error("Error creating product:", error);
    return res.status(500).json({ message: "Error saving product", error });
  }
};



const fetchProduct = async (req,res) =>{
    
    try {
        // Fetch all products from the database and populate brand and category fields
        const products = await Product.find().populate('category').populate('brand');
        
        // Return the fetched products as JSON
        res.status(200).json(products);
    } catch (error) {
        // Handle any errors that occur during the fetch
        res.status(500).json({ message: 'Error fetching products', error });
    }
}

const fetchimages = async (req, res) =>{
    const { id } = req.params;
    const { populate } = req.query; // Check if populate is in query
  
    try {
      const productQuery = Product.findById(id);
      if (populate) {
        productQuery.populate('images'); // Populate images if requested
      }
  
      const product = await productQuery;
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.json(product);
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ message: 'Error fetching product' });
    }
}

const deleteProducts = async (req, res) =>{
    try {
        const { id } = req.params;
        const deletedProduct = await Product.findByIdAndDelete(id);
    
        if (!deletedProduct) {
          return res.status(404).json({ message: "Product not found" });
        }
    
        res.status(200).json({ message: "Product deleted successfully" });
      } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ message: "Error deleting product" });
      }
}

const editProduct = async (req, res) => {
    try {
        const { id } = req.params; // Get the product ID from the request parameters
        const { name, description, price, salesPrice, category, brand, quantity, discount, color, images } = req.body;

        // Ensure sales price is valid
        if (parseFloat(salesPrice) >= parseFloat(price)) {
            return res.status(400).json({ message: "Sales price should be less than price" });
        }

        // Prepare the update object
        const updateData = {
            name,
            description,
            productPrice: price,
            salePrice: salesPrice,
            category,
            brand,
            quantity,
            discount,
            color,
            images:images
        };

        if (images) {
            const newImageIds = []; // Array to hold new image IDs

            for (const img of images) {
                const newImages = new Images({
                    thumbnailUrl: img.thumbnailUrl,
                    imageUrl: img.imageUrl,
                });

                const savedImage = await newImages.save(); // Save each new image
                newImageIds.push(savedImage._id); // Store the saved image ID
            }

            updateData.images = newImageIds; // Update the product's images
     
        }


        // Find the product and update it in one operation
        const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });


        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json(updatedProduct); // Return the updated product
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
          .populate('userId', 'name email') // Populate user's name and email
          .populate('cartItems.productId', 'name images price') // Populate product name, image, and price
          .populate('selectedAddressId', 'addressLine street state pincode flatNumber phoneNumber addressType') // Populate address details
          .exec();
    
        res.status(200).json(orders);
      } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ message: 'Error fetching orders' });
      }
  };

// Controller function to update order status
const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { orderStatus, orderSummary, cartItems } = req.body;

  try {
      const order = await Order.findById(orderId);

      if (!order) {
          return res.status(404).json({ message: "Order not found" });
      }

      // Check if orderSummary is missing and handle it
      if (!orderSummary) {
          return res.status(400).json({ message: "Order summary is required" });
      }

      // Update the orderStatus, orderSummary, and cartItems statuses
      order.orderStatus = orderStatus;
      order.orderSummary = orderSummary;  // Make sure the order summary is updated
      order.cartItems = cartItems.map(item => ({
          ...item,
          status: orderStatus,  // Apply the same status to all cart items
      }));

      // Save the updated order
      await order.save();

      res.status(200).json(order);  // Return the updated order data
  } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Server error" });
  }
};


// backend/Controller/adminController.js
const getDashboardCounts = async (req, res) => {
  try {
    // Count unique users and include registration date
    const users = await User.find({}, { _id: 1, createdAt: 1 }); // Retrieve user IDs and registration dates
    const userCount = users.length;

    // Count unique user IDs in bids (auction participants) and include auction date
    const bids = await Bid.find({}, { userId: 1, createdAt: 1 }); // Retrieve user IDs and auction dates
    const auctionParticipants = new Set(bids.map(bid => bid.userId.toString()));
    const auctionCount = auctionParticipants.size; // Unique user IDs participating in auctions

    // Count unique user and product IDs in orders and include order date
    const orders = await Order.find({}, { userId: 1, cartItems: 1, orderDate: 1 }); // Retrieve user IDs, cartItems, and order dates
    const orderUserProductSet = new Set();
    const orderDates = orders.map(order => order.orderDate); // Collect order dates
    const orderStatusCounts = {
      Pending: { count: 0, dates: [] },
      Processing: { count: 0, dates: [] },
      Shipped: { count: 0, dates: [] },
      Delivered: { count: 0, dates: [] },
      'Out for Delivery': { count: 0, dates: [] },
      Cancelled: { count: 0, dates: [] },
      Returned: { count: 0, dates: [] }
    };

    // Loop through orders and cartItems to track status counts and dates
    orders.forEach(order => {
      order.cartItems.forEach(item => {
        // Track the status counts and dates of each cart item
        if (item.status in orderStatusCounts) {
          orderStatusCounts[item.status].count += 1;
          orderStatusCounts[item.status].dates.push(order.orderDate);
        }
        orderUserProductSet.add(`${order.userId}-${item.productId}`);
      });
    });

    const orderCount = orderUserProductSet.size;

    res.status(200).json({
      userCount,
      userRegistrationDates: users.map(user => user.createdAt), // Add registration dates
      auctionCount,
      auctionUniqueParticipants: auctionCount,
      auctionDates: Array.from(auctionParticipants).map(userId => {
        const userBids = bids.filter(bid => bid.userId.toString() === userId);
        return userBids.map(bid => bid.createdAt); // Get bid dates for each user
      }).flat(), // Flatten the nested arrays
      orderCount,
      orderDates, // Add order dates
      orderStatusCounts
    });
  } catch (error) {
    console.error('Error fetching dashboard counts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



module.exports = {loginAdmin, createDeal, getAllDeals, deleteDealById, createSalesman, getAllSalesmen, addCarouselImage, getCarouselImages, deleteCarouselImage, getAllUsers, addCategory,addBrand,getcategories,updateCategory,deleteCategory,getBrand,editBrand,deleteBrand,addProduct,fetchProduct,fetchimages,
    deleteProducts, getAssignedOrders, assignOrderToSalesman, acceptOrderBySalesman, fetchOrderStatus, editProduct, getOrders, updateOrderStatus, getDashboardCounts, createVoucher, updateVoucher, deleteVoucher, getVouchers, getVoucherById,
}