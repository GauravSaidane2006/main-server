require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const mongoose = require('mongoose');

// Route imports
const authRoutes = require('./routes/auth');
const versionRoutes = require('./routes/versions');
const updateRoutes = require('./routes/updates');
const customerRoutes = require('./routes/customers');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const heartbeatRoutes = require('./routes/heartbeat');
const licenseRoutes = require('./routes/licenses');

// Services
const connectionMonitor = require('./services/connectionMonitor');

// Model imports (for seeding)
const Admin = require('./models/Admin');
const Version = require('./models/Version');

const app = express();
const PORT = process.env.PORT || 5100;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files for updates
const updatesDir = path.join(__dirname, '../updates');
if (!fs.existsSync(updatesDir)) fs.mkdirSync(updatesDir, { recursive: true });
app.use('/updates', express.static(updatesDir));

// Serve admin dashboard in production
const adminDist = path.join(__dirname, '../admin-dashboard/dist');
if (fs.existsSync(adminDist)) {
  app.use('/admin', express.static(adminDist));
  app.use('/admin', (req, res) => {
    res.sendFile(path.join(adminDist, 'index.html'));
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api/updates', updateRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/heartbeat', heartbeatRoutes);
app.use('/api/licenses', licenseRoutes);

// Health check — answers instantly (stats are cached; no DB query on this path
// so the health poll never hangs, even if the DB temporarily went down)
app.get('/api/health', async (req, res) => {
  const stats = await connectionMonitor.getStats();
  res.json({
    status: 'ok',
    timestamp: new Date(),
    service: 'complytrack-main-server',
    uptime: Math.round(process.uptime()),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    connections: stats
  });
});

// Seed default admin
const seedAdmin = async () => {
  try {
    const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL || 'admin@complytrack.io' });
    if (!existing) {
      await Admin.create({
        email: process.env.ADMIN_EMAIL || 'admin@complytrack.io',
        password: process.env.ADMIN_PASSWORD || 'Admin@123456',
        name: 'System Administrator',
        role: 'superadmin'
      });
      console.log('Default admin seeded');
    }
  } catch (error) {
    console.error('Admin seeding error:', error.message);
  }
};

// Seed initial version
const seedVersion = async () => {
  try {
    const existing = await Version.findOne({ version: '1.0.0' });
    if (!existing) {
      await Version.create({
        version: '1.0.0',
        component: 'full',
        patchNotes: 'Initial release of ComplyTrack compliance management system',
        changelog: [
          { category: 'feature', description: 'Full compliance management system' },
          { category: 'feature', description: 'License key activation system' },
          { category: 'feature', description: 'Role-based access control' },
          { category: 'feature', description: 'Onboarding workflow' }
        ],
        isLatest: true,
        isStable: true
      });
      console.log('Initial version 1.0.0 seeded');
    }
  } catch (error) {
    console.error('Version seeding error:', error.message);
  }
};

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();

    await Promise.all([seedAdmin(), seedVersion()]);

    connectionMonitor.start();

    const tryListen = (port) => {
      const server = app.listen(port, () => {
        console.log(`Main server running on port ${port}`);
        console.log(`API available at http://localhost:${port}/api`);
        console.log(`Admin dashboard at http://localhost:${port}/admin`);
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          // Never silently move ports — client servers monitor MAIN_SERVER_URL
          // on a fixed port; a second instance on another port is unreachable.
          console.error(`Port ${port} is already in use. Another main server instance is running. Refusing to start a duplicate.`);
          process.exit(1);
        }
        throw err;
      });
    };

    tryListen(PORT);
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

startServer();
