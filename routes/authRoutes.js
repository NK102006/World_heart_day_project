const express = require('express');
const router = express.Router();
const SuperAdmin = require('../models/SuperAdmin');
const Admin = require('../models/Admin');
const User = require('../models/User');
const { generateToken, verifyToken } = require('../middleware/auth');

// Unified Login Endpoint supporting:
// 1. Superadmin: Name & Password
// 2. Admin: Name & Password
// 3. User: Employee ID & Password
router.post('/login', async (req, res) => {
  try {
    const { name, employeeId, email, password, role } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // ==============================================================
    // 1. SUPERADMIN LOGIN: 1. Name, 2. Password
    // ==============================================================
    if (role === 'superadmin') {
      const searchIdentifier = (name || '').trim();
      if (!searchIdentifier) {
        return res.status(400).json({ success: false, message: 'Superadmin Name is required' });
      }

      // Directly fetch SuperAdmin from MongoDB
      const superAdmin = await SuperAdmin.findOne({
        name: new RegExp('^' + searchIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
      });

      if (!superAdmin) {
        return res.status(401).json({ success: false, message: 'Invalid Superadmin Name or Password' });
      }

      const isMatch = await superAdmin.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid Superadmin Name or Password' });
      }

      const token = generateToken({
        id: superAdmin._id,
        name: superAdmin.name,
        role: 'superadmin'
      });

      return res.json({
        success: true,
        message: 'SuperAdmin login successful',
        token,
        user: { id: superAdmin._id, name: superAdmin.name, role: 'superadmin' }
      });
    }

    // ==============================================================
    // 2. ADMIN LOGIN: 1. Name/ID, 2. Password
    // ==============================================================
    if (role === 'admin') {
      const searchIdentifier = (name || '').trim();
      if (!searchIdentifier) {
        return res.status(400).json({ success: false, message: 'Admin Name is required' });
      }

      // Directly fetch Admin from MongoDB
      const admin = await Admin.findOne({
        name: new RegExp('^' + searchIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
      });

      if (!admin) {
        return res.status(401).json({ success: false, message: 'Invalid Admin Name or Password' });
      }

      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid Admin Name or Password' });
      }

      const token = generateToken({
        id: admin._id,
        name: admin.name,
        role: 'admin',
        superadminId: admin.superadminId,
        organization: admin.organization
      });

      return res.json({
        success: true,
        message: 'Admin login successful',
        token,
        user: { id: admin._id, name: admin.name, role: 'admin', organization: admin.organization }
      });
    }

    // ==============================================================
    // 3. USER (HOME) LOGIN: 1. Employee ID, 2. Password
    // ==============================================================
    if (role === 'user' || !role) {
      const searchEmpId = (employeeId || name || '').trim();
      if (!searchEmpId) {
        return res.status(400).json({ success: false, message: 'Employee ID is required' });
      }

      const user = await User.findOne({
        employeeId: new RegExp('^' + searchEmpId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
      }).populate('adminId', 'name organization');

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid Employee ID or Password' });
      }

      let isMatch = await user.comparePassword(password);
      if (!isMatch && password.trim() !== password) {
        isMatch = await user.comparePassword(password.trim());
      }
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid Employee ID or Password' });
      }

      const token = generateToken({
        id: user._id,
        employeeId: user.employeeId,
        role: 'user',
        adminId: user.adminId ? user.adminId._id : null
      });

      return res.json({
        success: true,
        message: 'User login successful',
        token,
        user: {
          id: user._id,
          employeeId: user.employeeId,
          role: 'user',
          admin: user.adminId ? { id: user.adminId._id, name: user.adminId.name } : null
        }
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid role specified' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get current user profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    let userData = null;
    if (req.user.role === 'superadmin') {
      userData = await SuperAdmin.findById(req.user.id).select('-password');
    } else if (req.user.role === 'admin') {
      userData = await Admin.findById(req.user.id).select('-password');
    } else if (req.user.role === 'user') {
      userData = await User.findById(req.user.id).select('-password').populate('adminId', 'name organization');
    }

    if (!userData) {
      return res.status(401).json({ success: false, isDeleted: true, message: 'Account no longer exists. Session destroyed.' });
    }

    res.json({ success: true, user: userData, role: req.user.role });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
