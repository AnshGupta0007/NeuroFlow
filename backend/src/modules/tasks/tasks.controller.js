const taskService = require('./tasks.service');
const { success, created } = require('../../utils/response');
const { taskSchema, timeLogSchema } = require('../../utils/validators');
const { z } = require('zod');

async function createTask(req, res, next) {
  try {
    const data = taskSchema.parse(req.body);
    const task = await taskService.createTask(req.user.id, data);
    created(res, task, 'Task created');
  } catch (err) { next(err); }
}

async function getProjectTasks(req, res, next) {
  try {
    const tasks = await taskService.getProjectTasks(req.params.projectId, req.query);
    success(res, tasks);
  } catch (err) { next(err); }
}

async function getTask(req, res, next) {
  try {
    const task = await taskService.getTask(req.params.taskId);
    success(res, task);
  } catch (err) { next(err); }
}

async function updateTask(req, res, next) {
  try {
    const data = taskSchema.partial().parse(req.body);

    if (req.effectiveRole !== 'admin' && data.status) {
      const existing = await taskService.getTask(req.params.taskId);

      if (existing.assignee_id !== req.user.id) {
        return res.status(403).json({ error: 'Only the assignee can update task status' });
      }
      if (data.status === 'blocked') {
        return res.status(403).json({ error: 'Only admins can mark a task as blocked' });
      }
      if (data.status === 'done') {
        return res.status(403).json({ error: 'Only admins can mark a task as done' });
      }
      if (existing.status === 'blocked') {
        return res.status(403).json({ error: 'Only admins can unblock a task' });
      }
      if (existing.status === 'review' && data.status !== 'review') {
        return res.status(403).json({ error: 'Only admins can approve or reject a task in review' });
      }
    }

    const task = await taskService.updateTask(req.params.taskId, req.user.id, data);
    success(res, task, 'Task updated');
  } catch (err) { next(err); }
}

async function deleteTask(req, res, next) {
  try {
    await taskService.deleteTask(req.params.taskId, req.user.id);
    success(res, null, 'Task deleted');
  } catch (err) { next(err); }
}

async function addDependency(req, res, next) {
  try {
    const { depends_on_task_id, project_id } = z.object({
      depends_on_task_id: z.string().uuid(),
      project_id: z.string().uuid()
    }).parse(req.body);

    const dep = await taskService.addDependency(req.params.taskId, depends_on_task_id, project_id);
    created(res, dep, 'Dependency added');
  } catch (err) { next(err); }
}

async function removeDependency(req, res, next) {
  try {
    await taskService.removeDependency(req.params.taskId, req.params.dependencyId);
    success(res, null, 'Dependency removed');
  } catch (err) { next(err); }
}

async function getDependencies(req, res, next) {
  try {
    const deps = await taskService.getTaskDependencies(req.params.projectId);
    success(res, deps);
  } catch (err) { next(err); }
}

async function logTime(req, res, next) {
  try {
    const { minutes } = timeLogSchema.parse(req.body);
    const log = await taskService.logTime(req.params.taskId, req.user.id, minutes);
    created(res, log, 'Time logged');
  } catch (err) { next(err); }
}

module.exports = {
  createTask, getProjectTasks, getTask, updateTask, deleteTask,
  addDependency, removeDependency, getDependencies, logTime
};
