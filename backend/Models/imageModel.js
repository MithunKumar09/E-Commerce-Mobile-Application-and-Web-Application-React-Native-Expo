//imagemodel.js
const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
    thumbnailUrl: {
        type: String,
        required: true, // For storing the main image URL (mainImageUrl)
    },
    imageUrl: [{
        type: String,
        required: true, // For storing the smaller image URLs as an array
    }],
}, {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
});

module.exports = mongoose.model("Images", imageSchema);
