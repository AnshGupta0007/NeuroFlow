const { supabaseAdmin } = require('../config/supabase');

async function analyzeUserBehavior(userId, projectId = null) {
  let query = supabaseAdmin
    .from('tasks')
    .select('id, status, priority, effort_estimate, time_spent, created_at, completed_at, due_date, assignee_id')
    .eq('assignee_id', userId)
    .eq('status', 'done')
    .not('completed_at', 'is', null);

  if (projectId) query = query.eq('project_id', projectId);

  const { data: completedTasks } = await query;
  const tasks = completedTasks || [];

  if (tasks.length === 0) {
    return {
      userId, insights: [], productivityScore: 0,
      peakHours: [], peakHourRanges: [],
      delayRate: 0, highPriorityDelayRate: 0,
      avgSpeedRatio: null, consistencyScore: 0,
      lastMinuteRate: 0, taskCount: 0,
      dnaProfile: { speed: 0, consistency: 0, punctuality: 0, reliability: 0, throughput: 0, focus: 0 },
      weeklyActivity: await getWeeklyActivity(userId, projectId)
    };
  }

  // Peak productivity hours
  const hourCounts = Array(24).fill(0);
  for (const task of tasks) {
    const hour = new Date(task.completed_at).getHours();
    hourCounts[hour]++;
  }
  const maxCount = Math.max(...hourCounts);
  const peakHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .filter(h => h.count >= maxCount * 0.7)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(h => h.hour);

  // Format peak hours as readable ranges
  const peakHourRanges = peakHours.map(h => `${h}:00-${h + 1}:00`);

  // Delay rate: tasks completed after due_date
  const tasksWithDueDate = tasks.filter(t => t.due_date);
  const delayedTasks = tasksWithDueDate.filter(
    t => new Date(t.completed_at) > new Date(t.due_date)
  );
  const delayRate = tasksWithDueDate.length > 0
    ? Math.round((delayedTasks.length / tasksWithDueDate.length) * 100)
    : 0;

  // High-priority delay rate
  const highPriorityTasks = tasksWithDueDate.filter(t => t.priority === 'critical' || t.priority === 'high');
  const delayedHighPriority = highPriorityTasks.filter(
    t => new Date(t.completed_at) > new Date(t.due_date)
  );
  const highPriorityDelayRate = highPriorityTasks.length > 0
    ? Math.round((delayedHighPriority.length / highPriorityTasks.length) * 100)
    : 0;

  // Speed ratio: logged time vs estimate (only when both are available)
  const speedRatios = tasks
    .filter(t => t.effort_estimate && t.time_spent > 0)
    .map(t => (t.time_spent / 60) / t.effort_estimate);

  const avgSpeedRatio = speedRatios.length > 0
    ? speedRatios.reduce((a, b) => a + b, 0) / speedRatios.length
    : null;

  // Consistency score: inverse of variance in completion times
  const completionTimes = tasks.map(t =>
    (new Date(t.completed_at) - new Date(t.created_at)) / (1000 * 60 * 60)
  );
  const avgTime = completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;
  const variance = completionTimes.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / completionTimes.length;
  const consistencyScore = Math.max(0, Math.min(100, Math.round(100 - Math.sqrt(variance) / avgTime * 100)));

  // Last-minute completion rate
  const lastMinuteTasks = tasksWithDueDate.filter(t => {
    const dueDate = new Date(t.due_date);
    const completedDate = new Date(t.completed_at);
    const hoursBeforeDue = (dueDate - completedDate) / (1000 * 60 * 60);
    return hoursBeforeDue >= 0 && hoursBeforeDue <= 2;
  });
  const lastMinuteRate = tasksWithDueDate.length > 0
    ? Math.round((lastMinuteTasks.length / tasksWithDueDate.length) * 100)
    : 0;

  // Productivity score: composite (speed only counted when time data exists)
  const speedScore = avgSpeedRatio != null
    ? Math.max(0, Math.min(100, Math.round(100 / avgSpeedRatio)))
    : 50;
  const punctualityScore = 100 - delayRate;
  const productivityScore = Math.round(
    speedScore * 0.35 + punctualityScore * 0.35 + consistencyScore * 0.3
  );

  // Generate insights
  const insights = [];

  if (peakHours.length > 0) {
    const peakRange = formatHourRange(peakHours);
    insights.push({
      type: 'peak_hours',
      icon: 'clock',
      message: `You are most productive between ${peakRange}`,
      severity: 'info'
    });
  }

  if (highPriorityDelayRate > 30) {
    insights.push({
      type: 'high_priority_delay',
      icon: 'alert',
      message: `You delay high-priority tasks ${highPriorityDelayRate}% of the time`,
      severity: 'warning'
    });
  }

  if (avgSpeedRatio != null && avgSpeedRatio < 0.8) {
    insights.push({
      type: 'speed',
      icon: 'lightning',
      message: `You complete tasks ${Math.round((1 - avgSpeedRatio) * 100)}% faster than estimated`,
      severity: 'success'
    });
  } else if (avgSpeedRatio != null && avgSpeedRatio > 1.5) {
    insights.push({
      type: 'speed',
      icon: 'turtle',
      message: `Tasks take ${avgSpeedRatio.toFixed(1)}x longer than your estimates — consider refining estimates`,
      severity: 'warning'
    });
  }

  if (lastMinuteRate > 40) {
    insights.push({
      type: 'last_minute',
      icon: 'fire',
      message: `You complete ${lastMinuteRate}% of tasks at the last minute`,
      severity: 'warning'
    });
  }

  if (delayRate < 10 && tasks.length >= 5) {
    insights.push({
      type: 'punctuality',
      icon: 'star',
      message: 'Excellent punctuality — you rarely miss deadlines',
      severity: 'success'
    });
  }

  // Throughput: tasks completed in the last 30 days, 10/month = 100%
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCount = tasks.filter(t => new Date(t.completed_at) >= thirtyDaysAgo).length;
  const throughputScore = Math.min(100, Math.round(recentCount * 10));

  // Focus: based on high-priority task handling + whether most work is deep_work
  const focusScore = highPriorityDelayRate < 20 ? 80 : Math.max(20, 80 - highPriorityDelayRate);

  // Team DNA data
  const dnaProfile = {
    speed: speedScore,
    consistency: consistencyScore,
    punctuality: punctualityScore,
    reliability: Math.max(0, 100 - lastMinuteRate),
    throughput: throughputScore,
    focus: focusScore
  };

  return {
    userId,
    taskCount: tasks.length,
    productivityScore,
    peakHours,
    peakHourRanges,
    delayRate,
    highPriorityDelayRate,
    avgSpeedRatio: Math.round(avgSpeedRatio * 100) / 100,
    consistencyScore,
    lastMinuteRate,
    insights,
    dnaProfile,
    weeklyActivity: await getWeeklyActivity(userId, projectId)
  };
}

