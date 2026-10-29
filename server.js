require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const superadminRoutes = require('./routes/superadminRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const { configRouter, ensureDefaults } = require('./routes/configRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect directly to MongoDB (without seed data)
connectDB().then(() => {
  ensureDefaults();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static folder for uploaded doctor images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', (req, res) => {
  res.status(404).send('Photo not found');
});

// Serve React client production bundle
app.use(express.static(path.join(__dirname, 'client', 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/config', configRouter);
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);

// Health check & DB Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'World Heart Day - Doctor Onboarding & Campaign Management',
    timestamp: new Date().toISOString()
  });
});

// Fallback to React app index.html (Express 5 compatible)
app.use((req, res) => {
  const clientDist = path.join(__dirname, 'client', 'dist', 'index.html');
  const fs = require('fs');
  if (fs.existsSync(clientDist)) {
    return res.sendFile(clientDist);
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`===================================================`);
  console.log(`❤️  World Heart Day 2026 Platform running on:`);
  console.log(`🌐  Local URL: http://localhost:${PORT}`);
  console.log(`📁  Database:  World_heart_day_project (MongoDB)`);
  console.log(`===================================================`);
});
