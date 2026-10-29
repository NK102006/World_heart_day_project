const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Doctor = require('../models/Doctor');
const DoctorField = require('../models/DoctorField');
const PromiseHabit = require('../models/PromiseHabit');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { verifyToken, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// User role required
router.use(verifyToken, requireRole('user'));

// POST create Doctor with 3 inputs:
// 1. Doctor's name
// 2. Doctor photo (file)
// 3. Clinic name
router.post('/doctors', upload.any(), async (req, res) => {
  try {
    const { doctorName, clinicName } = req.body;

    // Fetch active form field configurations defined by Superadmin
    const activeFields = await DoctorField.find({ enabled: { $ne: false } });
    const activeFieldMap = new Map(activeFields.map(f => [f.name, f]));

    // 1. Doctor Name validation (only if enabled & required)
    const docNameConfig = activeFieldMap.get('doctorName');
    if (docNameConfig && docNameConfig.required !== false) {
      if (!doctorName || !doctorName.trim()) {
        return res.status(400).json({ success: false, message: `${docNameConfig.label || "Doctor's name"} is required` });
      }
    }

    // 2. Photo & dynamic file parsing
    let photoUrl = '';
    const extraFileMap = {};
    if (req.files && req.files.length > 0) {
      for (const f of req.files) {
        if (f.fieldname === 'photo') {
          photoUrl = `/uploads/${f.filename}`;
        } else {
          extraFileMap[f.fieldname] = `/uploads/${f.filename}`;
        }
      }
    } else if (req.file) {
      if (req.file.fieldname === 'photo') {
        photoUrl = `/uploads/${req.file.filename}`;
      } else {
        extraFileMap[req.file.fieldname] = `/uploads/${req.file.filename}`;
      }
    } else if (req.body.photoUrl && req.body.photoUrl.trim()) {
      photoUrl = req.body.photoUrl.trim();
    }

    const photoConfig = activeFieldMap.get('photo');
    if (photoConfig && photoConfig.required !== false) {
      if (!photoUrl) {
        return res.status(400).json({ success: false, message: `${photoConfig.label || 'Doctor photo'} is required. Please upload an image.` });
      }
    }

    // 3. Clinic Name validation (only if enabled & required)
    const clinicConfig = activeFieldMap.get('clinicName');
    if (clinicConfig && clinicConfig.required !== false) {
      if (!clinicName || !clinicName.trim()) {
        return res.status(400).json({ success: false, message: `${clinicConfig.label || 'Clinic name'} is required` });
      }
    }

    // Resolve parent Admin and SuperAdmin for inheritance
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Logged in user not found' });
    }

    let superadminId = null;
    if (user.adminId) {
      const admin = await Admin.findById(user.adminId);
      if (admin && admin.superadminId) {
        superadminId = admin.superadminId;
      }
    }

    // Dynamic Extra Fields parsing & validation
    let extraFields = {};
    if (req.body.extraFields) {
      if (typeof req.body.extraFields === 'string') {
        try { extraFields = JSON.parse(req.body.extraFields); } catch (e) { extraFields = {}; }
      } else if (typeof req.body.extraFields === 'object') {
        extraFields = req.body.extraFields;
      }
    }

    // Also pick any top-level dynamic keys sent directly in form-data
    const standardKeys = ['doctorName', 'clinicName', 'photo', 'photoUrl', 'selectedPromises', 'extraFields', 'status'];
    Object.keys(req.body).forEach(k => {
      if (!standardKeys.includes(k) && req.body[k] !== undefined) {
        extraFields[k] = req.body[k];
      }
    });

    // Merge uploaded files into extraFields
    extraFields = { ...extraFields, ...extraFileMap };
    delete extraFields.status;

    // Validate ONLY active & required custom fields defined by Superadmin
    const requiredCustomFields = activeFields.filter(f => !f.isSystem && f.required);
    for (const rf of requiredCustomFields) {
      const val = extraFields[rf.name];
      if (val === undefined || val === null || String(val).trim() === '') {
        return res.status(400).json({ success: false, message: `${rf.label} is required` });
      }
    }

    const doctor = new Doctor({
      doctorName: (doctorName || '').trim() || (docNameConfig ? '' : 'Doctor'),
      photoUrl: photoUrl || '',
      clinicName: (clinicName || '').trim() || '',
      selectedPromises: req.body.selectedPromises ? (Array.isArray(req.body.selectedPromises) ? req.body.selectedPromises : JSON.parse(req.body.selectedPromises || '[]')) : [],
      extraFields,
      userId: user._id,
      adminId: user.adminId || null,
      superadminId: superadminId || null
    });

    await doctor.save();

    res.status(201).json({
      success: true,
      message: 'Doctor profile saved successfully!',
      doctor: {
        _id: doctor._id,
        doctorName: doctor.doctorName,
        photoUrl: doctor.photoUrl,
        clinicName: doctor.clinicName,
        selectedPromises: doctor.selectedPromises,
        extraFields: doctor.extraFields,
        userId: doctor.userId,
        adminId: doctor.adminId,
        superadminId: doctor.superadminId,
        createdAt: doctor.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating doctor:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT update selected promises for doctor
router.put('/doctors/:id/promises', async (req, res) => {
  try {
    const { selectedPromises } = req.body;
    const totalConfigured = await PromiseHabit.countDocuments();
    const targetCount = Math.min(10, totalConfigured || 10);

    if (!Array.isArray(selectedPromises) || (selectedPromises.length !== targetCount && selectedPromises.length > 10)) {
      return res.status(400).json({ success: false, message: `Please select ${targetCount} promises` });
    }

    const doctor = await Doctor.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { selectedPromises } },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    res.json({ success: true, message: 'Habits saved to poster!', doctor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT update full doctor details (by owning employee)
router.put('/doctors/:id', upload.any(), async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorName, clinicName } = req.body;
    let photoUrl = req.body.photoUrl;
    let selectedPromises = req.body.selectedPromises;

    if (selectedPromises !== undefined) {
      if (typeof selectedPromises === 'string') {
        try {
          selectedPromises = JSON.parse(selectedPromises);
        } catch (e) {
          selectedPromises = [selectedPromises];
        }
      }
    }

    const doctor = await Doctor.findOne({
      _id: id,
      userId: req.user.id
    });

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found or unauthorized' });
    }

    if (doctorName && doctorName.trim()) {
      doctor.doctorName = doctorName.trim();
    }
    if (clinicName && clinicName.trim()) {
      doctor.clinicName = clinicName.trim();
    }

    // Process uploaded files (photo and dynamic file inputs)
    const extraFileMap = {};
    if (req.files && req.files.length > 0) {
      for (const f of req.files) {
        if (f.fieldname === 'photo') {
          photoUrl = `/uploads/${f.filename}`;
        } else {
          extraFileMap[f.fieldname] = `/uploads/${f.filename}`;
        }
      }
    } else if (req.file) {
      if (req.file.fieldname === 'photo') {
        photoUrl = `/uploads/${req.file.filename}`;
      } else {
        extraFileMap[req.file.fieldname] = `/uploads/${req.file.filename}`;
      }
    }

    if (photoUrl && photoUrl.trim()) {
      doctor.photoUrl = photoUrl.trim();
    }

    if (Array.isArray(selectedPromises)) {
      if (selectedPromises.length > 10) {
        return res.status(400).json({ success: false, message: 'You cannot select more than 10 promises' });
      }
      doctor.selectedPromises = selectedPromises;
    }

    let extra = {};
    if (req.body.extraFields !== undefined) {
      if (typeof req.body.extraFields === 'string') {
        try { extra = JSON.parse(req.body.extraFields); } catch (e) { extra = {}; }
      } else if (typeof req.body.extraFields === 'object' && req.body.extraFields !== null) {
        extra = req.body.extraFields;
      }
    }

    // Also pick any top-level dynamic keys passed
    const standardKeys = ['doctorName', 'clinicName', 'photo', 'photoUrl', 'selectedPromises', 'extraFields', 'status'];
    Object.keys(req.body).forEach(k => {
      if (!standardKeys.includes(k) && req.body[k] !== undefined) {
        extra[k] = req.body[k];
      }
    });
    delete extra.status;

    doctor.extraFields = { ...(doctor.extraFields || {}), ...extra, ...extraFileMap };
    delete doctor.extraFields.status;
    doctor.markModified('extraFields');

    if (req.body.status !== undefined) {
      doctor.status = req.body.status === 'inactive' || req.body.status === false ? 'inactive' : 'active';
    }

    await doctor.save();

    res.json({
      success: true,
      message: 'Doctor details updated successfully',
      doctor
    });
  } catch (error) {
    console.error('Error updating doctor:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET all doctors created by the logged-in user
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await Doctor.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: doctors.length,
      doctors
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET specific doctor
router.get('/doctors/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ _id: req.params.id, userId: req.user.id });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor record not found' });
    }
    res.json({ success: true, doctor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE a Doctor (by owning User / Employee)
router.delete('/doctors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findOneAndDelete({
      _id: id,
      userId: req.user.id
    });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found or unauthorized' });
    }
    res.json({ success: true, message: 'Doctor deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// SAVE / UPLOAD DOWNLOADED POSTER
router.post('/doctors/:id/poster', async (req, res) => {
  try {
    const { id } = req.params;
    const { posterData } = req.body;
    if (!posterData) {
      return res.status(400).json({ success: false, message: 'No poster image data provided' });
    }

    const doctor = await Doctor.findOne({ _id: id, userId: req.user.id });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found or unauthorized' });
    }

    const postersDir = path.join(__dirname, '..', 'uploads', 'posters');
    if (!fs.existsSync(postersDir)) {
      fs.mkdirSync(postersDir, { recursive: true });
    }

    const base64Data = posterData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `poster-${id}-${Date.now()}.png`;
    const filePath = path.join(postersDir, filename);

    // Remove old poster file if existed
    if (doctor.posterUrl && doctor.posterUrl.startsWith('/uploads/posters/')) {
      const oldFilename = path.basename(doctor.posterUrl);
      const oldPath = path.join(postersDir, oldFilename);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (e) {}
      }
    }

    fs.writeFileSync(filePath, buffer);

    doctor.posterUrl = `/uploads/posters/${filename}`;
    doctor.posterDownloadedAt = new Date();
    await doctor.save();

    res.json({
      success: true,
      message: 'Poster saved successfully',
      posterUrl: doctor.posterUrl,
      doctor
    });
  } catch (error) {
    console.error('Error saving poster in userRoutes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
