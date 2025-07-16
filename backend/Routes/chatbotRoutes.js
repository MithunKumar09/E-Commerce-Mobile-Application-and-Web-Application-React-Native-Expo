// backend/routes/chatbotRoutes.js
const Router = require("express");
const jwt = require('jsonwebtoken');
const chatbotRoute = Router();
const { chatbotResponse, trackOrder, submitFeedback } = require('../Controller/chatbotController');

chatbotRoute.post('/message', (req, res, next) => {
    console.log('Incoming request to /api/chatbot/message:', req.body);
    next();
}, chatbotResponse);

chatbotRoute.post('/track-order', trackOrder);
// Route to handle feedback submission
chatbotRoute.post('/submitFeedback', submitFeedback);

module.exports = chatbotRoute;
