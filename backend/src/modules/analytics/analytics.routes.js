const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const analyticsService = require('./analytics.service');
const { success } = require('../../utils/response');

router.use(authenticate);

router.get('/dashboard', async (req, res, next) => {
  try {
    const data = req.user.role === 'admin'
      ? await analyticsService.getAdminDashboard()
      : await analyticsService.getUserDashboard(req.user.id);
    success(res, data);
  } catch (err) { next(err); }
});

router.get('/projects/:projectId', async (req, res, next) => {
  try {
    const data = await analyticsService.getProjectAnalytics(req.params.projectId);
    success(res, data);
  } catch (err) { next(err); }
});

router.get('/productivity', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await analyticsService.getProductivityMetrics(req.user.id, days);
    success(res, data);
  } catch (err) { next(err); }
});

module.exports = router;
