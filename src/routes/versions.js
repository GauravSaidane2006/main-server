const express = require('express');
const router = express.Router();
const Version = require('../models/Version');
const { authenticateAdmin, requireSuperadmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// File upload config for update packages
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../updates');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `v${req.body.version || '0.0.0'}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.zip', '.tar.gz', '.tgz', '.exe', '.msi'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.some(a => ext === a || file.originalname.endsWith(a))) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: .zip, .tar.gz, .exe, .msi'));
    }
  }
});

// List all versions
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { component, page = 1, limit = 20 } = req.query;
    const filter = component ? { component } : {};
    const skip = (page - 1) * limit;

    const [versions, total] = await Promise.all([
      Version.find(filter).sort({ releaseDate: -1 }).skip(skip).limit(parseInt(limit)),
      Version.countDocuments(filter)
    ]);

    res.json({
      versions,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch versions', error: error.message });
  }
});

// Get latest version
router.get('/latest', authenticateAdmin, async (req, res) => {
  try {
    const { component } = req.query;
    const version = await Version.getLatest(component);
    res.json(version || { message: 'No versions published yet' });
  } catch (error) {
    res.status(500).json({ message: 'Failed', error: error.message });
  }
});

// Get single version
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const version = await Version.findById(req.params.id);
    if (!version) return res.status(404).json({ message: 'Version not found' });
    res.json(version);
  } catch (error) {
    res.status(500).json({ message: 'Failed', error: error.message });
  }
});

// Create new version (with optional file upload)
router.post('/', authenticateAdmin, upload.single('package'), async (req, res) => {
  try {
    const { version, component, patchNotes, changelog, isStable, minClientVersion } = req.body;

    if (!version || !patchNotes) {
      return res.status(400).json({ message: 'Version number and patch notes required' });
    }

    // Validate semver format
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      return res.status(400).json({ message: 'Version must be in semver format (e.g., 1.2.3)' });
    }

    // Check if version already exists
    const existing = await Version.findOne({ version });
    if (existing) {
      return res.status(409).json({ message: 'Version already exists' });
    }

    // Parse changelog
    let parsedChangelog = [];
    if (changelog) {
      try {
        parsedChangelog = JSON.parse(changelog);
      } catch {
        parsedChangelog = [{ category: 'improvement', description: patchNotes }];
      }
    }

    const versionData = {
      version,
      component: component || 'full',
      patchNotes,
      changelog: parsedChangelog,
      isStable: isStable !== 'false',
      minClientVersion
    };

    // If file uploaded, add download info
    if (req.file) {
      versionData.downloadUrl = `/updates/${req.file.filename}`;
      versionData.fileSize = req.file.size;
    }

    const newVersion = await Version.create(versionData);
    res.status(201).json(newVersion);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create version', error: error.message });
  }
});

// Mark version as latest
router.patch('/:id/set-latest', authenticateAdmin, requireSuperadmin, async (req, res) => {
  try {
    const version = await Version.findById(req.params.id);
    if (!version) return res.status(404).json({ message: 'Version not found' });

    // Unset previous latest for same component
    await Version.updateMany(
      { component: version.component, isLatest: true },
      { isLatest: false }
    );

    version.isLatest = true;
    await version.save();

    res.json({ message: `Version ${version.version} set as latest`, version });
  } catch (error) {
    res.status(500).json({ message: 'Failed', error: error.message });
  }
});

// Delete version
router.delete('/:id', authenticateAdmin, requireSuperadmin, async (req, res) => {
  try {
    const version = await Version.findById(req.params.id);
    if (!version) return res.status(404).json({ message: 'Version not found' });

    // Delete associated file if exists
    if (version.downloadUrl) {
      const filePath = path.join(__dirname, '../..', version.downloadUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Version.findByIdAndDelete(req.params.id);
    res.json({ message: 'Version deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed', error: error.message });
  }
});

module.exports = router;
