const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const { authenticateAdmin, requireSuperadmin, JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Get current admin profile
router.get('/profile', authenticateAdmin, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('-password');
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
});

// Update admin profile
router.put('/profile', authenticateAdmin, async (req, res) => {
  try {
    const { name, email } = req.body;
    const admin = await Admin.findById(req.admin._id);

    if (email && email !== admin.email) {
      const existing = await Admin.findOne({ email });
      if (existing) return res.status(409).json({ message: 'Email already in use' });
      admin.email = email;
    }
    if (name) admin.name = name;

    await admin.save();

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role, type: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ admin: admin.toJSON(), token });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
});

// Change password
router.put('/password', authenticateAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const admin = await Admin.findById(req.admin._id);
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    admin.password = newPassword;
    await admin.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to change password', error: error.message });
  }
});

// List all admins (superadmin only)
router.get('/', authenticateAdmin, requireSuperadmin, async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch admins', error: error.message });
  }
});

// Create admin (superadmin only)
router.post('/', authenticateAdmin, requireSuperadmin, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name required' });
    }

    const existing = await Admin.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already exists' });

    const admin = await Admin.create({ email, password, name, role: role || 'admin' });
    res.status(201).json(admin.toJSON());
  } catch (error) {
    res.status(500).json({ message: 'Failed to create admin', error: error.message });
  }
});

// Delete admin (superadmin only, can't delete self)
router.delete('/:id', authenticateAdmin, requireSuperadmin, async (req, res) => {
  try {
    if (req.params.id === req.admin._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }
    await Admin.findByIdAndDelete(req.params.id);
    res.json({ message: 'Admin deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete admin', error: error.message });
  }
});

module.exports = router;
