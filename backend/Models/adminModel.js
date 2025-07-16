// backend/Models/adminModel.js
const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

// Specify the collection name as 'admins'
const Admin = mongoose.model('Admin', adminSchema, 'admins');
module.exports = Admin;