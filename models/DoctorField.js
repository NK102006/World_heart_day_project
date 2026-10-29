const mongoose = require('mongoose');

const doctorFieldSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'textarea', 'number', 'select', 'photo', 'file'],
    default: 'text'
  },
  placeholder: {
    type: String,
    default: '',
    trim: true
  },
  required: {
    type: Boolean,
    default: false
  },
  options: {
    type: [String],
    default: []
  },
  order: {
    type: Number,
    default: 0
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  enabled: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { collection: 'doctor_fields' });

module.exports = mongoose.model('DoctorField', doctorFieldSchema);
