const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getTrialStatus, checkTrialLimits } = require('../services/trialService');

router.get('/status', authenticate, async (req, res, next) => {
  try {
    const status = await getTrialStatus(req.organizationId);
    const limits = status.isTrial ? await checkTrialLimits(req.organizationId) : null;
    res.json({ ...status, limits: limits?.limits || null });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
