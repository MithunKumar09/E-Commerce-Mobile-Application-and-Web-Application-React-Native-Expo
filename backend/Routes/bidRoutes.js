const express = require("express"); // Import express
const bidRoute = express.Router(); // Create a new router instance

const { BidConfirmed } = require("../Controller/bidController");

bidRoute.post("/confirmBid", BidConfirmed);

module.exports = bidRoute;
