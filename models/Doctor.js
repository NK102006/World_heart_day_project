const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  doctorName: {
    type: String,
    default: 'Doctor',
    trim: true
  },
  photoUrl: {
    type: String,
    default: '',
    trim: true
  },
  clinicName: {
    type: String,
    default: '',
    trim: true
  },
  selectedPromises: {
    type: [String],
    default: []
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required for inheritance']
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  superadminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin',
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  extraFields: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  posterUrl: {
    type: String,
    default: '',
    trim: true
  },
  posterDownloadedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { collection: 'doctors', strict: false });

module.exports = mongoose.model('Doctor', doctorSchema);
