const mongoose = require('mongoose');

const promiseHabitSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  desc: {
    type: String,
    default: '',
    trim: true
  },
  icon: {
    type: String,
    default: '❤️',
    trim: true
  },
  order: {
    type: Number,
    default: 0
  },
  enabled: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { collection: 'promise_habits' });

module.exports = mongoose.model('PromiseHabit', promiseHabitSchema);
