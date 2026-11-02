const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Customer = require('../models/Customer');
const Version = require('../models/Version');
const { authenticateAdmin } = require('../middleware/auth');

// Get dashboard overview
router.get('/overview', authenticateAdmin, async (req, res) => {
  try {
    const [
      totalCustomers,
      activeCustomers,
      recentCustomers,
      totalVersions,
      latestVersion,
      recentUpdates,
      tierDistribution,
      licenseDistribution
    ] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({ isActive: true }),
      Customer.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
      Version.countDocuments(),
      Version.findOne({ isLatest: true }).sort({ releaseDate: -1 }),
      Customer.countDocuments({ lastUpdateApplied: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      Customer.aggregate([{ $group: { _id: '$licenseTier', count: { $sum: 1 } } }]),
      Customer.aggregate([{ $group: { _id: { $cond: [{ $gte: ['$licenseExpiry', new Date()] }, 'active', 'expired'] }, count: { $sum: 1 } } }])
    ]);

    const recentCustomersList = await Customer.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email organizationName licenseTier createdAt isActive');

    const customerUpdates = await Customer.find({ lastUpdateApplied: { $exists: true } })
      .sort({ lastUpdateApplied: -1 })
      .limit(5)
      .select('name currentVersion lastUpdateApplied');

    res.json({
      overview: {
        totalCustomers,
        activeCustomers,
        inactiveCustomers: totalCustomers - activeCustomers,
        recentCustomers,
        totalVersions,
        recentUpdates,
        latestVersion: latestVersion?.version || '1.0.0'
      },
      tierDistribution: tierDistribution.reduce((acc, t) => { acc[t._id || 'Unknown'] = t.count; return acc; }, {}),
      licenseStatus: licenseDistribution.reduce((acc, l) => { acc[l._id] = l.count; return acc; }, {}),
      recentCustomersList,
      customerUpdates
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch dashboard', error: error.message });
  }
});

// Get system stats
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [customers24h, customers7d, customers30d, updates7d, updates30d] = await Promise.all([
      Customer.countDocuments({ createdAt: { $gte: last24h } }),
      Customer.countDocuments({ createdAt: { $gte: last7d } }),
      Customer.countDocuments({ createdAt: { $gte: last30d } }),
      Customer.countDocuments({ lastUpdateApplied: { $gte: last7d } }),
      Customer.countDocuments({ lastUpdateApplied: { $gte: last30d } })
    ]);

    const versionStats = await Version.aggregate([
      { $group: { _id: '$component', count: { $sum: 1 }, latest: { $max: '$releaseDate' } } }
    ]);

    res.json({
      registrations: { last24h: customers24h, last7d: customers7d, last30d: customers30d },
      updates: { last7d: updates7d, last30d: updates30d },
      versions: versionStats.reduce((acc, v) => { acc[v._id] = { count: v.count, latest: v.latest }; return acc; }, {})
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
});

module.exports = router;
