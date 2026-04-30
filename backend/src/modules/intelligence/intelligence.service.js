const { supabaseAdmin } = require('../../config/supabase');
const { predictProjectCompletion } = require('../../services/prediction.service');
const { analyzeUserBehavior, getTeamDNA } = require('../../services/behavior.service');
const { analyzeWorkload } = require('../../services/workload.service');
const { calculateCriticalPath, detectBlockedTasks } = require('../../services/graph.service');

async function getProjectIntelligence(projectId, userId) {
  const [prediction, workload, teamDna] = await Promise.all([
    predictProjectCompletion(projectId),
    analyzeWorkload(projectId),
    getTeamDNA(projectId)
  ]);

  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('project_id', projectId);

  const { data: deps } = await supabaseAdmin
    .from('task_dependencies')
    .select('*')
    .eq('project_id', projectId);

  const allTasks = tasks || [];
  const blocked = detectBlockedTasks(allTasks, deps || []);
  const criticalPath = calculateCriticalPath(allTasks, deps || []);

  const timeDriftTasks = detectTimeDrift(allTasks);

  return {
    prediction,
    workload,
    teamDna,
    blockedTasks: blocked,
    criticalPath: {
      taskIds: criticalPath.criticalPath,
      duration: criticalPath.totalDuration
    },
    timeDrift: timeDriftTasks,
    generatedAt: new Date().toISOString()
  };
}

function detectTimeDrift(tasks) {
  const driftingTasks = [];
  const now = new Date();

  for (const task of tasks) {
    if (task.status === 'done' || !task.effort_estimate) continue;

    const startedAt = task.started_at ? new Date(task.started_at) : new Date(task.created_at);
    const hoursElapsed = (now - startedAt) / (1000 * 60 * 60);
    const driftHours = hoursElapsed - task.effort_estimate;

    if (driftHours > 8) { // drifting by more than 1 day
      const driftDays = Math.round(driftHours / 24 * 10) / 10;
      driftingTasks.push({
        task,
        driftHours: Math.round(driftHours),
        driftDays,
        message: `This task is drifting by +${driftDays} days`
      });
    }
  }

  return driftingTasks.sort((a, b) => b.driftHours - a.driftHours);
}

async function answerAIQuestion(question, projectId, userId) {
  const q = question.toLowerCase().trim();

  // Load context
  const [intelligenceData, userBehavior] = await Promise.all([
    getProjectIntelligence(projectId, userId),
    analyzeUserBehavior(userId, projectId)
  ]);

  const { prediction, workload, blockedTasks, timeDrift } = intelligenceData;

  // Rule-based AI response engine
  if (matchesPattern(q, ['why', 'delayed', 'behind', 'late'])) {
    return buildDelayExplanation(prediction, blockedTasks, workload);
  }

  if (matchesPattern(q, ['what', 'do today', 'work on', 'next', 'should i'])) {
    return buildTodayRecommendation(projectId, userId, userBehavior, prediction);
  }

  if (matchesPattern(q, ['risk', 'dangerous', 'problem', 'issue', 'concern'])) {
    return buildRiskAnalysis(prediction, blockedTasks, timeDrift);
  }

  if (matchesPattern(q, ['bottleneck', 'blocking', 'slow'])) {
    return buildBottleneckAnalysis(prediction.bottlenecks, blockedTasks);
  }

  if (matchesPattern(q, ['workload', 'overloaded', 'balance', 'assign'])) {
    return buildWorkloadSummary(workload);
  }

  if (matchesPattern(q, ['when', 'finish', 'complete', 'deadline', 'done'])) {
    return buildCompletionForecast(prediction);
  }

  if (matchesPattern(q, ['productive', 'peak', 'best time', 'performance'])) {
    return buildProductivityInsight(userBehavior);
  }

  if (matchesPattern(q, ['fix', 'solve', 'improve', 'help', 'action', 'steps', 'suggest', 'recommend', 'what can', 'how to', 'how can', 'what should'])) {
    return buildActionPlan(prediction, blockedTasks, workload, timeDrift);
  }

  if (matchesPattern(q, ['status', 'overview', 'summary', 'update', 'progress', 'how is'])) {
    return buildProjectSummary(prediction, blockedTasks, workload);
  }

  return {
    answer: "I can help you understand project status, delays, risks, workload, and productivity. Try asking: 'Why is this project delayed?', 'What should I work on today?', or 'What are the main risks?'",
    confidence: 0.5,
    suggestions: [
      'Why is this project delayed?',
      'What should I work on today?',
      'Who is the bottleneck?',
      'When will this project finish?'
    ]
  };
}

