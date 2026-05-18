const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/rbac.middleware');
const ctrl = require('./projects.controller');

router.use(authenticate);

router.post('/', requirePermission('projects', 'create'), ctrl.createProject);
router.get('/', ctrl.getProjects);
router.get('/:projectId', requirePermission('projects', 'read'), ctrl.getProject);
router.patch('/:projectId', requirePermission('projects', 'update'), ctrl.updateProject);
router.delete('/:projectId', requirePermission('projects', 'delete'), ctrl.deleteProject);
router.get('/:projectId/activity', requirePermission('projects', 'read'), ctrl.getActivity);

module.exports = router;
