const Customer = require('../models/Customer');
const { ensureDbConnected } = require('../config/db');

const SWEEP_INTERVAL_MS = parseInt(process.env.CONNECTION_SWEEP_INTERVAL_MS || 30000, 10);
const HEARTBEAT_TIMEOUT_MS = parseInt(process.env.HEARTBEAT_TIMEOUT_MS || 90000, 10);

let sweepTimer = null;
let cachedStats = null;
let cachedStatsAt = null;

const connectionMonitor = {
  // Heal the DB if it died, then mark customers whose client-server
  // stopped heartbeating as offline. Stats are refreshed into a cache so
  // /api/health can answer instantly without touching the request path.
  async sweep() {
    if (!(await ensureDbConnected())) {
      return;
    }

    try {
      const staleBefore = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS);
      const result = await Customer.updateMany(
        { lastHeartbeat: { $lt: staleBefore }, connectionStatus: 'online' },
        { $set: { connectionStatus: 'offline' } }
      );
      if (result.modifiedCount > 0) {
        console.log(`[connection-monitor] ${result.modifiedCount} customer server(s) marked offline (no heartbeat in ${HEARTBEAT_TIMEOUT_MS}ms)`);
      }
    } catch (error) {
      console.error('[connection-monitor] sweep failed:', error.message);
    }

    try {
      const [total, online, offline] = await Promise.all([
        Customer.countDocuments({ isActive: true }),
        Customer.countDocuments({ isActive: true, connectionStatus: 'online' }),
        Customer.countDocuments({ isActive: true, connectionStatus: 'offline' })
      ]);
      cachedStats = { total, online, offline, unknown: total - online - offline };
      cachedStatsAt = new Date();
    } catch (error) {
      console.error('[connection-monitor] stats refresh failed:', error.message);
    }
  },

  async getStats() {
    if (!cachedStats && !cachedStatsAt) await this.sweep();
    return cachedStats || { total: 0, online: 0, offline: 0, unknown: 0 };
  },

  start() {
    if (sweepTimer) return;
    sweepTimer = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);
    if (sweepTimer.unref) sweepTimer.unref();
    this.sweep();
    console.log(`[connection-monitor] started (sweep every ${SWEEP_INTERVAL_MS}ms, heartbeat timeout ${HEARTBEAT_TIMEOUT_MS}ms)`);
  },

  stop() {
    if (sweepTimer) {
      clearInterval(sweepTimer);
      sweepTimer = null;
    }
  }
};

module.exports = connectionMonitor;