function matchesPattern(query, keywords) {
  return keywords.some(kw => query.includes(kw));
}

async function buildTodayRecommendation(projectId, userId, behavior, prediction) {
  const { data: myTasks } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .eq('assignee_id', userId)
    .neq('status', 'done')
    .order('priority', { ascending: true });

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const ranked = (myTasks || [])
    .filter(t => t.status !== 'blocked')
    .sort((a, b) => {
      const pDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      if (pDiff !== 0) return pDiff;
      if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
      return 0;
    });

  const topTask = ranked[0];
  const currentHour = new Date().getHours();
  const isPeakHour = behavior.peakHours.includes(currentHour);

  let answer = '';
  if (!topTask) {
    answer = "Great news — you have no pending tasks! Consider helping teammates or reviewing the project timeline.";
  } else {
    answer = `Focus on "${topTask.title}" (${topTask.priority} priority).`;
    if (topTask.due_date) {
      const daysLeft = Math.round((new Date(topTask.due_date) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 1) answer += ` ⚠️ Due in ${daysLeft <= 0 ? 'less than a day' : '1 day'}!`;
      else answer += ` Due in ${daysLeft} days.`;
    }
    if (isPeakHour) {
      answer += " You're in your peak productivity window — perfect time for deep work.";
    }
    if (behavior.delayRate > 40) {
      answer += " Tip: Based on your patterns, start early to avoid last-minute rush.";
    }
  }

  return {
    answer,
    confidence: 0.85,
    recommendedTask: topTask,
    otherTasks: ranked.slice(1, 3),
    context: `Based on ${ranked.length} pending tasks and your productivity patterns`
  };
}

function buildDelayExplanation(prediction, blockedTasks, workload) {
  const reasons = [];
  let answer = '';

  if (prediction.delayRisk > 50) {
    answer = `Project has ${prediction.delayRisk}% risk of delay. `;
  }

  if (prediction.bottlenecks.length > 0) {
    const bottleneck = prediction.bottlenecks[0];
    reasons.push(`${bottleneck.userName} is blocking ${bottleneck.blockingTaskCount} tasks`);
  }

  if (blockedTasks.length > 0) {
    reasons.push(`${blockedTasks.length} tasks are blocked by unresolved dependencies`);
  }

  if (prediction.estimatedDaysRemaining > (prediction.daysUntilDeadline || Infinity)) {
    const overrun = prediction.estimatedDaysRemaining - (prediction.daysUntilDeadline || 0);
    reasons.push(`At current velocity, project needs ${overrun} more days than available`);
  }

  if (workload.suggestions.length > 0) {
    reasons.push(`Unbalanced workload — some team members are overloaded`);
  }

  if (reasons.length === 0) {
    answer = "Project appears on track. No critical delay factors detected.";
  } else {
    answer += `Main delay factors: ${reasons.join('; ')}.`;
  }

  return {
    answer,
    confidence: 0.9,
    factors: reasons,
    riskScore: prediction.delayRisk
  };
}

function buildRiskAnalysis(prediction, blockedTasks, timeDrift) {
  const risks = [...prediction.riskFactors];

  if (timeDrift.length > 0) {
    risks.push({
      type: 'time_drift',
      severity: 'medium',
      message: `${timeDrift.length} tasks are taking longer than estimated`
    });
  }

  const criticalRisks = risks.filter(r => r.severity === 'high');
  const mediumRisks = risks.filter(r => r.severity === 'medium');

  let answer = '';
  if (criticalRisks.length === 0 && mediumRisks.length === 0) {
    answer = "Project looks healthy! No significant risks detected.";
  } else {
    answer = `Found ${criticalRisks.length} critical and ${mediumRisks.length} medium risks. `;
    if (criticalRisks.length > 0) {
      answer += `Critical: ${criticalRisks[0].message}.`;
    }
  }

  return { answer, confidence: 0.88, risks };
}

function buildBottleneckAnalysis(bottlenecks, blockedTasks) {
  if (bottlenecks.length === 0 && blockedTasks.length === 0) {
    return {
      answer: "No bottlenecks detected! Work is flowing smoothly across the team.",
      confidence: 0.8,
      bottlenecks: []
    };
  }

  const topBottleneck = bottlenecks[0];
  let answer = '';

  if (topBottleneck) {
    answer = `${topBottleneck.userName} is the main bottleneck, blocking ${topBottleneck.blockingTaskCount} tasks. `;
  }

  if (blockedTasks.length > 0) {
    answer += `${blockedTasks.length} tasks cannot start due to unresolved dependencies.`;
  }

  return { answer, confidence: 0.85, bottlenecks, blockedCount: blockedTasks.length };
}

function buildWorkloadSummary(workload) {
  const overloaded = workload.members.filter(m => m.status === 'overloaded');
  const underloaded = workload.members.filter(m => m.status === 'light');

  let answer = '';
  if (workload.balanceScore > 80) {
    answer = `Team workload is well balanced (balance score: ${workload.balanceScore}/100).`;
  } else {
    answer = `Workload imbalance detected (balance score: ${workload.balanceScore}/100). `;
    if (overloaded.length > 0) {
      answer += `${overloaded.map(m => m.user?.name).join(', ')} ${overloaded.length > 1 ? 'are' : 'is'} overloaded. `;
    }
    if (workload.suggestions.length > 0) {
      const s = workload.suggestions[0];
      answer += `Suggestion: Move "${s.taskTitle}" from ${s.fromUserName} to ${s.toUserName}.`;
    }
  }

  return {
    answer,
    confidence: 0.85,
    balanceScore: workload.balanceScore,
    suggestions: workload.suggestions
  };
}

function buildCompletionForecast(prediction) {
  const date = new Date(prediction.predictedEndDate).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  });

  let answer = `At current velocity, project will complete around ${date}. `;

  if (prediction.daysUntilDeadline !== null) {
    if (prediction.delayRisk > 60) {
      answer += `⚠️ This is ${prediction.estimatedDaysRemaining - prediction.daysUntilDeadline} days past the deadline.`;
    } else if (prediction.delayRisk < 20) {
      answer += `✅ You're on track to finish before the deadline.`;
    }
  }

  answer += ` ${prediction.completionPercentage}% complete with ${prediction.pendingTasks} tasks remaining.`;

  return {
    answer,
    confidence: 0.82,
    predictedEndDate: prediction.predictedEndDate,
    completionPercentage: prediction.completionPercentage,
    delayRisk: prediction.delayRisk
  };
}

