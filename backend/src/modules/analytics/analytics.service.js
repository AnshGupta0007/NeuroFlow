const { supabaseAdmin } = require('../../config/supabase');
const { analyzeUserBehavior, getTeamDNA } = require('../../services/behavior.service');
const { getDashboardRisks } = require('../../services/prediction.service');

async function getUserDashboard(userId) {
  const [
    { data: myTasks },
    { data: memberships },
    behavior,
    projectRisks
  ] = await Promise.all([
    supabaseAdmin.from('tasks')
      .select('id, status, priority, due_date, project_id')
      .eq('assignee_id', userId)
      .neq('status', 'done'),
    supabaseAdmin.from('project_members')
      .select('project_id, role, projects(id, name, status, deadline, risk_score)')
      .eq('user_id', userId),
    analyzeUserBehavior(userId),
    getDashboardRisks(userId)
  ]);

  const now = new Date();
  const tasks = myTasks || [];
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < now);
  const todayTasks = tasks.filter(t => {
    if (!t.due_date) return false;
    const due = new Date(t.due_date);
    return due.toDateString() === now.toDateString();
  });
  const criticalTasks = tasks.filter(t => t.priority === 'critical');

  const projects = (memberships || []).map(m => m.projects).filter(Boolean);
  const atRiskProjects = projects.filter(p => p.risk_score > 40);

  return {
    overview: {
      totalProjects: projects.length,
      totalPendingTasks: tasks.length,
      overdueCount: overdueTasks.length,
      todayCount: todayTasks.length,
      criticalCount: criticalTasks.length
    },
    productivityScore: behavior.productivityScore,
    weeklyActivity: behavior.weeklyActivity,
    insights: behavior.insights,
    peakHours: behavior.peakHourRanges,
    projects,
    atRiskProjects,
    projectRisks: projectRisks.slice(0, 3),
    overdueTasks,
    dnaProfile: behavior.dnaProfile
  };
}

async function getProjectAnalytics(projectId) {
  const [
    { data: tasks },
    { data: members },
    teamDna
  ] = await Promise.all([
    supabaseAdmin.from('tasks').select('*').eq('project_id', projectId),
    supabaseAdmin.from('project_members')
      .select('user_id, role, users(id, name, avatar_url)')
      .eq('project_id', projectId),
    getTeamDNA(projectId)
  ]);

  const allTasks = tasks || [];
  const now = new Date();

  // Status breakdown
  const statusBreakdown = {
    todo: 0, in_progress: 0, review: 0, done: 0, blocked: 0
  };
  for (const task of allTasks) {
    statusBreakdown[task.status] = (statusBreakdown[task.status] || 0) + 1;
  }

  // Priority breakdown
  const priorityBreakdown = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const task of allTasks) {
    priorityBreakdown[task.priority] = (priorityBreakdown[task.priority] || 0) + 1;
  }

  // Completion trend (last 14 days)
  const completionTrend = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const completed = allTasks.filter(t =>
      t.completed_at && t.completed_at.startsWith(dateStr)
    ).length;
    completionTrend.push({ date: dateStr, completed });
  }

  // Per-user stats
  const memberStats = await Promise.all(
    (members || []).map(async m => {
      const behavior = await analyzeUserBehavior(m.user_id, projectId).catch(() => null);
      const userTasks = allTasks.filter(t => t.assignee_id === m.user_id);
      return {
        user: m.users,
        role: m.role,
        totalTasks: userTasks.length,
        completedTasks: userTasks.filter(t => t.status === 'done').length,
        overdueTasks: userTasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done').length,
        productivityScore: behavior?.productivityScore || 0
      };
    })
  );

  // Energy type distribution
  const energyBreakdown = {
    deep_work: allTasks.filter(t => t.energy_type === 'deep_work').length,
    shallow_work: allTasks.filter(t => t.energy_type === 'shallow_work').length,
    unspecified: allTasks.filter(t => !t.energy_type).length
  };

  return {
    projectId,
    totalTasks: allTasks.length,
    statusBreakdown,
    priorityBreakdown,
    completionTrend,
    memberStats,
    teamDna,
    energyBreakdown,
    avgEffortEstimate: allTasks.length > 0
      ? Math.round(allTasks.reduce((s, t) => s + (t.effort_estimate || 0), 0) / allTasks.length)
      : 0
  };
}

