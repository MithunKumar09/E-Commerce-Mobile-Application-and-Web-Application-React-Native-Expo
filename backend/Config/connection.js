//backend/Config/connection.js
const mongoose = require("mongoose"); 

const connectDb = async () => { 
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Database connected successfully 🚀");
  } catch (error) {
    console.error("Mongo connection error ❌", error);
  }
};

module.exports = connectDb; 
