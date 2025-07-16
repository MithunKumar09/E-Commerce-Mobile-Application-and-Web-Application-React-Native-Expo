//backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const authenticateUser = async (req, res, next) => {
  // Get token from Authorization header
  const token = req.header("Authorization")?.replace("Bearer ", "");  // Extract Bearer token
  
  // Log the token to verify it's being passed correctly
  console.log("Received token:", token);

  if (!token) {
    console.error("No token provided in Authorization header");  // Log error if no token is found
    return res.status(401).json({ message: "Authorization token required" });
  }

  try {
    // Decode the token to get user info
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Log the decoded token to ensure it's correctly parsed
    console.log("Decoded token:", decoded);

    if (!decoded || !decoded.userId) {
      console.error("Decoded token does not contain a valid userId");  // Log error if userId is missing
      return res.status(400).json({ message: "Invalid token, user ID not found" });
    }

    // Attach the decoded user information to the request object
    req.user = decoded;  
    console.log("User ID from token:", req.user.userId);  // Log user ID for debugging
    next();  // Continue to the next middleware or route
  } catch (error) {
    console.error("Error verifying token:", error);  // Log the error if token verification fails
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authenticateUser;