async function getProductivityMetrics(userId, days = 30) {
  const behavior = await analyzeUserBehavior(userId);

  // Get completed tasks per day
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, priority, effort_estimate, completed_at, due_date, project_id')
    .eq('assignee_id', userId)
    .eq('status', 'done')
    .gte('completed_at', startDate.toISOString());

  const completedByDay = {};
  for (const task of (tasks || [])) {
    const day = task.completed_at.split('T')[0];
    completedByDay[day] = (completedByDay[day] || 0) + 1;
  }

  // Fill missing days
  const trend = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    trend.push({ date: key, tasksCompleted: completedByDay[key] || 0 });
  }

  return {
    userId,
    period: `${days} days`,
    productivityScore: behavior.productivityScore,
    completedTasks: (tasks || []).length,
    trend,
    insights: behavior.insights,
    dnaProfile: behavior.dnaProfile,
    delayRate: behavior.delayRate,
    peakHours: behavior.peakHourRanges,
    avgSpeedRatio: behavior.avgSpeedRatio,
    consistencyScore: behavior.consistencyScore
  };
}

async function getAdminDashboard() {
  const now = new Date();

  const [
    { data: allProjects },
    { data: allTasks },
    { data: allUsers }
  ] = await Promise.all([
    supabaseAdmin.from('projects').select('id, name, status, risk_score, deadline'),
    supabaseAdmin.from('tasks').select('id, title, status, priority, due_date, completed_at, assignee_id, project_id'),
    supabaseAdmin.from('users').select('id, name, role')
  ]);

  const projects = allProjects || [];
  const tasks = allTasks || [];
  const users = allUsers || [];

  const pendingTasks   = tasks.filter(t => t.status !== 'done');
  const overdueTasks   = tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done');
  const todayTasks     = tasks.filter(t => {
    if (!t.due_date) return false;
    return new Date(t.due_date).toDateString() === now.toDateString() && t.status !== 'done';
  });
  const criticalTasks  = tasks.filter(t => t.priority === 'critical' && t.status !== 'done');
  const blockedTasks   = tasks.filter(t => t.status === 'blocked');

  // Weekly activity: completions per day for last 30 days
  const weeklyActivity = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    weeklyActivity.push({
      date: key,
      count: tasks.filter(t => t.completed_at && t.completed_at.startsWith(key)).length
    });
  }

  // At-risk projects
  const atRiskProjects = projects
    .filter(p => (p.risk_score || 0) > 40)
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
    .slice(0, 5)
    .map(p => ({
      projectId: p.id, projectName: p.name,
      delayRisk: p.risk_score || 0,
      pendingTasks: tasks.filter(t => t.project_id === p.id && t.status !== 'done').length
    }));

  // Team health insights
  const insights = [];
  if (blockedTasks.length > 0) {
    insights.push({ type: 'blocked', severity: 'warning', message: `${blockedTasks.length} task${blockedTasks.length > 1 ? 's are' : ' is'} currently blocked across the team.` });
  }
  if (overdueTasks.length > 0) {
    insights.push({ type: 'overdue', severity: 'warning', message: `${overdueTasks.length} task${overdueTasks.length > 1 ? 's are' : ' is'} overdue — review and reassign if needed.` });
  }
  const doneThisWeek = tasks.filter(t => {
    if (!t.completed_at) return false;
    const d = new Date(); d.setDate(d.getDate() - 7);
    return new Date(t.completed_at) > d;
  }).length;
  if (doneThisWeek > 0) {
    insights.push({ type: 'throughput', severity: 'success', message: `${doneThisWeek} tasks completed in the last 7 days — solid team throughput.` });
  }
  const activeProjects = projects.filter(p => p.status === 'active').length;
  if (activeProjects > 0) {
    insights.push({ type: 'projects', severity: 'info', message: `${activeProjects} active project${activeProjects > 1 ? 's' : ''} currently running with ${users.length} team members.` });
  }

  return {
    isAdmin: true,
    overview: {
      totalProjects: projects.length,
      activeProjects,
      totalPendingTasks: pendingTasks.length,
      overdueCount: overdueTasks.length,
      todayCount: todayTasks.length,
      criticalCount: criticalTasks.length,
      blockedCount: blockedTasks.length,
      totalMembers: users.length,
    },
    weeklyActivity,
    insights,
    projectRisks: atRiskProjects,
    overdueTasks: overdueTasks.slice(0, 5).map(t => ({ id: t.id, title: t.title || 'Untitled', priority: t.priority, due_date: t.due_date })),
  };
}

module.exports = { getUserDashboard, getAdminDashboard, getProjectAnalytics, getProductivityMetrics };
