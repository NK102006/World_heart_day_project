const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const DoctorField = require('../models/DoctorField');
const PromiseHabit = require('../models/PromiseHabit');
const { DEFAULT_PROMISES } = require('./configRoutes');
const { verifyToken, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Helper to get hierarchy tree
const getHierarchyData = async () => {
  const admins = await Admin.find().select('-password').sort({ createdAt: -1 });

  const hierarchy = await Promise.all(admins.map(async (admin) => {
    const users = await User.find({ adminId: admin._id }).select('-password').sort({ createdAt: -1 });

    const usersWithDoctors = await Promise.all(users.map(async (user) => {
      const doctors = await Doctor.find({ userId: user._id }).sort({ createdAt: -1 });
      return {
        ...user.toObject(),
        doctorsCount: doctors.length,
        doctors
      };
    }));

    const totalDoctorsCount = usersWithDoctors.reduce((sum, u) => sum + u.doctorsCount, 0);

    return {
      ...admin.toObject(),
      usersCount: usersWithDoctors.length,
      doctorsCount: totalDoctorsCount,
      users: usersWithDoctors
    };
  }));

  const totalAdmins = admins.length;
  const totalUsers = await User.countDocuments();
  const totalDoctors = await Doctor.countDocuments();

  return {
    stats: { totalAdmins, totalUsers, totalDoctors },
    hierarchy
  };
};

// GET hierarchy (public / explorer view)
router.get('/hierarchy', async (req, res) => {
  try {
    const data = await getHierarchyData();
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// All subsequent administrative mutation routes require SuperAdmin role
router.use(verifyToken, requireRole('superadmin'));

// GET list of admins
router.get('/admins', async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').sort({ createdAt: -1 });

    const adminsWithStats = await Promise.all(admins.map(async (admin) => {
      const usersCount = await User.countDocuments({ adminId: admin._id });
      const doctorsCount = await Doctor.countDocuments({ adminId: admin._id });
      return {
        ...admin.toObject(),
        usersCount,
        doctorsCount
      };
    }));

    res.json({ success: true, admins: adminsWithStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST create new Admin (by Superadmin)
router.post('/admins', async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !name.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Admin Name and password are required'
      });
    }

    if (password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const cleanName = name.trim();
    const existingName = await Admin.findOne({
      name: new RegExp('^' + cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
    });
    if (existingName) {
      return res.status(400).json({
        success: false,
        message: 'An Admin with this Name already exists'
      });
    }

    const admin = new Admin({
      name: cleanName,
      password,
      superadminId: req.user.id
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        organization: admin.organization,
        phone: admin.phone,
        status: admin.status,
        createdAt: admin.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT update an Admin (Name and/or Password)
router.put('/admins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, password } = req.body;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (name && name.trim()) {
      const cleanName = name.trim();
      const existingName = await Admin.findOne({
        _id: { $ne: id },
        name: new RegExp('^' + cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
      });
      if (existingName) {
        return res.status(400).json({
          success: false,
          message: 'An Admin with this Name already exists'
        });
      }
      admin.name = cleanName;
    }

    if (password && password.trim()) {
      if (password.trim().length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }
      admin.password = password.trim();
    }

    if (req.body.status !== undefined) {
      admin.status = req.body.status === 'inactive' || req.body.status === false ? 'inactive' : 'active';
    }

    await admin.save();

    res.json({
      success: true,
      message: 'Admin updated successfully',
      admin: {
        _id: admin._id,
        name: admin.name,
        status: admin.status,
        updatedAt: admin.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE an Admin
router.delete('/admins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findByIdAndDelete(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Optional cascade
    await User.deleteMany({ adminId: id });
    await Doctor.deleteMany({ adminId: id });

    res.json({ success: true, message: 'Admin and associated users/doctors deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// SUPERADMIN USER MANAGEMENT ROUTES (Users under Admins)
// =========================================================================

// GET all users (across all Admins, with optional adminId query filter, with parent admin & doctor counts)
router.get('/users', async (req, res) => {
  try {
    const filter = {};
    if (req.query.adminId) {
      filter.adminId = req.query.adminId;
    }

    const users = await User.find(filter)
      .populate('adminId', 'name')
      .select('-password')
      .sort({ createdAt: -1 });

    const usersWithStats = await Promise.all(users.map(async (u) => {
      const doctorsCount = await Doctor.countDocuments({ userId: u._id });
      return {
        ...u.toObject(),
        doctorsCount
      };
    }));

    res.json({
      success: true,
      count: usersWithStats.length,
      users: usersWithStats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST create new User (assigned to an Admin)
router.post('/users', async (req, res) => {
  try {
    const { employeeId, password, adminId } = req.body;

    if (!employeeId || !employeeId.trim() || !password || !adminId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, password, and parent Admin selection are required'
      });
    }

    if (password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if target admin exists
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Selected parent Admin not found'
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
      adminId: admin._id
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: `User created successfully under Admin "${admin.name}"`,
      user: {
        _id: user._id,
        employeeId: user.employeeId,
        adminId: {
          _id: admin._id,
          name: admin.name
        },
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT update a User (Employee ID, Password, and/or parent Admin)
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId, password, adminId } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
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
          message: 'Another User with this Employee ID already exists'
        });
      }
      user.employeeId = cleanEmpId;
    }

    if (adminId) {
      const admin = await Admin.findById(adminId);
      if (!admin) {
        return res.status(404).json({ success: false, message: 'Selected parent Admin not found' });
      }
      user.adminId = admin._id;
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

    const populatedUser = await User.findById(id).populate('adminId', 'name').select('-password');

    res.json({
      success: true,
      message: 'User updated successfully',
      user: populatedUser
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE a User
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Cascade delete associated doctors
    await Doctor.deleteMany({ userId: id });

    res.json({ success: true, message: 'User and associated doctors deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// =========================================================================
// SUPERADMIN DOCTOR MANAGEMENT ROUTES (Doctors under Users under Admins)
// =========================================================================

// GET doctors (filtered by userId and/or adminId, or all)
router.get('/doctors', async (req, res) => {
  try {
    const filter = {};
    if (req.query.userId) {
      filter.userId = req.query.userId;
    }
    if (req.query.adminId) {
      filter.adminId = req.query.adminId;
    }

    const doctors = await Doctor.find(filter)
      .populate('userId', 'employeeId')
      .populate('adminId', 'name')
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

// GET single doctor details by ID
router.get('/doctors/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('userId', 'employeeId createdAt')
      .populate('adminId', 'name');

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    res.json({
      success: true,
      doctor
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE doctor by ID
router.delete('/doctors/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    res.json({ success: true, message: 'Doctor deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT update doctor by ID (by Superadmin)
router.put('/doctors/:id', upload.any(), async (req, res) => {
  try {
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

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
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

// SAVE / UPLOAD DOWNLOADED POSTER (by Superadmin)
router.post('/doctors/:id/poster', async (req, res) => {
  try {
    const { id } = req.params;
    const { posterData } = req.body;
    if (!posterData) {
      return res.status(400).json({ success: false, message: 'No poster image data provided' });
    }

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
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
    console.error('Error saving poster in superadminRoutes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// SYSTEM CONFIGURATION: DYNAMIC DOCTOR FORM FIELDS CRUD
// =========================================================================

// GET all fields
router.get('/config/fields', async (req, res) => {
  try {
    const fields = await DoctorField.find().sort({ order: 1, createdAt: 1 });
    res.json({ success: true, fields });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST add field
router.post('/config/fields', async (req, res) => {
  try {
    const { name, label, type, placeholder, required, options, order } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Field name / key is required' });
    }
    if (!label || !label.trim()) {
      return res.status(400).json({ success: false, message: 'Field label is required' });
    }

    const cleanKey = name.trim().replace(/[^a-zA-Z0-9_]/g, '');
    const existing = await DoctorField.findOne({ name: cleanKey });
    if (existing) {
      return res.status(400).json({ success: false, message: `Field key "${cleanKey}" already exists` });
    }

    const field = new DoctorField({
      name: cleanKey,
      label: label.trim(),
      type: type || 'text',
      placeholder: placeholder ? placeholder.trim() : '',
      required: Boolean(required),
      options: Array.isArray(options) ? options : (options ? options.split(',').map(s => s.trim()).filter(Boolean) : []),
      order: order ? Number(order) : ((await DoctorField.countDocuments()) + 1),
      isSystem: false
    });

    await field.save();
    res.status(201).json({ success: true, message: 'Field created successfully', field });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT update field
router.put('/config/fields/:id', async (req, res) => {
  try {
    const { label, type, placeholder, required, options, order } = req.body;
    const field = await DoctorField.findById(req.params.id);
    if (!field) {
      return res.status(404).json({ success: false, message: 'Field not found' });
    }

    if (label !== undefined && label.trim()) field.label = label.trim();
    if (type !== undefined) field.type = type;
    if (placeholder !== undefined) field.placeholder = placeholder.trim();
    if (required !== undefined) field.required = Boolean(required);
    if (order !== undefined) field.order = Number(order);
    if (options !== undefined) {
      field.options = Array.isArray(options) ? options : (options ? options.split(',').map(s => s.trim()).filter(Boolean) : []);
    }
    if (req.body.enabled !== undefined) {
      field.enabled = Boolean(req.body.enabled);
    }

    await field.save();
    res.json({ success: true, message: 'Field updated successfully', field });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE field
router.delete('/config/fields/:id', async (req, res) => {
  try {
    const field = await DoctorField.findById(req.params.id);
    if (!field) {
      return res.status(404).json({ success: false, message: 'Field not found' });
    }

    await DoctorField.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: `Field "${field.label}" deleted successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// SYSTEM CONFIGURATION: DYNAMIC PROMISES CRUD
// =========================================================================

// GET all promises
router.get('/config/promises', async (req, res) => {
  try {
    const promises = await PromiseHabit.find().sort({ order: 1, id: 1 });
    res.json({ success: true, promises });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST add promise
router.post('/config/promises', async (req, res) => {
  try {
    const { title, desc, icon, order } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Promise title is required' });
    }

    const highestPromise = await PromiseHabit.findOne().sort({ id: -1 });
    const nextId = (highestPromise?.id || 0) + 1;
    const highestOrder = await PromiseHabit.findOne().sort({ order: -1 });
    const nextOrder = order !== undefined ? Number(order) : ((highestOrder?.order || 0) + 1);

    const promise = new PromiseHabit({
      id: nextId,
      title: title.trim(),
      desc: desc ? desc.trim() : '',
      icon: icon ? icon.trim() : '❤️',
      order: nextOrder
    });

    await promise.save();
    res.status(201).json({ success: true, message: 'Promise created successfully', promise });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT update promise
router.put('/config/promises/:id', async (req, res) => {
  try {
    const { title, desc, icon, order } = req.body;
    const promise = await PromiseHabit.findById(req.params.id);
    if (!promise) {
      return res.status(404).json({ success: false, message: 'Promise not found' });
    }

    if (title !== undefined && title.trim()) promise.title = title.trim();
    if (desc !== undefined) promise.desc = desc.trim();
    if (icon !== undefined && icon.trim()) promise.icon = icon.trim();
    if (order !== undefined) promise.order = Number(order);
    if (req.body.enabled !== undefined) promise.enabled = Boolean(req.body.enabled);

    await promise.save();
    res.json({ success: true, message: 'Promise updated successfully', promise });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE promise
router.delete('/config/promises/:id', async (req, res) => {
  try {
    const promise = await PromiseHabit.findByIdAndDelete(req.params.id);
    if (!promise) {
      return res.status(404).json({ success: false, message: 'Promise not found' });
    }
    res.json({ success: true, message: `Promise "${promise.title}" deleted successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST reset promises to default guidelines
router.post('/config/promises/reset', async (req, res) => {
  try {
    await PromiseHabit.deleteMany({});
    await PromiseHabit.insertMany(DEFAULT_PROMISES);
    const promises = await PromiseHabit.find().sort({ order: 1, id: 1 });
    res.json({ success: true, message: 'Promises reset to default guidelines successfully', promises });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
