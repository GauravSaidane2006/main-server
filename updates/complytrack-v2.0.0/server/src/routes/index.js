const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/compliance', require('./compliance'));
router.use('/templates', require('./templates'));
router.use('/reports', require('./reports'));
router.use('/alerts', require('./alerts'));
router.use('/dashboard', require('./dashboard'));
router.use('/risks', require('./risks'));
router.use('/contracts', require('./contracts'));
router.use('/organization', require('./organization'));
router.use('/verification', require('./verification'));
router.use('/compliance-setup', require('./complianceSetup'));
router.use('/notices', require('./notices'));
router.use('/questionnaire', require('./questionnaire'));
router.use('/sector-pdfs', require('./sectorPdfs'));
router.use('/developer', require('./developer'));
router.use('/onboarding', require('./onboarding'));
router.use('/compliance-comments', require('./comments'));
router.use('/files', require('./files'));
router.use('/license', require('./license'));
router.use('/trial', require('./trial'));
router.use('/updates', require('./updates'));
router.use('/main-server', require('./mainServer'));

router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

module.exports = router;
