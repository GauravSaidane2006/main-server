const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Customer = require('../models/Customer');
const { authenticateCustomer } = require('../middleware/auth');

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const TIERS = {
  '1M': { label: '1 Month', days: 30 },
  '3M': { label: '3 Months', days: 90 },
  '1Y': { label: '1 Year', days: 365 },
};

function checksum(data) {
  return crypto.createHash('sha256').update(data).digest('hex')[0].toUpperCase();
}

function parseKey(raw) {
  const clean = String(raw || '').replace(/[-\s]/g, '').toUpperCase();
  if (clean.length !== 16) return null;
  const prefix = clean.substring(0, 2);
  const tier = TIERS[prefix];
  if (!tier) return null;
  const csInput = prefix + clean.substring(3);
  const expectedCs = checksum(csInput);
  const actualCs = clean[2];
  if (expectedCs !== actualCs) return null;
  return {
    key: clean.match(/.{1,4}/g).join('-'),
    raw: clean,
    tier: prefix,
    tierLabel: tier.label,
    days: tier.days,
  };
}

function normalizePan(pan) {
  const clean = String(pan || '').replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(clean)) return null;
  return clean;
}

// Validate a license key-PAN combination during registration
// Called by complytrack server with x-api-key authentication
router.post('/validate', authenticateCustomer, async (req, res) => {
  try {
    const { licenseKey, pan } = req.body;

    if (!licenseKey) {
      return res.status(400).json({ valid: false, message: 'License key is required' });
    }
    if (!pan) {
      return res.status(400).json({ valid: false, message: 'PAN is required' });
    }

    const parsedKey = parseKey(licenseKey);
    if (!parsedKey) {
      return res.status(400).json({ valid: false, message: 'Invalid license key format or checksum' });
    }

    const normalizedPan = normalizePan(pan);
    if (!normalizedPan) {
      return res.status(400).json({ valid: false, message: 'Invalid PAN format. Expected: AAAAA9999A' });
    }

    // Check if this key is already used by a DIFFERENT customer
    const keyUsedBy = await Customer.findOne({
      'usedLicenseKeys.key': parsedKey.key,
      _id: { $ne: req.customer._id }
    }).select('name email organizationName');

    if (keyUsedBy) {
      return res.status(409).json({
        valid: false,
        message: 'This license key is already assigned to another customer',
        conflict: 'key_used',
        usedBy: keyUsedBy.organizationName || keyUsedBy.name
      });
    }

    // Check if this PAN is already used by a DIFFERENT customer
    const panUsedBy = await Customer.findOne({
      linkedPans: normalizedPan,
      _id: { $ne: req.customer._id }
    }).select('name email organizationName');

    if (panUsedBy) {
      return res.status(409).json({
        valid: false,
        message: 'This PAN is already linked to another customer account',
        conflict: 'pan_used',
        usedBy: panUsedBy.organizationName || panUsedBy.name
      });
    }

    // Check if this customer already has this key+PAN combo (idempotent)
    const alreadyOwns = req.customer.usedLicenseKeys.find(
      lk => lk.key === parsedKey.key && lk.pan === normalizedPan
    );

    if (alreadyOwns) {
      const now = new Date();
      return res.json({
        valid: true,
        message: 'License already activated for this PAN',
        tier: parsedKey.tierLabel,
        days: parsedKey.days,
        expiresAt: alreadyOwns.expiresAt,
        alreadyActivated: true
      });
    }

    // All checks passed — pair key + PAN
    const now = new Date();
    const expiresAt = new Date(now.getTime() + parsedKey.days * 24 * 60 * 60 * 1000);

    // Add to usedLicenseKeys
    req.customer.usedLicenseKeys.push({
      key: parsedKey.key,
      pan: normalizedPan,
      tier: parsedKey.tierLabel,
      activatedAt: now,
      expiresAt
    });

    // Add PAN to linkedPans if not already there
    if (!req.customer.linkedPans.includes(normalizedPan)) {
      req.customer.linkedPans.push(normalizedPan);
    }

    // Update current license fields
    req.customer.licenseKey = parsedKey.key;
    req.customer.licenseTier = parsedKey.tierLabel;
    req.customer.licenseExpiry = expiresAt;

    await req.customer.save();

    res.json({
      valid: true,
      message: `License activated: ${parsedKey.tierLabel}`,
      tier: parsedKey.tierLabel,
      days: parsedKey.days,
      expiresAt
    });
  } catch (error) {
    console.error('License validation error:', error);
    res.status(500).json({ valid: false, message: 'License validation failed' });
  }
});

// Get status of a license key (public-ish, uses API key auth)
router.post('/status', authenticateCustomer, async (req, res) => {
  try {
    const { licenseKey } = req.body;
    if (!licenseKey) {
      return res.status(400).json({ message: 'License key is required' });
    }

    const parsedKey = parseKey(licenseKey);
    if (!parsedKey) {
      return res.status(400).json({ valid: false, message: 'Invalid key format' });
    }

    const owner = await Customer.findOne({
      'usedLicenseKeys.key': parsedKey.key
    }).select('name email organizationName linkedPans');

    if (!owner) {
      return res.json({
        key: parsedKey.key,
        status: 'available',
        tier: parsedKey.tierLabel,
        days: parsedKey.days
      });
    }

    const entry = owner.usedLicenseKeys.find(lk => lk.key === parsedKey.key);

    res.json({
      key: parsedKey.key,
      status: 'used',
      tier: parsedKey.tierLabel,
      pan: entry ? entry.pan : null,
      activatedAt: entry ? entry.activatedAt : null,
      expiresAt: entry ? entry.expiresAt : null,
      owner: owner.organizationName || owner.name
    });
  } catch (error) {
    console.error('License status error:', error);
    res.status(500).json({ message: 'Failed to check license status' });
  }
});

module.exports = router;
