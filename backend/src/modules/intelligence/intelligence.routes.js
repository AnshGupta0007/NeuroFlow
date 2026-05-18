const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/rbac.middleware');
const ctrl = require('./intelligence.controller');

router.use(authenticate);
router.use(requirePermission('intelligence', 'read'));

router.get('/', ctrl.getProjectIntelligence);
router.post('/ask', ctrl.askQuestion);

module.exports = router;
