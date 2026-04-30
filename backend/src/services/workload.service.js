const { supabaseAdmin } = require('../config/supabase');

const PRIORITY_WEIGHTS = { critical: 4, high: 3, medium: 2, low: 1 };

async function analyzeWorkload(projectId) {
  const [
    { data: members },
    { data: tasks }
  ] = await Promise.all([
    supabaseAdmin.from('project_members')
      .select('user_id, role, users(id, name, email, avatar_url)')
      .eq('project_id', projectId),
    supabaseAdmin.from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .neq('status', 'done')
  ]);

  const activeTasks = tasks || [];
  const activeMembers = members || [];

  // Calculate workload score per user
  const workloadMap = {};
  for (const member of activeMembers) {
    workloadMap[member.user_id] = {
      user: member.users,
      role: member.role,
      taskCount: 0,
      workloadScore: 0,
      tasks: [],
      criticalCount: 0,
      overdueCount: 0
    };
  }

  const now = new Date();
  for (const task of activeTasks) {
    if (!task.assignee_id || !workloadMap[task.assignee_id]) continue;
    const effort = task.effort_estimate || 4;
    const priorityWeight = PRIORITY_WEIGHTS[task.priority] || 2;
    const score = effort * priorityWeight;

    workloadMap[task.assignee_id].taskCount++;
    workloadMap[task.assignee_id].workloadScore += score;
    workloadMap[task.assignee_id].tasks.push(task.id);

    if (task.priority === 'critical') workloadMap[task.assignee_id].criticalCount++;
    if (task.due_date && new Date(task.due_date) < now) workloadMap[task.assignee_id].overdueCount++;
  }

  const scores = Object.values(workloadMap).map(w => w.workloadScore);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const maxScore = Math.max(...scores, 1);

  // Classify workload status
  for (const [userId, data] of Object.entries(workloadMap)) {
    const normalizedScore = avgScore > 0 ? data.workloadScore / avgScore : 0;
    if (normalizedScore > 1.5) data.status = 'overloaded';
    else if (normalizedScore > 1.2) data.status = 'heavy';
    else if (normalizedScore < 0.5) data.status = 'light';
    else data.status = 'balanced';

    data.workloadPercent = Math.round((data.workloadScore / maxScore) * 100);
  }

  // Generate rebalancing suggestions
  const suggestions = generateRebalancingSuggestions(workloadMap, activeTasks, avgScore);

  return {
    projectId,
    members: Object.values(workloadMap),
    averageWorkload: Math.round(avgScore),
    unassignedTasks: activeTasks.filter(t => !t.assignee_id).length,
    suggestions,
    balanceScore: calculateBalanceScore(scores)
  };
}

function generateRebalancingSuggestions(workloadMap, tasks, avgScore) {
  const suggestions = [];
  const overloaded = Object.entries(workloadMap).filter(([, d]) => d.status === 'overloaded');
  const underloaded = Object.entries(workloadMap).filter(([, d]) => d.status === 'light');

  for (const [overloadedUserId, overloadedData] of overloaded) {
    // Find tasks to move from overloaded user (lowest priority, not critical)
    const movableTasks = tasks.filter(t =>
      t.assignee_id === overloadedUserId &&
      t.priority !== 'critical' &&
      t.status !== 'in_progress' &&
      t.status !== 'blocked'
    ).sort((a, b) => (PRIORITY_WEIGHTS[a.priority] || 2) - (PRIORITY_WEIGHTS[b.priority] || 2));

    for (const [underloadedUserId, underloadedData] of underloaded) {
      if (movableTasks.length === 0) break;

      const taskToMove = movableTasks[0];
      const effortToMove = (taskToMove.effort_estimate || 4) * (PRIORITY_WEIGHTS[taskToMove.priority] || 2);
      const delayReduction = Math.round(
        ((overloadedData.workloadScore - avgScore) / overloadedData.workloadScore) * 100 * 0.4
      );

      suggestions.push({
        type: 'reassign',
        taskId: taskToMove.id,
        taskTitle: taskToMove.title,
        fromUserId: overloadedUserId,
        fromUserName: overloadedData.user?.name,
        toUserId: underloadedUserId,
        toUserName: underloadedData.user?.name,
        estimatedDelayReduction: Math.max(5, Math.min(40, delayReduction)),
        reason: `${overloadedData.user?.name} is overloaded (${overloadedData.taskCount} tasks)`
      });

      movableTasks.shift();
    }
  }

  return suggestions.slice(0, 5);
}

function calculateBalanceScore(scores) {
  if (scores.length < 2) return 100;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg === 0) return 100;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
  const cv = Math.sqrt(variance) / avg;
  return Math.max(0, Math.round(100 - cv * 50));
}

module.exports = { analyzeWorkload };
