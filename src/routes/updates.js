const express = require('express');
const router = express.Router();
const Version = require('../models/Version');
const Customer = require('../models/Customer');
const { authenticateCustomer, authenticateCustomerJWT } = require('../middleware/auth');

// Check for updates (API key auth - for customer servers)
router.get('/check', authenticateCustomer, async (req, res) => {
  try {
    const { currentServerVersion, currentClientVersion } = req.query;
    const customer = req.customer;

    // Update last check time
    customer.lastUpdateCheck = new Date();
    await customer.save();

    const latestServer = await Version.getLatest('server');
    const latestClient = await Version.getLatest('client');
    const latestFull = await Version.getLatest('full');

    const updates = [];

    // Check server version
    if (currentServerVersion && latestServer) {
      if (Version.compareVersions(latestServer.version, currentServerVersion) > 0) {
        updates.push({
          component: 'server',
          currentVersion: currentServerVersion,
          availableVersion: latestServer.version,
          patchNotes: latestServer.patchNotes,
          changelog: latestServer.changelog,
          downloadUrl: latestServer.downloadUrl,
          fileSize: latestServer.fileSize,
          releaseDate: latestServer.releaseDate,
          isStable: latestServer.isStable
        });
      }
    }

    // Check client version
    if (currentClientVersion && latestClient) {
      if (Version.compareVersions(latestClient.version, currentClientVersion) > 0) {
        updates.push({
          component: 'client',
          currentVersion: currentClientVersion,
          availableVersion: latestClient.version,
          patchNotes: latestClient.patchNotes,
          changelog: latestClient.changelog,
          downloadUrl: latestClient.downloadUrl,
          fileSize: latestClient.fileSize,
          releaseDate: latestClient.releaseDate,
          isStable: latestClient.isStable
        });
      }
    }

    // Check full stack
    if (latestFull && currentServerVersion) {
      if (Version.compareVersions(latestFull.version, currentServerVersion) > 0) {
        updates.push({
          component: 'full',
          currentVersion: currentServerVersion,
          availableVersion: latestFull.version,
          patchNotes: latestFull.patchNotes,
          changelog: latestFull.changelog,
          downloadUrl: latestFull.downloadUrl,
          fileSize: latestFull.fileSize,
          releaseDate: latestFull.releaseDate,
          isStable: latestFull.isStable
        });
      }
    }

    res.json({
      hasUpdate: updates.length > 0,
      updates,
      latestVersions: {
        server: latestServer?.version || null,
        client: latestClient?.version || null,
        full: latestFull?.version || null
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to check updates', error: error.message });
  }
});

// Check for updates (JWT auth - for customer dashboard)
router.get('/check-jwt', authenticateCustomerJWT, async (req, res) => {
  try {
    const { currentServerVersion, currentClientVersion } = req.query;
    const customer = req.customer;

    customer.lastUpdateCheck = new Date();
    await customer.save();

    const latestServer = await Version.getLatest('server');
    const latestClient = await Version.getLatest('client');
    const latestFull = await Version.getLatest('full');

    const updates = [];

    if (currentServerVersion && latestServer) {
      if (Version.compareVersions(latestServer.version, currentServerVersion) > 0) {
        updates.push({
          component: 'server',
          currentVersion: currentServerVersion,
          availableVersion: latestServer.version,
          patchNotes: latestServer.patchNotes,
          changelog: latestServer.changelog,
          downloadUrl: latestServer.downloadUrl,
          fileSize: latestServer.fileSize,
          releaseDate: latestServer.releaseDate,
          isStable: latestServer.isStable
        });
      }
    }

    if (currentClientVersion && latestClient) {
      if (Version.compareVersions(latestClient.version, currentClientVersion) > 0) {
        updates.push({
          component: 'client',
          currentVersion: currentClientVersion,
          availableVersion: latestClient.version,
          patchNotes: latestClient.patchNotes,
          changelog: latestClient.changelog,
          downloadUrl: latestClient.downloadUrl,
          fileSize: latestClient.fileSize,
          releaseDate: latestClient.releaseDate,
          isStable: latestClient.isStable
        });
      }
    }

    if (latestFull && currentServerVersion) {
      if (Version.compareVersions(latestFull.version, currentServerVersion) > 0) {
        updates.push({
          component: 'full',
          currentVersion: currentServerVersion,
          availableVersion: latestFull.version,
          patchNotes: latestFull.patchNotes,
          changelog: latestFull.changelog,
          downloadUrl: latestFull.downloadUrl,
          fileSize: latestFull.fileSize,
          releaseDate: latestFull.releaseDate,
          isStable: latestFull.isStable
        });
      }
    }

    res.json({
      hasUpdate: updates.length > 0,
      updates,
      latestVersions: {
        server: latestServer?.version || null,
        client: latestClient?.version || null,
        full: latestFull?.version || null
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to check updates', error: error.message });
  }
});

// Get all versions with patch notes (public - for changelog display)
router.get('/changelog', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const versions = await Version.find({ isStable: true })
      .sort({ releaseDate: -1 })
      .limit(parseInt(limit))
      .select('version component patchNotes changelog releaseDate isLatest');

    res.json(versions);
  } catch (error) {
    res.status(500).json({ message: 'Failed', error: error.message });
  }
});

// Get specific version patch notes
router.get('/changelog/:version', async (req, res) => {
  try {
    const version = await Version.findOne({ version: req.params.version })
      .select('version component patchNotes changelog releaseDate isLatest');

    if (!version) return res.status(404).json({ message: 'Version not found' });
    res.json(version);
  } catch (error) {
    res.status(500).json({ message: 'Failed', error: error.message });
  }
});

// Report update applied (customer tells main server they updated)
router.post('/applied', authenticateCustomer, async (req, res) => {
  try {
    const { fromVersion, toVersion, component, status } = req.body;
    const customer = req.customer;

    customer.updateHistory.push({
      fromVersion,
      toVersion,
      component: component || 'full',
      appliedAt: new Date(),
      status: status || 'success'
    });

    // Update current version
    if (component === 'server' || component === 'full') {
      customer.currentVersion.server = toVersion;
    }
    if (component === 'client' || component === 'full') {
      customer.currentVersion.client = toVersion;
    }

    customer.lastUpdateApplied = new Date();
    await customer.save();

    res.json({ message: 'Update recorded', customer: customer.toJSON() });
  } catch (error) {
    res.status(500).json({ message: 'Failed to record update', error: error.message });
  }
});

// Get customer's update history
router.get('/history', authenticateCustomer, async (req, res) => {
  try {
    const customer = req.customer;
    res.json({
      currentVersion: customer.currentVersion,
      updateHistory: customer.updateHistory.sort((a, b) => b.appliedAt - a.appliedAt),
      lastUpdateCheck: customer.lastUpdateCheck,
      lastUpdateApplied: customer.lastUpdateApplied
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed', error: error.message });
  }
});

// Download update file
router.get('/download/:version', authenticateCustomer, async (req, res) => {
  try {
    const version = await Version.findOne({ version: req.params.version });
    if (!version || !version.downloadUrl) {
      return res.status(404).json({ message: 'Update package not found' });
    }

    const filePath = require('path').join(__dirname, '../..', version.downloadUrl);
    if (!require('fs').existsSync(filePath)) {
      return res.status(404).json({ message: 'Update file not found on server' });
    }

    res.download(filePath, `complytrack-v${version.version}.zip`);
  } catch (error) {
    res.status(500).json({ message: 'Download failed', error: error.message });
  }
});

module.exports = router;
