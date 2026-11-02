const cron = require('node-cron');
const Compliance = require('../models/Compliance');
const Alert = require('../models/Alert');
const Organization = require('../models/Organization');
const User = require('../models/User');
const { sendDeadlineAlertEmail, sendLoginDigestEmail, sendDailyDigestEmail, sendWeeklyDigestEmail } = require('../utils/emailService');
const { emitToOrg, setSocketIO } = require('../utils/socketHelper');
const { expireTrials, sendTrialReminders } = require('./trialService');

const updateOverdueStatus = async () => {
  try {
    const now = new Date();
    const result = await Compliance.updateMany(
      {
        dueDate: { $lt: now },
        status: { $nin: ['completed', 'waived', 'overdue'] }
      },
      { $set: { status: 'overdue' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`Marked ${result.modifiedCount} items as overdue.`);
    }
  } catch (error) {
    console.error('Error updating overdue status:', error.message);
  }
};

const generateDeadlineAlerts = async () => {
  try {
    const now = new Date();
    const maxDays = 90;
    const futureCutoff = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);

    const upcomingItems = await Compliance.find({
      dueDate: { $gte: now, $lte: futureCutoff },
      status: { $nin: ['completed', 'waived', 'overdue'] }
    }).populate('assignedTo');

    for (const item of upcomingItems) {
      const settings = item.reminderSettings || { daysBefore: [7], enabled: true };
      if (!settings.enabled) continue;

      const daysBefore = settings.daysBefore?.length ? settings.daysBefore : [7];
      const daysUntilDue = Math.ceil((item.dueDate - now) / (1000 * 60 * 60 * 24));

      if (!daysBefore.includes(daysUntilDue)) continue;

      const existingAlert = await Alert.findOne({
        organization: item.organization,
        complianceItem: item._id,
        type: 'deadline',
        reminderDay: daysUntilDue,
        createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      });
      if (existingAlert) continue;

      for (const user of item.assignedTo) {
        const alert = await Alert.create({
          organization: item.organization,
          user: user._id,
          type: 'deadline',
          title: `Reminder: ${item.title} — ${daysUntilDue} day(s) left`,
          message: `${item.title} is due in ${daysUntilDue} day(s) on ${item.dueDate.toLocaleDateString()}.`,
          complianceItem: item._id,
          priority: item.priority,
          sentVia: ['in-app', 'email'],
          scheduledFor: now,
          reminderDay: daysUntilDue
        });

        emitToOrg(item.organization, 'alert:new', {
          _id: alert._id,
          title: alert.title,
          message: alert.message,
          type: alert.type,
          priority: alert.priority,
          createdAt: alert.createdAt
        });

        sendDeadlineAlertEmail(user, item).catch(err => {
          console.error('Failed to send deadline email:', err.message);
        });
      }
    }
  } catch (error) {
    console.error('Error generating alerts:', error.message);
  }
};

const sendLoginDigest = async (userId) => {
  try {
    const user = await User.findById(userId).select('-password');
    if (!user || !user.isActive) return;

    const lastDigest = user.lastLoginDigestSent;
    const now = new Date();
    if (lastDigest) {
      const hoursSince = (now - new Date(lastDigest)) / (1000 * 60 * 60);
      if (hoursSince < 20) return;
    }

    const orgFilter = { organization: user.organization };
    const [total, pending, inProgress, completed, overdue] = await Promise.all([
      Compliance.countDocuments(orgFilter),
      Compliance.countDocuments({ ...orgFilter, status: 'pending' }),
      Compliance.countDocuments({ ...orgFilter, status: 'in-progress' }),
      Compliance.countDocuments({ ...orgFilter, status: 'completed' }),
      Compliance.countDocuments({ ...orgFilter, status: 'overdue' })
    ]);

    const complianceScore = total > 0 ? Math.round(((completed) / total) * 100) : 100;

    const upcomingDeadlines = await Compliance.find({
      ...orgFilter,
      dueDate: { $gte: now, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      status: { $nin: ['completed', 'waived'] }
    }).sort('dueDate').limit(5);

    await sendLoginDigestEmail(user, {
      total, pending, inProgress, completed, overdue,
      complianceScore, upcomingDeadlines
    }).catch(err => {
      console.error('Failed to send login digest:', err.message);
    });

    await User.findByIdAndUpdate(userId, { lastLoginDigestSent: now });
  } catch (error) {
    console.error('Error sending login digest:', error.message);
  }
};

const updateOrganizationHealthScores = async () => {
  try {
    const organizations = await Organization.find({ isActive: true });
    for (const org of organizations) {
      const total = await Compliance.countDocuments({ organization: org._id });
      const completed = await Compliance.countDocuments({
        organization: org._id,
        status: { $in: ['completed', 'waived'] }
      });
      const score = total > 0 ? Math.round((completed / total) * 100) : 100;
      await Organization.findByIdAndUpdate(org._id, { complianceHealthScore: score });
    }
  } catch (error) {
    console.error('Error updating health scores:', error.message);
  }
};

const sendQueuedDigests = async (frequency) => {
  const orgs = await Organization.find({
    emailFrequency: frequency === 'daily' ? 'daily_digest' : 'weekly',
    isActive: true
  });

  for (const org of orgs) {
    const admins = await User.find({ organization: org._id, role: 'admin', isActive: true });
    const since = new Date(Date.now() - (frequency === 'weekly' ? 7 : 1) * 24 * 60 * 60 * 1000);
    const unreadAlerts = await Alert.find({
      organization: org._id,
      isRead: false,
      createdAt: { $gte: since }
    }).lean();

    if (unreadAlerts.length === 0) continue;

    for (const admin of admins) {
      const fn = frequency === 'daily' ? sendDailyDigestEmail : sendWeeklyDigestEmail;
      await fn(admin, unreadAlerts).catch(err =>
        console.error(`${frequency} digest error:`, err.message)
      );
    }
  }
};

const startScheduledJobs = () => {
  cron.schedule('0 * * * *', () => {
    updateOverdueStatus();
  });

  cron.schedule('0 */6 * * *', () => {
    generateDeadlineAlerts();
  });

  cron.schedule('0 2 * * *', () => {
    updateOrganizationHealthScores();
  });

  cron.schedule('0 1 * * *', async () => {
    try {
      const count = await expireTrials();
      if (count > 0) console.log(`Expired ${count} trial organizations.`);
    } catch (err) {
      console.error('Trial expiry cron error:', err.message);
    }
  });

  cron.schedule('0 9 * * *', async () => {
    try {
      const sent = await sendTrialReminders();
      if (sent > 0) console.log(`Sent ${sent} trial reminder emails.`);
    } catch (err) {
      console.error('Trial reminder cron error:', err.message);
    }
  });

  cron.schedule('0 8 * * *', async () => {
    try {
      await sendQueuedDigests('daily');
    } catch (err) {
      console.error('Daily digest cron error:', err.message);
    }
  });

  cron.schedule('0 8 * * 1', async () => {
    try {
      await sendQueuedDigests('weekly');
    } catch (err) {
      console.error('Weekly digest cron error:', err.message);
    }
  });

  console.log('Scheduled jobs started.');
};

module.exports = { startScheduledJobs, setSocketIO, updateOverdueStatus, generateDeadlineAlerts, sendLoginDigest, updateOrganizationHealthScores };