function buildProductivityInsight(behavior) {
  const peakRange = behavior.peakHourRanges[0] || 'unknown hours';
  let answer = `You're most productive at ${peakRange}. `;

  if (behavior.delayRate < 15) {
    answer += "You have excellent time management — rarely missing deadlines. ";
  } else if (behavior.delayRate > 40) {
    answer += `You tend to delay ${behavior.delayRate}% of tasks — consider time-boxing. `;
  }

  if (behavior.avgSpeedRatio < 0.9) {
    answer += `You're ${Math.round((1 - behavior.avgSpeedRatio) * 100)}% faster than your estimates.`;
  } else if (behavior.avgSpeedRatio > 1.3) {
    answer += `Tasks take ${Math.round((behavior.avgSpeedRatio - 1) * 100)}% longer than estimated — adjust your estimates.`;
  }

  return {
    answer,
    confidence: 0.80,
    productivityScore: behavior.productivityScore,
    insights: behavior.insights
  };
}

async function askGrok(question, projectId, userId) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      answer: "Groq API key is not configured. Add GROQ_API_KEY to the backend .env file to enable Groq AI.",
      confidence: null,
      model: 'groq-unavailable'
    };
  }

  const [intel, { data: tasks }, { data: members }] = await Promise.all([
    getProjectIntelligence(projectId, userId),
    supabaseAdmin.from('tasks').select('title, status, priority, due_date, assignee_id').eq('project_id', projectId),
    supabaseAdmin.from('project_members').select('role, users(name)').eq('project_id', projectId)
  ]);

  const taskSummary = (tasks || []).map(t =>
    `- ${t.title} [${t.status}, ${t.priority}${t.due_date ? ', due ' + t.due_date.split('T')[0] : ''}]`
  ).join('\n');

  const memberSummary = (members || []).map(m =>
    `- ${m.users?.name} (${m.role})`
  ).join('\n');

  const systemPrompt = `You are a project management AI assistant for NeuroFlow.
Project context:
Tasks:
${taskSummary || 'No tasks'}
Team:
${memberSummary || 'No members'}
Delay risk: ${intel.prediction?.delayRisk ?? 'unknown'}%
Blocked tasks: ${intel.blockedTasks?.length ?? 0}
Answer concisely in 2-3 sentences.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        max_tokens: 300
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq API error: ${res.status} ${err}`);
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content || 'No response from Groq.';
    return { answer, confidence: null, model: 'llama-3.3-70b' };
  } catch (err) {
    return {
      answer: `Groq API error: ${err.message}`,
      confidence: null,
      model: 'groq-error'
    };
  }
}

