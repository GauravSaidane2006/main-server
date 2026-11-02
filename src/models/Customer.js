const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  apiKey: {
    type: String,
    unique: true,
    default: () => `ct_${uuidv4().replace(/-/g, '')}`
  },
  organizationName: String,
  organizationId: String,
  currentVersion: {
    server: { type: String, default: '1.0.0' },
    client: { type: String, default: '1.0.0' }
  },
  lastUpdateCheck: Date,
  lastUpdateApplied: Date,
  updateHistory: [{
    fromVersion: String,
    toVersion: String,
    component: String,
    appliedAt: Date,
    status: { type: String, enum: ['success', 'failed', 'rolled_back'] }
  }],
  serverUrl: String,
  isActive: {
    type: Boolean,
    default: true
  },
  lastHeartbeat: Date,
  connectionStatus: {
    type: String,
    enum: ['online', 'offline', 'unknown'],
    default: 'unknown'
  },
  serverPlatform: String,
  serverNodeVersion: String,
  serverUptime: Number,
  licenseKey: String,
  licenseTier: {
    type: String,
    enum: ['1 Month', '3 Months', '1 Year'],
    default: '1 Month'
  },
  licenseExpiry: Date,
  linkedPans: [{ type: String, uppercase: true, trim: true }],
  usedLicenseKeys: [{
    key: { type: String, required: true },
    pan: { type: String, required: true, uppercase: true },
    tier: String,
    activatedAt: { type: Date, default: Date.now },
    expiresAt: Date
  }],
  subscription: {
    plan: { type: String, enum: ['free', 'trial', 'basic', 'pro', 'enterprise'], default: 'free' },
    trialStartedAt: Date,
    trialEndDate: Date,
    trialExpiredHandled: { type: Boolean, default: false }
  },
  emailFrequency: {
    type: String,
    enum: ['immediate', 'daily_digest', 'weekly'],
    default: 'immediate'
  },
  autoUpdate: {
    type: Boolean,
    default: false
  },
  notifications: {
    email: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

customerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

customerSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

customerSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.apiKey;
  return obj;
};

module.exports = mongoose.model('Customer', customerSchema);
