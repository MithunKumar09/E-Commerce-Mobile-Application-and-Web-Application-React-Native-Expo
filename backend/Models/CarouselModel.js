//Backend/Models/CarouselModel.js
const mongoose = require('mongoose');

const carouselSchema = new mongoose.Schema({
  url: { type: String, required: true },
});

module.exports = mongoose.model('Carousel', carouselSchema);
