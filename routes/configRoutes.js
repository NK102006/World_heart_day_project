const express = require('express');
const router = express.Router();
const DoctorField = require('../models/DoctorField');
const PromiseHabit = require('../models/PromiseHabit');

const DEFAULT_FIELDS = [
  {
    name: 'doctorName',
    label: "Doctor's Full Name",
    type: 'text',
    placeholder: 'e.g. Dr. Sneha Roy, MD (Cardiology)',
    required: true,
    order: 1,
    isSystem: true
  },
  {
    name: 'photo',
    label: 'Doctor Photograph',
    type: 'photo',
    placeholder: 'Upload or drag & drop doctor photograph',
    required: true,
    order: 2,
    isSystem: true
  },
  {
    name: 'clinicName',
    label: 'Clinic / Hospital Name',
    type: 'text',
    placeholder: 'e.g. Heart Care Clinic',
    required: true,
    order: 3,
    isSystem: true
  }
];

const DEFAULT_PROMISES = [
  { id: 1, title: 'Take Medicines on Time', desc: 'I will never skip my daily heart, BP, or diabetes medications.', icon: '💊', order: 1 },
  { id: 2, title: 'Cut Down on Salt', desc: 'I promise to reduce salty snacks and extra salt in my meals.', icon: '🧂', order: 2 },
  { id: 3, title: 'Cut Sugary Drinks', desc: 'I promise to reduce soft drinks, packaged sweet drinks, and extra sugar in tea or coffee.', icon: '🥤', order: 3 },
  { id: 4, title: 'Avoid Trans Fats', desc: 'I will limit processed foods and choose healthy cooking oils.', icon: '🥑', order: 4 },
  { id: 5, title: 'Never Ignore Symptoms', desc: 'I will seek medical help immediately for chest pain or breathlessness.', icon: '🚨', order: 5 },
  { id: 6, title: 'Digital Detox Before Bed', desc: 'I will put away screens at night for deeper, heart-healing rest.', icon: '📵', order: 6 },
  { id: 7, title: 'Eat Fiber-Rich Foods', desc: 'I will eat fresh fruits, vegetables, and whole grains every day.', icon: '🥗', order: 7 },
  { id: 8, title: 'Post-Meal Stroll', desc: 'I will take a 10-minute walk after dinner to aid metabolism.', icon: '🚶', order: 8 },
  { id: 9, title: 'Active Weekends', desc: 'I will choose outdoor sports, cycling, or nature walks on weekends.', icon: '🚴', order: 9 },
  { id: 10, title: 'Read Food Labels', desc: 'I will read food packets to avoid hidden sodium and bad fats.', icon: '🏷️', order: 10 },
  { id: 11, title: 'I will stay active', desc: 'I will exercise regularly and keep my heart strong.', icon: '🏃‍♂️', order: 11 },
  { id: 12, title: 'I will eat healthy', desc: 'I will choose nutritious, balanced meals for a healthy heart.', icon: '🥦', order: 12 },
  { id: 13, title: 'I will maintain a healthy weight', desc: 'I will keep my weight in check to reduce strain on my heart.', icon: '⚖️', order: 13 },
  { id: 14, title: 'I will say no to tobacco', desc: 'I will avoid tobacco in any form to protect my heart.', icon: '🚭', order: 14 },
  { id: 15, title: 'I will monitor my blood pressure', desc: 'I will keep my blood pressure in control.', icon: '💓', order: 15 },
  { id: 16, title: 'I will keep my cholesterol in check', desc: 'I will get regular check-ups and follow healthy habits.', icon: '🩺', order: 16 },
  { id: 17, title: 'I will keep my blood sugar in control', desc: 'I will manage my blood sugar to protect my heart.', icon: '🩸', order: 17 },
  { id: 18, title: 'I will manage stress', desc: 'I will take time to relax, meditate and care for my mental well-being.', icon: '🧘', order: 18 },
  { id: 19, title: 'I will sleep well', desc: 'I will get enough quality sleep and let my heart rest and heal.', icon: '😴', order: 19 },
  { id: 20, title: 'Limit Alcohol', desc: 'I promise not to start drinking for heart health, and to limit alcohol if I already drink.', icon: '🍷', order: 20 }
];

// Helper to seed defaults if DB is empty
async function ensureDefaults() {
  try {
    const fieldsCount = await DoctorField.countDocuments();
    if (fieldsCount === 0) {
      await DoctorField.insertMany(DEFAULT_FIELDS);
      console.log('✅ Default Doctor Fields seeded successfully');
    }

    const promisesCount = await PromiseHabit.countDocuments();
    if (promisesCount === 0) {
      await PromiseHabit.insertMany(DEFAULT_PROMISES);
      console.log('✅ Default Heart Promises seeded successfully');
    }
  } catch (err) {
    console.error('Error ensuring default configs:', err);
  }
}

// PUBLIC: GET all active doctor fields sorted by order
router.get('/fields', async (req, res) => {
  try {
    await ensureDefaults();
    const fields = await DoctorField.find({ enabled: { $ne: false } }).sort({ order: 1, createdAt: 1 });
    res.json({ success: true, fields });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUBLIC: GET all active promises sorted by order
router.get('/promises', async (req, res) => {
  try {
    await ensureDefaults();
    const promises = await PromiseHabit.find({ enabled: { $ne: false } }).sort({ order: 1, id: 1 });
    res.json({ success: true, promises });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = {
  configRouter: router,
  ensureDefaults,
  DEFAULT_FIELDS,
  DEFAULT_PROMISES
};
