const { supabaseAdmin } = require('../../config/supabase');
const { logActivity, updateProjectScores } = require('../projects/projects.service');

async function createTask(userId, data) {
  const priority = data.priority || estimatePriority(data);
  const effortEstimate = data.effort_estimate || estimateEffort(data);

  const taskData = {
    ...data,
    priority,
    effort_estimate: effortEstimate,
    status: data.status || 'todo',
    created_by: userId
  };

  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .insert(taskData)
    .select('*, assignee:users!tasks_assignee_id_fkey(id, name, avatar_url)')
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });

  await logActivity(data.project_id, userId, 'task_created', { taskId: task.id, title: task.title });
  await updateProjectScores(data.project_id);

  return task;
}

async function getProjectTasks(projectId, filters = {}) {
  let query = supabaseAdmin
    .from('tasks')
    .select(`
      *,
      assignee:users!tasks_assignee_id_fkey(id, name, avatar_url, email),
      creator:users!tasks_created_by_fkey(id, name)
    `)
    .eq('project_id', projectId);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.assignee_id) query = query.eq('assignee_id', filters.assignee_id);
  if (filters.priority) query = query.eq('priority', filters.priority);

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return data || [];
}

async function getTask(taskId) {
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select(`
      *,
      assignee:users!tasks_assignee_id_fkey(id, name, avatar_url, email),
      creator:users!tasks_created_by_fkey(id, name),
      task_dependencies!task_dependencies_task_id_fkey(
        depends_on_task_id,
        depends_on:tasks!task_dependencies_depends_on_task_id_fkey(id, title, status)
      )
    `)
    .eq('id', taskId)
    .single();

  if (error || !data) throw Object.assign(new Error('Task not found'), { status: 404 });
  return data;
}

async function updateTask(taskId, userId, data) {
  const existing = await getTask(taskId);

  // Block starting a task that has unfinished dependencies
  if (data.status === 'in_progress' && existing.status === 'todo') {
    const { data: deps } = await supabaseAdmin
      .from('task_dependencies')
      .select('depends_on_task_id, depends_on:tasks!task_dependencies_depends_on_task_id_fkey(id, title, status)')
      .eq('task_id', taskId);

    const unfinished = (deps || []).filter(d => d.depends_on?.status !== 'done');
    if (unfinished.length > 0) {
      const names = unfinished.map(d => `"${d.depends_on?.title}"`).join(', ');
      throw Object.assign(
        new Error(`Cannot start — complete ${names} first`),
        { status: 400 }
      );
    }
  }

  const updateData = { ...data, updated_at: new Date().toISOString() };

  // Auto-set completed_at when marking as done
  if (data.status === 'done' && existing.status !== 'done') {
    updateData.completed_at = new Date().toISOString();
  }
  // Clear completed_at if reopening
  if (data.status && data.status !== 'done' && existing.status === 'done') {
    updateData.completed_at = null;
  }

  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .select('*, assignee:users!tasks_assignee_id_fkey(id, name, avatar_url)')
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });

  await logActivity(task.project_id, userId, 'task_updated', {
    taskId,
    changes: Object.keys(data)
  });

  if (data.status || data.priority || data.due_date) {
    await updateProjectScores(task.project_id);
  }

  return task;
}

async function deleteTask(taskId, userId) {
  const task = await getTask(taskId);
  const { error } = await supabaseAdmin.from('tasks').delete().eq('id', taskId);
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  await logActivity(task.project_id, userId, 'task_deleted', { taskId, title: task.title });
  await updateProjectScores(task.project_id);
}

async function addDependency(taskId, dependsOnTaskId, projectId) {
  // Cycle detection: check if dependsOnTaskId already depends on taskId
  const wouldCreateCycle = await checkForCycle(taskId, dependsOnTaskId);
  if (wouldCreateCycle) {
    throw Object.assign(new Error('This dependency would create a circular dependency'), { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('task_dependencies')
    .insert({ task_id: taskId, depends_on_task_id: dependsOnTaskId, project_id: projectId })
    .select()
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return data;
}

async function removeDependency(taskId, dependsOnTaskId) {
  const { error } = await supabaseAdmin
    .from('task_dependencies')
    .delete()
    .eq('task_id', taskId)
    .eq('depends_on_task_id', dependsOnTaskId);

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
}

async function getTaskDependencies(projectId) {
  const { data, error } = await supabaseAdmin
    .from('task_dependencies')
    .select(`
      task_id, depends_on_task_id,
      task:tasks!task_dependencies_task_id_fkey(id, title, status, priority),
      depends_on:tasks!task_dependencies_depends_on_task_id_fkey(id, title, status, priority)
    `)
    .eq('project_id', projectId);

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return data || [];
}

async function logTime(taskId, userId, minutes) {
  const task = await getTask(taskId);

  const { data, error } = await supabaseAdmin
    .from('activity_logs')
    .insert({
      project_id: task.project_id,
      user_id: userId,
      action: 'time_logged',
      metadata: { taskId, minutes }
    })
    .select()
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });

  // Update time_spent on task
  await supabaseAdmin
    .from('tasks')
    .update({
      time_spent: (task.time_spent || 0) + minutes,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId);

  return data;
}

async function checkForCycle(taskId, proposedDependencyId) {
  // BFS/DFS: if proposedDependencyId is reachable from taskId, adding this dep creates a cycle
  const visited = new Set();
  const queue = [taskId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === proposedDependencyId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const { data: deps } = await supabaseAdmin
      .from('task_dependencies')
      .select('depends_on_task_id')
      .eq('task_id', current);

    for (const dep of (deps || [])) {
      queue.push(dep.depends_on_task_id);
    }
  }
  return false;
}

function estimatePriority(data) {
  if (!data.due_date) return 'medium';
  const daysUntilDue = (new Date(data.due_date) - new Date()) / (1000 * 60 * 60 * 24);
  if (daysUntilDue < 2) return 'critical';
  if (daysUntilDue < 7) return 'high';
  if (daysUntilDue < 14) return 'medium';
  return 'low';
}

function estimateEffort(data) {
  const titleLength = (data.title || '').length;
  const descLength = (data.description || '').length;
  const energyType = data.energy_type;

  let baseEstimate = 4; // hours
  if (descLength > 200) baseEstimate += 4;
  if (energyType === 'deep_work') baseEstimate += 4;
  return baseEstimate;
}

module.exports = {
  createTask, getProjectTasks, getTask, updateTask, deleteTask,
  addDependency, removeDependency, getTaskDependencies, logTime
};
