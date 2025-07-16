//adminMiddleware.js
const jwt = require('jsonwebtoken');
const Admin = require('../Models/adminModel');

const verifyAdminToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authorization token is required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.adminId);
    if (!admin) {
      return res.status(401).json({ message: 'Admin not found' });
    }
    req.admin = admin;
    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { verifyAdminToken };
