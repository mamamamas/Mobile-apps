const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const menuSchema = new Schema({
  itemName: {
    type: String,
    required: true,
  },
  startingCount: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  expiredDate: {
    type: Date,
  },
  manufactors: {
    type: String,
    required: false,
  },
  status: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },

});

const Menu = mongoose.model('Menu', menuSchema);
module.exports = Menu;