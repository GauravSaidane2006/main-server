const express = require('express');
const router = express.Router();
const UpdateClient = require('../../../update-client');
const { authenticate, authorize } = require('../middleware/auth');

// Initialize update client
const updateClient = new UpdateClient({
  mainServerUrl: process.env.MAIN_SERVER_URL || 'http://localhost:5100',
  apiKey: process.env.COMPLYTRACK_API_KEY
});

// Get current update status
router.get('/status', authenticate, async (req, res) => {
  try {
    const pkg = require('../../../package.json');
    const currentVersion = pkg.version || '1.0.0';

    try {
      const updateStatus = await updateClient.checkForUpdates();
      res.json({ currentVersion, mainServerOnline: true, ...updateStatus });
    } catch (error) {
      // Main server unreachable — report gracefully instead of a 500
      const mainServerMonitor = require('../services/mainServerMonitor');
      res.json({
        currentVersion,
        mainServerOnline: false,
        hasUpdate: false,
        updates: [],
        latestVersions: { server: null, client: null, full: null },
        error: error.message,
        monitor: mainServerMonitor.getStatus()
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to check update status', error: error.message });
  }
});

// Check for updates
router.post('/check', authenticate, async (req, res) => {
  try {
    const result = await updateClient.checkForUpdates();
    res.json({ mainServerOnline: true, ...result });
  } catch (error) {
    res.json({
      mainServerOnline: false,
      hasUpdate: false,
      updates: [],
      latestVersions: { server: null, client: null, full: null },
      error: error.message
    });
  }
});

// Apply update (superadmin only)
router.post('/apply', authenticate, authorize('superadmin', 'developer'), async (req, res) => {
  const { version, component } = req.body;

  // Find the update info
  let update;
  try {
    const updates = await updateClient.checkForUpdates();
    update = updates.updates.find(u =>
      u.availableVersion === version && u.component === component
    );
  } catch (err) {
    return res.status(500).json({ message: 'Failed to check for updates', error: err.message });
  }

  if (!update) {
    return res.status(404).json({ message: 'Update not found' });
  }

  // Send response immediately BEFORE applying (apply restarts the server)
  res.json({
    message: 'Update is being applied. The server will restart shortly.',
    version,
    component
  });

  // Apply update asynchronously (after response is sent)
  setImmediate(async () => {
    try {
      console.log(`\n[UPDATE] Applying update to v${version}...`);
      const result = await updateClient.applyUpdate(update, { skipRestart: true });
      console.log(`[UPDATE] Update completed:`, result);
      console.log(`[UPDATE] Server restart needed. Please restart manually or wait for PM2 to restart.`);
    } catch (error) {
      console.error('[UPDATE] Apply failed:', error.message);
    }
  });
});

// Get changelog
router.get('/changelog', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const changelog = await updateClient.getChangelog(limit);
    res.json(changelog);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch changelog', error: error.message });
  }
});

// Download update file
router.get('/download/:version', authenticate, authorize('superadmin', 'developer'), async (req, res) => {
  try {
    const filePath = await updateClient.downloadUpdate(req.params.version);
    res.download(filePath);
  } catch (error) {
    res.status(500).json({ message: 'Download failed', error: error.message });
  }
});

module.exports = router;
