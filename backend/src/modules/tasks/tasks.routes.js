const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/rbac.middleware');
const ctrl = require('./tasks.controller');

router.use(authenticate);

// Project-scoped task routes
router.post('/', requirePermission('tasks', 'create'), ctrl.createTask);
router.get('/', requirePermission('tasks', 'read'), ctrl.getProjectTasks);
router.get('/dependencies', requirePermission('tasks', 'read'), ctrl.getDependencies);

// Task-specific routes
router.get('/:taskId', requirePermission('tasks', 'read'), ctrl.getTask);
router.patch('/:taskId', requirePermission('tasks', 'update'), ctrl.updateTask);
router.delete('/:taskId', requirePermission('tasks', 'delete'), ctrl.deleteTask);
router.post('/:taskId/dependencies', requirePermission('tasks', 'update'), ctrl.addDependency);
router.delete('/:taskId/dependencies/:dependencyId', requirePermission('tasks', 'update'), ctrl.removeDependency);
router.post('/:taskId/time', requirePermission('tasks', 'update'), ctrl.logTime);

module.exports = router;
