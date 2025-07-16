// backend/seeder/adminSeeder.js
const mongoose = require("mongoose");
const Admin = require("../Models/adminModel");
const connectDb = require("../Config/connection");
const bcrypt = require("bcrypt");

const seedAdmin = async () => {
  await connectDb();

  const hashedPassword = await bcrypt.hash("admin123", 10); // Hash the password
  const admin = new Admin({
    email: "admin@gmail.com",
    password: hashedPassword, // Store the hashed password
  });

  await admin.save();
  console.log("Admin seeded");
  mongoose.connection.close();
};

seedAdmin();