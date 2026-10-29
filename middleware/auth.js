const jwt = require('jsonwebtoken');

const SuperAdmin = require('../models/SuperAdmin');
const Admin = require('../models/Admin');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'world_heart_day_secret_key_2026';

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ success: false, isDeleted: false, message: 'Invalid or expired token.' });
  }

  try {
    if (!decoded || !decoded.id || !decoded.role) {
      return res.status(401).json({ success: false, isDeleted: true, message: 'Invalid session payload.' });
    }

    if (decoded.role === 'superadmin') {
      const superAdmin = await SuperAdmin.findById(decoded.id).select('_id name');
      if (!superAdmin) {
        return res.status(401).json({
          success: false,
          isDeleted: true,
          message: 'SuperAdmin account no longer exists. Session terminated.'
        });
      }
      req.user = decoded;
      req.account = superAdmin;
      return next();
    }

    if (decoded.role === 'admin') {
      const admin = await Admin.findById(decoded.id).select('_id name status');
      if (!admin) {
        return res.status(401).json({
          success: false,
          isDeleted: true,
          message: 'Admin account has been deleted. Session destroyed.'
        });
      }
      if (admin.status === 'inactive') {
        return res.status(401).json({
          success: false,
          isDeleted: true,
          message: 'Admin account has been deactivated. Session destroyed.'
        });
      }
      req.user = decoded;
      req.account = admin;
      return next();
    }

    if (decoded.role === 'user') {
      const user = await User.findById(decoded.id).select('_id employeeId adminId status');
      if (!user) {
        return res.status(401).json({
          success: false,
          isDeleted: true,
          message: 'Employee account has been deleted. Session destroyed.'
        });
      }
      if (user.status === 'inactive') {
        return res.status(401).json({
          success: false,
          isDeleted: true,
          message: 'Employee account has been deactivated. Session destroyed.'
        });
      }

      // Check if parent admin still exists and is active
      if (user.adminId) {
        const parentAdmin = await Admin.findById(user.adminId).select('_id status');
        if (!parentAdmin) {
          return res.status(401).json({
            success: false,
            isDeleted: true,
            message: 'Parent Admin organization has been deleted. Session destroyed.'
          });
        }
        if (parentAdmin.status === 'inactive') {
          return res.status(401).json({
            success: false,
            isDeleted: true,
            message: 'Parent Admin organization has been deactivated. Session destroyed.'
          });
        }
      }

      req.user = decoded;
      req.account = user;
      return next();
    }

    return res.status(401).json({ success: false, isDeleted: true, message: 'Invalid session role.' });
  } catch (error) {
    console.error('Session verification error:', error);
    return res.status(500).json({ success: false, message: 'Database authentication error' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: requires one of the roles [${roles.join(', ')}]`
      });
    }
    next();
  };
};

module.exports = {
  JWT_SECRET,
  generateToken,
  verifyToken,
  requireRole
};
