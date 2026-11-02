const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Customer = require('../models/Customer');
const { JWT_SECRET } = require('../middleware/auth');

// Admin login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const admin = await Admin.findOne({ email, isActive: true });
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role, type: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, admin: admin.toJSON() });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// Customer register
router.post('/customer/register', async (req, res) => {
  try {
    const { name, email, password, organizationName, licenseKey } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password required' });
    }

    const existing = await Customer.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const customer = await Customer.create({
      name, email, password, organizationName, licenseKey
    });

    const token = jwt.sign(
      { id: customer._id, email: customer.email, type: 'customer' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      customer: customer.toJSON(),
      apiKey: customer.apiKey
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Customer login
router.post('/customer/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const customer = await Customer.findOne({ email, isActive: true });
    if (!customer || !(await customer.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    customer.lastLogin = new Date();
    await customer.save();

    const token = jwt.sign(
      { id: customer._id, email: customer.email, type: 'customer' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, customer: customer.toJSON() });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// Customer refresh API key
router.post('/customer/refresh-key', async (req, res) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Auth required' });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'customer') return res.status(403).json({ message: 'Forbidden' });

    const customer = await Customer.findById(decoded.id);
    if (!customer) return res.status(404).json({ message: 'Not found' });

    customer.apiKey = `ct_${uuidv4().replace(/-/g, '')}`;
    await customer.save();

    res.json({ apiKey: customer.apiKey });
  } catch (error) {
    res.status(500).json({ message: 'Failed', error: error.message });
  }
});

module.exports = router;
