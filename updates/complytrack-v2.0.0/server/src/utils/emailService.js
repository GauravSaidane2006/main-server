const nodemailer = require('nodemailer');
const { escapeHtml } = require('./security');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: parseInt(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  return transporter;
};

exports.sendEmail = async ({ to, subject, html, attachments }) => {
  const transport = getTransporter();
  if (!transport) {
    console.warn('Email not configured. Skipping email send.');
    return null;
  }

  try {
    const info = await transport.sendMail({
      from: `"ComplyTrack India" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments
    });
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Email send failed:', error.message);
    throw error;
  }
};

exports.sendDeadlineAlertEmail = async (user, complianceItem) => {
  const daysUntilDue = Math.ceil((complianceItem.dueDate - new Date()) / (1000 * 60 * 60 * 24));
  const subject = daysUntilDue <= 0
    ? `OVERDUE: ${escapeHtml(complianceItem.title)}`
    : `Reminder: ${escapeHtml(complianceItem.title)} due in ${daysUntilDue} days`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a56db;">ComplyTrack India</h2>
      <h3>${escapeHtml(subject)}</h3>
      <p>Dear ${escapeHtml(user.name)},</p>
      <p>${escapeHtml(complianceItem.description || 'Please take necessary action on the following compliance item:')}</p>
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Item</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(complianceItem.title)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Law</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(complianceItem.law)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Due Date</td><td style="padding: 8px; border: 1px solid #ddd;">${new Date(complianceItem.dueDate).toLocaleDateString()}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Priority</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(complianceItem.priority)}</td></tr>
      </table>
      <p>Please log in to ComplyTrack India to take action.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated notification from ComplyTrack India.</p>
    </div>
  `;

  return exports.sendEmail({ to: user.email, subject, html });
};

exports.sendLoginDigestEmail = async (user, stats) => {
  const subject = `Your Daily Compliance Summary — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a56db;">ComplyTrack India</h2>
      <h3>Daily Compliance Digest</h3>
      <p>Dear ${escapeHtml(user.name)},</p>
      <p>Here is your compliance summary for today:</p>
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Total Items</td><td style="padding: 8px; border: 1px solid #ddd;">${stats.total}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Pending</td><td style="padding: 8px; border: 1px solid #ddd; color: #d97706;">${stats.pending}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">In Progress</td><td style="padding: 8px; border: 1px solid #ddd; color: #2563eb;">${stats.inProgress}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Completed</td><td style="padding: 8px; border: 1px solid #ddd; color: #16a34a;">${stats.completed}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Overdue</td><td style="padding: 8px; border: 1px solid #ddd; color: #dc2626;">${stats.overdue}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Compliance Score</td><td style="padding: 8px; border: 1px solid #ddd;">${stats.complianceScore}%</td></tr>
      </table>
      ${stats.upcomingDeadlines?.length > 0 ? `
        <h4 style="color: #1a56db;">Upcoming Deadlines (Next 7 Days)</h4>
        <ul>
          ${stats.upcomingDeadlines.map(d => `<li><strong>${escapeHtml(d.title)}</strong> — due ${new Date(d.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</li>`).join('')}
        </ul>
      ` : ''}
      <p>Log in to ComplyTrack India to manage your compliance items.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated daily digest from ComplyTrack India.</p>
    </div>
  `;

  return exports.sendEmail({ to: user.email, subject, html });
};

exports.sendRegistrationConfirmationEmail = async (user, organization, { isTrial }) => {
  const subject = isTrial
    ? `Welcome to ComplyTrack India — Your 7-Day Free Trial Has Started`
    : `Welcome to ComplyTrack India — Account Created Successfully`;

  const trialSection = isTrial ? `
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <h4 style="color: #1d4ed8; margin: 0 0 8px;">Your 7-Day Free Trial</h4>
      <p style="margin: 4px 0;"><strong>Starts:</strong> ${new Date(organization.subscription.startDate).toLocaleDateString('en-IN')}</p>
      <p style="margin: 4px 0;"><strong>Expires:</strong> ${new Date(organization.subscription.endDate).toLocaleDateString('en-IN')}</p>
      <p style="margin: 4px 0;"><strong>Features during trial:</strong></p>
      <ul style="margin: 4px 0; padding-left: 20px;">
        <li>Basic compliance tracking (up to 5 items)</li>
        <li>Up to 3 users</li>
        <li>In-app alerts</li>
        <li>Email notifications</li>
      </ul>
      <p style="margin: 8px 0 0; color: #6b7280; font-size: 13px;">Please subscribe before your trial expires to keep your data.</p>
    </div>
  ` : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a56db;">ComplyTrack India</h2>
      <h3>Welcome aboard, ${escapeHtml(user.name)}!</h3>
      <p>Your account has been created successfully.</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Company</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(organization.name)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(user.email)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Sector</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(organization.sector)}</td></tr>
        ${organization.companyId ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Company ID</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(organization.companyId)}</td></tr>` : ''}
      </table>
      ${trialSection}
      <p>Log in to get started: <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="color: #1a56db;">ComplyTrack Login</a></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated notification from ComplyTrack India.</p>
    </div>
  `;

  return exports.sendEmail({ to: user.email, subject, html });
};

exports.sendTrialReminderEmail = async (user, organization, daysRemaining) => {
  const subject = `ComplyTrack Trial: ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining — Subscribe now`;

  const urgencyColor = daysRemaining <= 2 ? '#dc2626' : daysRemaining <= 4 ? '#d97706' : '#1a56db';
  const bgUrgency = daysRemaining <= 2 ? '#fef2f2' : daysRemaining <= 4 ? '#fffbeb' : '#eff6ff';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a56db;">ComplyTrack India</h2>
      <div style="background: ${bgUrgency}; border: 1px solid ${urgencyColor}30; border-radius: 8px; padding: 20px; margin: 16px 0; text-align: center;">
        <h3 style="color: ${urgencyColor}; margin: 0 0 8px;">${daysRemaining} Day${daysRemaining !== 1 ? 's' : ''} Left in Your Trial</h3>
        <p style="margin: 0; color: #374151;">Your free trial expires on <strong>${new Date(organization.subscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p>
      </div>
      <p>Dear ${escapeHtml(user.name)},</p>
      <p>Your ComplyTrack free trial is winding down. Here is what you need to know:</p>
      <ul style="color: #374151; line-height: 1.8;">
        <li><strong>Days remaining:</strong> ${daysRemaining}</li>
        <li><strong>Data at risk:</strong> All compliance data, alerts, and reports will be locked after expiry</li>
        <li><strong>What to do:</strong> Subscribe now to keep full access to your data</li>
      </ul>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/settings" style="display: inline-block; padding: 12px 32px; background: #1a56db; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Subscribe Now</a>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated reminder from ComplyTrack India.</p>
    </div>
  `;

  return exports.sendEmail({ to: user.email, subject, html });
};

exports.sendTrialExpiredEmail = async (user, organization) => {
  const subject = `ComplyTrack Trial Expired — Your data is locked`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a56db;">ComplyTrack India</h2>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 16px 0; text-align: center;">
        <h3 style="color: #dc2626; margin: 0 0 8px;">Your Trial Has Expired</h3>
        <p style="margin: 0; color: #374151;">Your 7-day free trial ended on <strong>${new Date(organization.subscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p>
      </div>
      <p>Dear ${escapeHtml(user.name)},</p>
      <p>Your ComplyTrack free trial has expired. Your account is now locked and you cannot access your compliance data.</p>
      <p><strong>What happens next:</strong></p>
      <ul style="color: #374151; line-height: 1.8;">
        <li>Your data is preserved but inaccessible</li>
        <li>Subscribe within 30 days to restore full access</li>
        <li>After 30 days, data may be permanently deleted</li>
      </ul>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/settings" style="display: inline-block; padding: 12px 32px; background: #1a56db; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Subscribe Now to Restore Access</a>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated notification from ComplyTrack India.</p>
    </div>
  `;

  return exports.sendEmail({ to: user.email, subject, html });
};

exports.sendDailyDigestEmail = async (user, alerts) => {
  const subject = `ComplyTrack Daily Digest — ${alerts.length} alert${alerts.length !== 1 ? 's' : ''}`;

  const alertRows = alerts.map(a => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(a.title)}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(a.priority)}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${new Date(a.createdAt).toLocaleDateString('en-IN')}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a56db;">ComplyTrack India</h2>
      <h3>Daily Alert Digest</h3>
      <p>Dear ${escapeHtml(user.name)},</p>
      <p>Here are your alerts for today:</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr style="background: #f3f4f6;">
          <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Alert</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Priority</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Date</th>
        </tr>
        ${alertRows}
      </table>
      <p>Log in to take action on these alerts.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated daily digest from ComplyTrack India.</p>
    </div>
  `;

  return exports.sendEmail({ to: user.email, subject, html });
};

exports.sendWeeklyDigestEmail = async (user, alerts) => {
  const subject = `ComplyTrack Weekly Digest — ${alerts.length} alert${alerts.length !== 1 ? 's' : ''} this week`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a56db;">ComplyTrack India</h2>
      <h3>Weekly Alert Digest</h3>
      <p>Dear ${escapeHtml(user.name)},</p>
      <p>Here is your weekly compliance summary:</p>
      <p><strong>Total alerts this week:</strong> ${alerts.length}</p>
      <ul>
        <li><strong>High priority:</strong> ${alerts.filter(a => a.priority === 'high').length}</li>
        <li><strong>Medium priority:</strong> ${alerts.filter(a => a.priority === 'medium').length}</li>
        <li><strong>Low priority:</strong> ${alerts.filter(a => a.priority === 'low').length}</li>
      </ul>
      <p>Log in to review and take action.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated weekly digest from ComplyTrack India.</p>
    </div>
  `;

  return exports.sendEmail({ to: user.email, subject, html });
};
