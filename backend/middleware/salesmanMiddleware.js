// middleware/salesmanMiddleware.js
const jwt = require("jsonwebtoken");
const Salesman = require("../Models/salesmanModel");

exports.authenticateSalesman = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided. Please log in." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const salesman = await Salesman.findById(decoded.id);

    if (!salesman) {
      return res.status(404).json({ error: "Salesman not found." });
    }

    req.user = { salesmanId: salesman._id }; // Attach salesmanId to the request object
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    res.status(401).json({ error: "Unauthorized. Invalid token." });
  }
};