function formatHourRange(hours) {
  if (hours.length === 0) return 'unknown';
  const sorted = [...hours].sort((a, b) => a - b);
  const format = h => `${h === 0 ? 12 : h > 12 ? h - 12 : h}${h >= 12 ? 'PM' : 'AM'}`;
  if (sorted.length === 1) return `${format(sorted[0])}-${format(sorted[0] + 1)}`;
  return `${format(sorted[0])}-${format(sorted[sorted.length - 1] + 1)}`;
}

async function getWeeklyActivity(userId, projectId = null) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let query = supabaseAdmin
    .from('tasks')
    .select('completed_at')
    .eq('assignee_id', userId)
    .eq('status', 'done')
    .gte('completed_at', thirtyDaysAgo.toISOString());

  if (projectId) query = query.eq('project_id', projectId);

  const { data: tasks } = await query;

  const activity = {};
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    activity[key] = 0;
  }

  for (const task of (tasks || [])) {
    const key = task.completed_at.split('T')[0];
    if (activity[key] !== undefined) activity[key]++;
  }

  return Object.entries(activity).map(([date, count]) => ({ date, count }));
}

async function getTeamDNA(projectId) {
  const { data: members } = await supabaseAdmin
    .from('project_members')
    .select('user_id, users(name, avatar_url)')
    .eq('project_id', projectId);

  if (!members) return [];

  const profiles = await Promise.all(
    members.map(async m => {
      const behavior = await analyzeUserBehavior(m.user_id, projectId).catch(() => null);
      return behavior ? {
        userId: m.user_id,
        name: m.users?.name || 'Unknown',
        avatarUrl: m.users?.avatar_url,
        dnaProfile: behavior.dnaProfile,
        productivityScore: behavior.productivityScore,
        archetype: classifyArchetype(behavior)
      } : null;
    })
  );

  return profiles.filter(Boolean);
}

function classifyArchetype(behavior) {
  const { avgSpeedRatio, delayRate, lastMinuteRate, consistencyScore } = behavior;

  if (avgSpeedRatio < 0.85 && delayRate < 15) return 'Fast Worker';
  if (consistencyScore > 80 && delayRate < 20) return 'Consistent Worker';
  if (lastMinuteRate > 50) return 'Last-Minute Worker';
  if (delayRate > 40) return 'Risk Creator';
  if (avgSpeedRatio > 1.3 && delayRate > 25) return 'Struggling Worker';
  return 'Balanced Worker';
}

module.exports = { analyzeUserBehavior, getTeamDNA, getWeeklyActivity };
