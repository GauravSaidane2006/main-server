const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const { authenticateCustomer } = require('../middleware/auth');

// Client-server heartbeat — keeps the customer's connection marked online.
// Called periodically by every deployed ComplyTrack server with its API key.
router.post('/', authenticateCustomer, async (req, res) => {
  try {
    const {
      serverVersion,
      clientVersion,
      serverUrl,
      uptime,
      platform,
      nodeVersion
    } = req.body || {};

    const customer = req.customer;

    customer.lastHeartbeat = new Date();
    customer.connectionStatus = 'online';
    if (serverVersion) customer.currentVersion.server = serverVersion;
    if (clientVersion) customer.currentVersion.client = clientVersion;
    if (serverUrl) customer.serverUrl = serverUrl;
    if (uptime !== undefined && !isNaN(parseFloat(uptime))) customer.serverUptime = parseFloat(uptime);
    if (platform) customer.serverPlatform = String(platform).slice(0, 100);
    if (nodeVersion) customer.serverNodeVersion = String(nodeVersion).slice(0, 50);

    await customer.save();

    res.json({
      status: 'ok',
      message: 'Heartbeat received',
      serverTime: new Date(),
      heartbeatIntervalMs: parseInt(process.env.HEARTBEAT_INTERVAL_MS || 30000, 10)
    });
  } catch (error) {
    res.status(500).json({ message: 'Heartbeat failed', error: error.message });
  }
});

module.exports = router;