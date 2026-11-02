const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const { authenticateAdmin, requireSuperadmin } = require('../middleware/auth');

// List all customers
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { organizationName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [customers, total] = await Promise.all([
      Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Customer.countDocuments(filter)
    ]);

    res.json({
      customers,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch customers', error: error.message });
  }
});

// Get single customer
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Failed', error: error.message });
  }
});

// Get customer stats
router.get('/stats/overview', authenticateAdmin, async (req, res) => {
  try {
    const [total, active, recentUpdates] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({ isActive: true }),
      Customer.countDocuments({ lastUpdateApplied: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
    ]);

    const tierCounts = await Customer.aggregate([
      { $group: { _id: '$licenseTier', count: { $sum: 1 } } }
    ]);

    res.json({
      total,
      active,
      inactive: total - active,
      recentUpdates,
      tierDistribution: tierCounts.reduce((acc, t) => { acc[t._id] = t.count; return acc; }, {})
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed', error: error.message });
  }
});

// Toggle customer active status
router.patch('/:id/toggle-active', authenticateAdmin, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    customer.isActive = !customer.isActive;
    await customer.save();

    res.json({ message: `Customer ${customer.isActive ? 'activated' : 'deactivated'}`, customer: customer.toJSON() });
  } catch (error) {
    res.status(500).json({ message: 'Failed', error: error.message });
  }
});

// Update customer license
router.patch('/:id/license', authenticateAdmin, async (req, res) => {
  try {
    const { licenseKey, licenseTier, licenseExpiry } = req.body;
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    if (licenseKey) customer.licenseKey = licenseKey;
    if (licenseTier) customer.licenseTier = licenseTier;
    if (licenseExpiry) customer.licenseExpiry = new Date(licenseExpiry);

    await customer.save();
    res.json({ message: 'License updated', customer: customer.toJSON() });
  } catch (error) {
    res.status(500).json({ message: 'Failed', error: error.message });
  }
});

// Delete customer (superadmin only)
router.delete('/:id', authenticateAdmin, requireSuperadmin, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed', error: error.message });
  }
});

module.exports = router;
