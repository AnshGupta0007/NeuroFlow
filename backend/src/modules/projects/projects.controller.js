const projectService = require('./projects.service');
const { success, created } = require('../../utils/response');
const { projectSchema } = require('../../utils/validators');

async function createProject(req, res, next) {
  try {
    const data = projectSchema.parse(req.body);
    const project = await projectService.createProject(req.user.id, data);
    created(res, project, 'Project created');
  } catch (err) { next(err); }
}

async function getProjects(req, res, next) {
  try {
    const projects = await projectService.getUserProjects(req.user.id);
    success(res, projects);
  } catch (err) { next(err); }
}

async function getProject(req, res, next) {
  try {
    const project = await projectService.getProject(req.params.projectId, req.user.id);
    success(res, project);
  } catch (err) { next(err); }
}

async function updateProject(req, res, next) {
  try {
    const data = projectSchema.partial().parse(req.body);
    const project = await projectService.updateProject(req.params.projectId, req.user.id, data);
    success(res, project, 'Project updated');
  } catch (err) { next(err); }
}

async function deleteProject(req, res, next) {
  try {
    await projectService.deleteProject(req.params.projectId, req.user.id);
    success(res, null, 'Project deleted');
  } catch (err) { next(err); }
}

async function getActivity(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const activity = await projectService.getProjectActivity(req.params.projectId, limit);
    success(res, activity);
  } catch (err) { next(err); }
}

module.exports = { createProject, getProjects, getProject, updateProject, deleteProject, getActivity };
