const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Customer = require('../models/Customer');

const JWT_SECRET = process.env.JWT_SECRET || 'complytrack_main_server_secret';

// Authenticate admin
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive admin account' });
    }

    req.admin = admin;
    req.adminId = admin._id;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    next(error);
  }
};

// Authenticate customer via API key
const authenticateCustomer = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    if (!apiKey) {
      return res.status(401).json({ message: 'API key required' });
    }

    const customer = await Customer.findOne({ apiKey, isActive: true });
    if (!customer) {
      return res.status(401).json({ message: 'Invalid API key' });
    }

    req.customer = customer;
    req.customerId = customer._id;
    next();
  } catch (error) {
    next(error);
  }
};

// Authenticate customer via JWT (for dashboard)
const authenticateCustomerJWT = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'customer') {
      return res.status(403).json({ message: 'Customer access required' });
    }

    const customer = await Customer.findById(decoded.id);
    if (!customer || !customer.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive account' });
    }

    req.customer = customer;
    req.customerId = customer._id;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    next(error);
  }
};

// Require superadmin for dangerous operations
const requireSuperadmin = (req, res, next) => {
  if (req.admin?.role !== 'superadmin') {
    return res.status(403).json({ message: 'Superadmin access required' });
  }
  next();
};

module.exports = {
  authenticateAdmin,
  authenticateCustomer,
  authenticateCustomerJWT,
  requireSuperadmin,
  JWT_SECRET
};
