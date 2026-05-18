const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { requireAdmin } = require('../../middleware/rbac.middleware');
const ctrl = require('./admin.controller');

router.use(authenticate);
router.use(requireAdmin());

router.get('/users', ctrl.listUsers);
router.patch('/users/:userId/role', ctrl.updateUserRole);
router.delete('/users/:userId', ctrl.deleteUser);
router.get('/team-stats', ctrl.getTeamStats);
router.get('/reports/overview', ctrl.getOverviewReport);
router.get('/reports/project/:projectId', ctrl.getProjectReport);

module.exports = router;
