//backend/Config/ENV.js
const dotenv = require("dotenv");

dotenv.config();

const ENV = {
  PORT: process.env.PORT,
  MONGO_URL: process.env.MONGO_URL,
};

module.exports = ENV; 
