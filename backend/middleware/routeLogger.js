//backend/middleware/routeLogger.js
const routeLogger = (req, res, next) => {
    console.log(`[LOG] Incoming Request: ${req.method} ${req.originalUrl}`);
    next();
  };
  
  module.exports = routeLogger;
  