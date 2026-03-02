const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  quantity: { type: Number, default: 0 },
  price: Number,
  reorderLevel: { type: Number, default: 10 }
});

module.exports = mongoose.model('Product', productSchema);