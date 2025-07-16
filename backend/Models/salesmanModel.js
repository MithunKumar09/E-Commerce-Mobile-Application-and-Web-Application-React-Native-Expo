//models/salesmanModel.js
const mongoose = require('mongoose');

const salesmanSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    state: { type: String },
    nationality: { type: String },
    password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Salesman', salesmanSchema);
