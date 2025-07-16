//backend/Models/productModel.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        productPrice: {
            type: Number,
            required: true,
        },
        salePrice: {
            type: Number,
            required: true,
        },
        category: {
            type: String,
            required: true,
        },
        brand: {
            type: String,
            required: true,
        },
        isListed: {
            type: Boolean,
            default: true,
        },
        quantity: {
            type: Number,
            required: true,
        },
        discount: {
            type: Number,
            default: 0,
        },
        color: {
            type: String,
            required: true,
        },
        images: {
            imageUrl: { type: String, required: true },
            thumbnailUrl: [{ type: String }]
          },
        cashOnDelivery: {
            type: String,
            default: "Not available",
        },
        codAmount: {
            type: Number,
            default: 0,
        },
        demoVideoUrl: { // Added demoVideoUrl field
            type: String,
            default: null,
          },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
