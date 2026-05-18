const { supabaseAdmin } = require('../../config/supabase');
const { calculateComplexityScore } = require('../../services/prediction.service');

async function createProject(userId, data) {
  const projectData = {
    ...data,
    created_by: userId,
    status: data.status || 'planning',
    risk_score: 0,
    complexity_score: 0
  };

  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .insert(projectData)
    .select()
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });

  // Auto-add creator as admin member
  await supabaseAdmin.from('project_members').insert({
    project_id: project.id,
    user_id: userId,
    role: 'admin'
  });

  // Log activity
  await logActivity(project.id, userId, 'project_created', { name: project.name });

  return project;
}

async function getProject(projectId, userId) {
  const { data: membership } = await supabaseAdmin
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  if (!membership) throw Object.assign(new Error('Access denied'), { status: 403 });

  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select(`
      *,
      created_by_user:users!projects_created_by_fkey(id, name, avatar_url),
      project_members(user_id, role, users(id, name, email, avatar_url))
    `)
    .eq('id', projectId)
    .single();

  if (error || !project) throw Object.assign(new Error('Project not found'), { status: 404 });

  return { ...project, userRole: membership.role };
}

async function getUserProjects(userId) {
  const { data, error } = await supabaseAdmin
    .from('project_members')
    .select(`
      role,
      projects(
        id, name, description, status, deadline, risk_score, complexity_score,
        created_at, created_by,
        project_members(count)
      )
    `)
    .eq('user_id', userId);

  if (error) throw Object.assign(new Error(error.message), { status: 500 });

  return (data || [])
    .filter(d => d.projects)
    .map(d => ({ ...d.projects, userRole: d.role }));
}

async function updateProject(projectId, userId, data) {
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });

  await logActivity(projectId, userId, 'project_updated', { changes: Object.keys(data) });
  return project;
}

async function deleteProject(projectId, userId) {
  const { error } = await supabaseAdmin.from('projects').delete().eq('id', projectId);
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
}

async function getProjectActivity(projectId, limit = 50) {
  const { data, error } = await supabaseAdmin
    .from('activity_logs')
    .select('*, users(id, name, avatar_url)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return data || [];
}

async function updateProjectScores(projectId) {
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('project_id', projectId);

  const { data: deps } = await supabaseAdmin
    .from('task_dependencies')
    .select('*')
    .eq('project_id', projectId);

  const { data: members } = await supabaseAdmin
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId);

  const complexity = calculateComplexityScore(tasks || [], deps || [], (members || []).length);

  // Risk score: based on overdue + blocked tasks
  const now = new Date();
  const overdue = (tasks || []).filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done').length;
  const total = (tasks || []).length;
  const riskScore = total > 0 ? Math.min(100, Math.round((overdue / total) * 100) + 10) : 0;

  await supabaseAdmin
    .from('projects')
    .update({ complexity_score: complexity, risk_score: riskScore })
    .eq('id', projectId);
}

async function logActivity(projectId, userId, action, metadata = {}) {
  await supabaseAdmin.from('activity_logs').insert({
    project_id: projectId,
    user_id: userId,
    action,
    metadata
  });
}

module.exports = {
  createProject, getProject, getUserProjects, updateProject,
  deleteProject, getProjectActivity, updateProjectScores, logActivity
};
