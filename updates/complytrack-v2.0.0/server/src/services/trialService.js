const Organization = require('../models/Organization');
const User = require('../models/User');
const Compliance = require('../models/Compliance');
const { sendTrialRegistrationEmail, sendTrialReminderEmail, sendTrialExpiredEmail } = require('../utils/emailService');

const TRIAL_DAYS = 7;
const TRIAL_MAX_COMPLIANCE_ITEMS = 5;
const TRIAL_MAX_USERS = 3;

async function activateTrial(orgId) {
  const now = new Date();
  const endDate = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  return Organization.findByIdAndUpdate(orgId, {
    $set: {
      'subscription.plan': 'trial',
      'subscription.startDate': now,
      'subscription.endDate': endDate,
      'subscription.trialStartedAt': now,
      'subscription.trialExpiredHandled': false
    }
  }, { new: true });
}

async function getTrialStatus(orgId) {
  const org = await Organization.findById(orgId).select('subscription');
  if (!org || org.subscription.plan !== 'trial') {
    return { isTrial: false, isActive: false };
  }

  const now = new Date();
  const isActive = org.subscription.endDate > now;
  const daysRemaining = isActive
    ? Math.ceil((org.subscription.endDate - now) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    isTrial: true,
    isActive,
    daysRemaining,
    startDate: org.subscription.startDate,
    endDate: org.subscription.endDate,
    isExpired: !isActive
  };
}

async function checkTrialLimits(orgId) {
  const org = await Organization.findById(orgId).select('subscription');
  if (!org || org.subscription.plan !== 'trial') return { restricted: false };

  const trialStatus = await getTrialStatus(orgId);
  if (trialStatus.isExpired) {
    return { restricted: true, reason: 'TRIAL_EXPIRED', message: 'Your trial has expired. Please subscribe to continue.' };
  }

  const complianceCount = await Compliance.countDocuments({ organization: orgId });
  const userCount = await User.countDocuments({ organization: orgId, isActive: true });

  const limits = {
    complianceItems: TRIAL_MAX_COMPLIANCE_ITEMS,
    users: TRIAL_MAX_USERS,
    currentComplianceItems: complianceCount,
    currentUsers: userCount,
    canAddCompliance: complianceCount < TRIAL_MAX_COMPLIANCE_ITEMS,
    canAddUser: userCount < TRIAL_MAX_USERS,
    hasAdvancedReporting: false,
    hasAdvancedAnalytics: false
  };

  return { restricted: false, limits };
}

async function expireTrials() {
  const now = new Date();
  const expiredOrgs = await Organization.find({
    'subscription.plan': 'trial',
    'subscription.endDate': { $lte: now },
    'subscription.trialExpiredHandled': false
  });

  for (const org of expiredOrgs) {
    org.subscription.trialExpiredHandled = true;
    await org.save();

    const adminUser = await User.findOne({ organization: org._id, role: 'admin' });
    if (adminUser) {
      sendTrialExpiredEmail(adminUser, org).catch(err =>
        console.error('Trial expiry email error:', err.message)
      );
    }
  }

  return expiredOrgs.length;
}

async function sendTrialReminders() {
  const now = new Date();
  const reminderWindow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const expiringOrgs = await Organization.find({
    'subscription.plan': 'trial',
    'subscription.endDate': { $gt: now, $lte: reminderWindow }
  });

  let sent = 0;
  for (const org of expiringOrgs) {
    const daysRemaining = Math.ceil((org.subscription.endDate - now) / (1000 * 60 * 60 * 24));
    const adminUser = await User.findOne({ organization: org._id, role: 'admin' });
    if (adminUser) {
      await sendTrialReminderEmail(adminUser, org, daysRemaining).catch(err =>
        console.error('Trial reminder email error:', err.message)
      );
      sent++;
    }
  }

  return sent;
}

module.exports = {
  TRIAL_DAYS,
  TRIAL_MAX_COMPLIANCE_ITEMS,
  TRIAL_MAX_USERS,
  activateTrial,
  getTrialStatus,
  checkTrialLimits,
  expireTrials,
  sendTrialReminders
};
