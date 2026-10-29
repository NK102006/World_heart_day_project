const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const { verifyToken, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes require Admin role
router.use(verifyToken, requireRole('admin'));

// GET all users created by this Admin
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ adminId: req.user.id })
      .select('-password')
      .sort({ createdAt: -1 });

    const usersWithStats = await Promise.all(users.map(async (u) => {
      const doctorsCount = await Doctor.countDocuments({ userId: u._id });
      return {
        ...u.toObject(),
        doctorsCount
      };
    }));

    const totalDoctors = await Doctor.countDocuments({ adminId: req.user.id });

    res.json({
      success: true,
      stats: {
        totalUsers: users.length,
        totalDoctors
      },
      users: usersWithStats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST create new User (by Admin)
router.post('/users', async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    if (!employeeId || !employeeId.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and password are required'
      });
    }

    if (password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const cleanEmpId = employeeId.trim();
    const existingEmp = await User.findOne({
      employeeId: new RegExp('^' + cleanEmpId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
    });
    if (existingEmp) {
      return res.status(400).json({
        success: false,
        message: 'A User with this Employee ID already exists'
      });
    }

    const user = new User({
      employeeId: cleanEmpId,
      password,
      adminId: req.user.id
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully under your Admin account',
      user: {
        _id: user._id,
        employeeId: user.employeeId,
        adminId: user.adminId,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET all doctors created by users under this Admin
router.get('/doctors', async (req, res) => {
  try {
    const userIds = (await User.find({ adminId: req.user.id }).select('_id')).map(u => u._id);
    const doctors = await Doctor.find({
      $or: [{ adminId: req.user.id }, { userId: { $in: userIds } }]
    })
      .populate('userId', 'employeeId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: doctors.length,
      doctors
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single User details and their doctors
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ _id: id, adminId: req.user.id }).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found or unauthorized' });
    }

    const doctors = await Doctor.find({ userId: id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        doctorsCount: doctors.length
      },
      doctors
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT update a User (by Admin)
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId, password } = req.body;

    const user = await User.findOne({ _id: id, adminId: req.user.id });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found or unauthorized' });
    }

    if (employeeId && employeeId.trim()) {
      const cleanEmpId = employeeId.trim();
      const existingEmp = await User.findOne({
        _id: { $ne: id },
        employeeId: new RegExp('^' + cleanEmpId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
      });
      if (existingEmp) {
        return res.status(400).json({
          success: false,
          message: 'Another user with this Employee ID already exists'
        });
      }
      user.employeeId = cleanEmpId;
    }

    if (password && password.trim()) {
      if (password.trim().length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }
      user.password = password.trim();
    }

    if (req.body.status !== undefined) {
      user.status = req.body.status === 'inactive' || req.body.status === false ? 'inactive' : 'active';
    }

    await user.save();

    const doctorsCount = await Doctor.countDocuments({ userId: id });

    res.json({
      success: true,
      message: 'Employee updated successfully',
      user: {
        _id: user._id,
        employeeId: user.employeeId,
        status: user.status,
        createdAt: user.createdAt,
        doctorsCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE a User
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOneAndDelete({ _id: id, adminId: req.user.id });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found or unauthorized' });
    }

    await Doctor.deleteMany({ userId: id });

    res.json({ success: true, message: 'User and their registered doctors deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT update a Doctor (by Admin)
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

    const userIds = (await User.find({ adminId: req.user.id }).select('_id')).map(u => u._id);
    const doctor = await Doctor.findOne({
      _id: id,
      $or: [{ adminId: req.user.id }, { userId: { $in: userIds } }]
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

    if (!doctor.adminId) {
      doctor.adminId = req.user.id;
    }

    let extra = {};
    if (req.body.extraFields !== undefined) {
      if (typeof req.body.extraFields === 'string') {
        try { extra = JSON.parse(req.body.extraFields); } catch (e) { extra = {}; }
      } else if (typeof req.body.extraFields === 'object' && req.body.extraFields !== null) {
        extra = req.body.extraFields;
      }
    }

    // Also pick top-level non-standard keys
    const standardKeys = ['doctorName', 'clinicName', 'photo', 'photoUrl', 'selectedPromises', 'extraFields', 'status'];
    Object.keys(req.body).forEach(k => {
      if (!standardKeys.includes(k) && req.body[k] !== undefined) {
        extra[k] = req.body[k];
      }
    });

    doctor.extraFields = { ...(doctor.extraFields || {}), ...extra, ...extraFileMap };
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
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE a Doctor (by Admin)
router.delete('/doctors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userIds = (await User.find({ adminId: req.user.id }).select('_id')).map(u => u._id);
    const doctor = await Doctor.findOneAndDelete({
      _id: id,
      $or: [{ adminId: req.user.id }, { userId: { $in: userIds } }]
    });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found or unauthorized' });
    }
    res.json({ success: true, message: 'Doctor deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// SAVE / UPLOAD DOWNLOADED POSTER (by Admin)
router.post('/doctors/:id/poster', async (req, res) => {
  try {
    const { id } = req.params;
    const { posterData } = req.body;
    if (!posterData) {
      return res.status(400).json({ success: false, message: 'No poster image data provided' });
    }

    const userIds = (await User.find({ adminId: req.user.id }).select('_id')).map(u => u._id);
    const doctor = await Doctor.findOne({
      _id: id,
      $or: [{ adminId: req.user.id }, { userId: { $in: userIds } }]
    });
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
    console.error('Error saving poster in adminRoutes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
