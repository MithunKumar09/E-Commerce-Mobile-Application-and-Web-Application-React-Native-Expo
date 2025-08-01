//backend/categoryModel.js
const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    image: { type: String, required: true },
  });  

module.exports = mongoose.model("Category", categorySchema);