function buildActionPlan(prediction, blockedTasks, workload, timeDrift) {
  const actions = [];

  if (blockedTasks.length > 0) {
    actions.push(`Unblock ${blockedTasks.length} stalled task${blockedTasks.length > 1 ? 's' : ''} — resolve their dependencies so work can resume`);
  }
  if (prediction.bottlenecks?.length > 0) {
    const b = prediction.bottlenecks[0];
    actions.push(`Redistribute tasks from ${b.userName} — they're blocking ${b.blockingTaskCount} others`);
  }
  if (workload.suggestions?.length > 0) {
    const s = workload.suggestions[0];
    actions.push(`Move "${s.taskTitle}" from ${s.fromUserName} to ${s.toUserName} to rebalance load`);
  }
  if (timeDrift?.length > 0) {
    actions.push(`Review ${timeDrift.length} time-drifting task${timeDrift.length > 1 ? 's' : ''} — they're taking longer than estimated`);
  }
  if (prediction.delayRisk > 60) {
    actions.push(`Prioritize critical-path tasks to reduce the ${prediction.delayRisk}% delay risk`);
  }

  const answer = actions.length > 0
    ? `Here's what to do: ${actions.map((a, i) => `${i + 1}. ${a}`).join('. ')}.`
    : 'Project looks healthy — keep current pace and monitor critical tasks.';

  return { answer, confidence: 0.85, actions };
}

function buildProjectSummary(prediction, blockedTasks, workload) {
  const status = prediction.delayRisk > 60 ? '🔴 At Risk' : prediction.delayRisk > 30 ? '🟡 Needs Attention' : '🟢 On Track';
  const answer = `${status} — ${prediction.completionPercentage}% complete, ${prediction.pendingTasks} tasks remaining. Delay risk: ${prediction.delayRisk}%. ${blockedTasks.length > 0 ? `${blockedTasks.length} blocked tasks need attention.` : 'No blocked tasks.'} Team workload balance: ${workload.balanceScore}/100.`;

  return { answer, confidence: 0.9, prediction, blockedCount: blockedTasks.length };
}

module.exports = { getProjectIntelligence, answerAIQuestion, askGrok, detectTimeDrift };
