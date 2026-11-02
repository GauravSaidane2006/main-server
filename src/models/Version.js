const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  version: {
    type: String,
    required: true,
    unique: true,
    match: /^\d+\.\d+\.\d+$/
  },
  component: {
    type: String,
    enum: ['server', 'client', 'full'],
    default: 'full'
  },
  releaseDate: {
    type: Date,
    default: Date.now
  },
  isLatest: {
    type: Boolean,
    default: false
  },
  isStable: {
    type: Boolean,
    default: true
  },
  minClientVersion: String,
  patchNotes: {
    type: String,
    required: true
  },
  changelog: [{
    category: {
      type: String,
      enum: ['feature', 'fix', 'improvement', 'breaking', 'security']
    },
    description: String
  }],
  downloadUrl: String,
  fileSize: Number,
  checksum: String,
  metadata: {
    nodeVersion: String,
    dependencies: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

versionSchema.statics.getLatest = function(component) {
  return this.findOne({ isLatest: true, ...(component ? { component } : {}) }).sort({ releaseDate: -1 });
};

versionSchema.statics.compareVersions = function(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
};

module.exports = mongoose.model('Version', versionSchema);
