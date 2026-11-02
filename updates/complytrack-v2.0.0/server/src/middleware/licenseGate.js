const { getActiveLicense } = require('../services/licenseService');
const Organization = require('../models/Organization');

const EXEMPT_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh-token',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/license/status',
  '/api/license/activate',
  '/api/license/validate',
  '/api/health',
  '/api/trial/status',
];

function isExemptRoute(path) {
  return EXEMPT_ROUTES.some(route => path.startsWith(route));
}

function isReadOnlyRoute(method) {
  return method === 'GET';
}

async function licenseGate(req, res, next) {
  if (isExemptRoute(req.path)) {
    return next();
  }

  if (!req.organizationId) {
    return next();
  }

  if (req.user && (req.user.role === 'developer' || req.user.role === 'superadmin')) {
    return next();
  }

  try {
    const org = await Organization.findById(req.organizationId).select('subscription');
    const isTrial = org?.subscription?.plan === 'trial';

    if (isTrial) {
      const now = new Date();
      const isExpired = org.subscription.endDate <= now;

      if (isExpired) {
        if (isReadOnlyRoute(req.method)) {
          req.trialLocked = true;
          req.trialReadOnly = true;
          req.trialExpired = true;
          return next();
        }
        return res.status(403).json({
          message: 'Your 7-day trial has expired. Please subscribe to continue using ComplyTrack.',
          code: 'TRIAL_EXPIRED',
          isTrial: true,
          isExpired: true
        });
      }

      req.isTrial = true;
      req.trialEndDate = org.subscription.endDate;
      return next();
    }

    const license = await getActiveLicense(req.organizationId);

    if (!license) {
      if (isReadOnlyRoute(req.method)) {
        req.licenseLocked = true;
        req.licenseReadOnly = true;
        return next();
      }
      return res.status(403).json({
        message: 'No active license. Please activate a license key to use this feature.',
        code: 'LICENSE_REQUIRED',
        hasLicense: false
      });
    }

    req.license = license;
    req.licenseLocked = false;
    req.licenseReadOnly = false;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { licenseGate };
