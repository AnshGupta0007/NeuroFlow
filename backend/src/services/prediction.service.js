const { supabaseAdmin } = require('../config/supabase');
const { calculateCriticalPath, detectBlockedTasks } = require('./graph.service');

async function predictProjectCompletion(projectId) {
  const [
    { data: project },
    { data: tasks },
    { data: dependencies },
    { data: members }
  ] = await Promise.all([
    supabaseAdmin.from('projects').select('*').eq('id', projectId).single(),
    supabaseAdmin.from('tasks').select('*').eq('project_id', projectId),
    supabaseAdmin.from('task_dependencies').select('*').eq('project_id', projectId),
    supabaseAdmin.from('project_members').select('user_id').eq('project_id', projectId)
  ]);

  if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });

  const allTasks = tasks || [];
  const allDeps = dependencies || [];

  const completedTasks = allTasks.filter(t => t.status === 'done');
  const pendingTasks = allTasks.filter(t => t.status !== 'done');
  const totalTasks = allTasks.length;

  // Per-user velocity (tasks completed / days active)
  const velocityByUser = await calculateUserVelocities(projectId, members || []);
  const avgVelocity = Object.values(velocityByUser).reduce((a, b) => a + b, 0)
    / Math.max(Object.keys(velocityByUser).length, 1);

  // Effort-weighted pending workload
  const pendingEffort = pendingTasks.reduce((sum, t) => sum + (t.effort_estimate || 4), 0);
  const teamVelocity = avgVelocity * Math.max((members || []).length, 1);
  const estimatedDaysRemaining = teamVelocity > 0
    ? pendingEffort / teamVelocity
    : pendingTasks.length * 3;

  const deadline = project.deadline ? new Date(project.deadline) : null;
  const today = new Date();
  const daysUntilDeadline = deadline
    ? Math.max(0, (deadline - today) / (1000 * 60 * 60 * 24))
    : null;

  let delayRisk = 0;
  let predictedEndDate = new Date(today);
  predictedEndDate.setDate(predictedEndDate.getDate() + Math.ceil(estimatedDaysRemaining));

  if (daysUntilDeadline !== null) {
    if (estimatedDaysRemaining > daysUntilDeadline) {
      const overrun = estimatedDaysRemaining - daysUntilDeadline;
      delayRisk = Math.min(100, Math.round((overrun / Math.max(daysUntilDeadline, 1)) * 100));
    }
  }

  // Bottleneck detection
  const bottlenecks = await detectBottlenecks(projectId, pendingTasks, allDeps);

  // Critical path
  const criticalPathData = calculateCriticalPath(allTasks, allDeps);
  const blockedTaskList = detectBlockedTasks(allTasks, allDeps);

  // Complexity score
  const complexityScore = calculateComplexityScore(allTasks, allDeps, (members || []).length);

  // Risk factors
  const riskFactors = [];
  if (delayRisk > 70) riskFactors.push({ type: 'deadline', severity: 'high', message: 'Project likely to miss deadline' });
  else if (delayRisk > 40) riskFactors.push({ type: 'deadline', severity: 'medium', message: 'Project at risk of delay' });

  if (blockedTaskList.length > 0)
    riskFactors.push({ type: 'blocked', severity: 'high', message: `${blockedTaskList.length} tasks are blocked by dependencies` });

  const overdueTasks = allTasks.filter(t => t.due_date && new Date(t.due_date) < today && t.status !== 'done');
  if (overdueTasks.length > 0)
    riskFactors.push({ type: 'overdue', severity: 'high', message: `${overdueTasks.length} tasks are overdue` });

  return {
    projectId,
    projectName: project.name,
    totalTasks,
    completedTasks: completedTasks.length,
    pendingTasks: pendingTasks.length,
    completionPercentage: totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0,
    delayRisk,
    predictedEndDate: predictedEndDate.toISOString(),
    estimatedDaysRemaining: Math.ceil(estimatedDaysRemaining),
    daysUntilDeadline: daysUntilDeadline !== null ? Math.round(daysUntilDeadline) : null,
    bottlenecks,
    criticalPath: criticalPathData.criticalPath,
    criticalPathDuration: criticalPathData.totalDuration,
    blockedTasks: blockedTaskList.length,
    complexityScore,
    riskFactors,
    velocityByUser
  };
}

async function calculateUserVelocities(projectId, members) {
  const velocities = {};
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const member of members) {
    const { data: completedTasks } = await supabaseAdmin
      .from('tasks')
      .select('id, completed_at, created_at')
      .eq('project_id', projectId)
      .eq('assignee_id', member.user_id)
      .eq('status', 'done')
      .gte('completed_at', thirtyDaysAgo.toISOString());

    const count = (completedTasks || []).length;
    // tasks per day over last 30 days
    velocities[member.user_id] = count / 30;
  }

  return velocities;
}

async function detectBottlenecks(projectId, pendingTasks, dependencies) {
  const bottlenecks = [];
  const userBlockCount = {};

  for (const task of pendingTasks) {
    if (!task.assignee_id) continue;
    const isBlocked = dependencies.some(
      d => d.task_id === task.id &&
        pendingTasks.find(t => t.id === d.depends_on_task_id && t.status !== 'done')
    );
    if (!isBlocked && task.status !== 'done') {
      userBlockCount[task.assignee_id] = (userBlockCount[task.assignee_id] || 0) + 1;
    }
  }

  // Also check who is blocking others
  const blockingCount = {};
  for (const dep of dependencies) {
    const blockingTask = pendingTasks.find(t => t.id === dep.depends_on_task_id);
    if (blockingTask?.assignee_id && blockingTask.status !== 'done') {
      blockingCount[blockingTask.assignee_id] = (blockingCount[blockingTask.assignee_id] || 0) + 1;
    }
  }

  for (const [userId, count] of Object.entries(blockingCount)) {
    if (count >= 2) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('name, email')
        .eq('id', userId)
        .single();
      bottlenecks.push({ userId, userName: user?.name, blockingTaskCount: count });
    }
  }

  return bottlenecks;
}

function calculateComplexityScore(tasks, dependencies, teamSize) {
  const taskCount = tasks.length;
  const depCount = dependencies.length;
  const criticalTasks = tasks.filter(t => t.priority === 'critical').length;

  const taskFactor = Math.min(taskCount / 50, 1) * 35;
  const depFactor = Math.min(depCount / 30, 1) * 35;
  const teamFactor = Math.min(teamSize / 10, 1) * 15;
  const criticalFactor = Math.min(criticalTasks / taskCount || 0, 1) * 15;

  return Math.round(taskFactor + depFactor + teamFactor + criticalFactor);
}

async function getDashboardRisks(userId) {
  const { data: memberships } = await supabaseAdmin
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  if (!memberships || memberships.length === 0) return [];

  const predictions = await Promise.all(
    memberships.map(m => predictProjectCompletion(m.project_id).catch(() => null))
  );

  return predictions.filter(Boolean).sort((a, b) => b.delayRisk - a.delayRisk);
}

module.exports = { predictProjectCompletion, getDashboardRisks, calculateComplexityScore };
