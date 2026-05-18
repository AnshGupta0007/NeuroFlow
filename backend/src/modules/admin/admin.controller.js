const { supabaseAdmin } = require('../../config/supabase');
const { success } = require('../../utils/response');
const { z } = require('zod');
const { analyzeUserBehavior } = require('../../services/behavior.service');

async function listUsers(req, res, next) {
  try {
    const { search } = req.query;
    let query = supabaseAdmin
      .from('users')
      .select('id, name, email, role, avatar_url, created_at')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw Object.assign(new Error(error.message), { status: 500 });

    // Enrich with project count per user
    const userIds = (data || []).map(u => u.id);
    const { data: memberships } = await supabaseAdmin
      .from('project_members')
      .select('user_id')
      .in('user_id', userIds);

    const projectCounts = (memberships || []).reduce((acc, m) => {
      acc[m.user_id] = (acc[m.user_id] || 0) + 1;
      return acc;
    }, {});

    const users = (data || []).map(u => ({
      ...u,
      projectCount: projectCounts[u.id] || 0
    }));

    success(res, users);
  } catch (err) { next(err); }
}

async function updateUserRole(req, res, next) {
  try {
    const { role } = z.object({ role: z.enum(['admin', 'member', 'observer']) }).parse(req.body);

    if (req.params.userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', req.params.userId)
      .select('id, name, email, role')
      .single();

    if (error) throw Object.assign(new Error(error.message), { status: 500 });
    success(res, data, 'Role updated');
  } catch (err) { next(err); }
}

async function deleteUser(req, res, next) {
  try {
    if (req.params.userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Remove from project_members first
    await supabaseAdmin.from('project_members').delete().eq('user_id', req.params.userId);

    // Delete from public.users
    const { error } = await supabaseAdmin.from('users').delete().eq('id', req.params.userId);
    if (error) throw Object.assign(new Error(error.message), { status: 500 });

    // Delete from auth.users
    await supabaseAdmin.auth.admin.deleteUser(req.params.userId);

    success(res, null, 'User deleted');
  } catch (err) { next(err); }
}

async function getTeamStats(req, res, next) {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, avatar_url')
      .order('name');

    if (error) throw Object.assign(new Error(error.message), { status: 500 });

    const stats = await Promise.all((users || []).map(async u => {
      const [behavior, tasksRes] = await Promise.all([
        analyzeUserBehavior(u.id).catch(() => null),
        supabaseAdmin
          .from('tasks')
          .select('id, status, priority, due_date, completed_at, effort_estimate, time_spent')
          .eq('assignee_id', u.id)
          .gte('completed_at', startDate.toISOString())
          .eq('status', 'done')
      ]);

      const completedTasks = (tasksRes.data || []).length;

      // Build daily trend
      const completedByDay = {};
      for (const t of (tasksRes.data || [])) {
        const day = t.completed_at.split('T')[0];
        completedByDay[day] = (completedByDay[day] || 0) + 1;
      }
      const trend = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const key = date.toISOString().split('T')[0];
        trend.push({ date: key, tasksCompleted: completedByDay[key] || 0 });
      }

      return {
        user: u,
        productivityScore: behavior?.productivityScore || 0,
        completedTasks,
        delayRate: behavior?.delayRate || 0,
        avgSpeedRatio: behavior?.avgSpeedRatio || null,
        dnaProfile: behavior?.dnaProfile || null,
        peakHours: behavior?.peakHourRanges || [],
        insights: behavior?.insights || [],
        trend
      };
    }));

    success(res, stats);
  } catch (err) { next(err); }
}

async function getOverviewReport(req, res, next) {
  try {
    const now = new Date();

    const [
      { data: projects },
      { data: tasks },
      { data: users },
      { data: memberships }
    ] = await Promise.all([
      supabaseAdmin.from('projects').select('id, name, status, risk_score, deadline, created_at').order('created_at', { ascending: false }),
      supabaseAdmin.from('tasks').select('id, status, priority, due_date, completed_at, project_id, assignee_id'),
      supabaseAdmin.from('users').select('id, name, email, role, created_at'),
      supabaseAdmin.from('project_members').select('project_id, user_id, role')
    ]);

    const allProjects = projects || [];
    const allTasks = tasks || [];
    const allUsers = users || [];
    const allMemberships = memberships || [];

    const projectRows = allProjects.map(p => {
      const projectTasks = allTasks.filter(t => t.project_id === p.id);
      const done = projectTasks.filter(t => t.status === 'done').length;
      const pending = projectTasks.filter(t => t.status !== 'done').length;
      const overdue = projectTasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done').length;
      const memberCount = allMemberships.filter(m => m.project_id === p.id).length;
      const progress = projectTasks.length > 0 ? Math.round((done / projectTasks.length) * 100) : 0;

      return {
        name: p.name,
        status: p.status,
        progress: `${progress}%`,
        totalTasks: projectTasks.length,
        doneTasks: done,
        pendingTasks: pending,
        overdueTasks: overdue,
        riskScore: p.risk_score || 0,
        deadline: p.deadline ? p.deadline.split('T')[0] : 'No deadline',
        members: memberCount,
        createdAt: p.created_at.split('T')[0]
      };
    });

    const memberRows = allUsers.map(u => {
      const userTasks = allTasks.filter(t => t.assignee_id === u.id);
      const done = userTasks.filter(t => t.status === 'done').length;
      const overdue = userTasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done').length;
      const projectCount = allMemberships.filter(m => m.user_id === u.id).length;
      return {
        name: u.name,
        email: u.email,
        role: u.role,
        projects: projectCount,
        tasksAssigned: userTasks.length,
        tasksCompleted: done,
        overdueTasks: overdue,
        joinedAt: u.created_at.split('T')[0]
      };
    });

    const summary = {
      generatedAt: now.toISOString(),
      totalProjects: allProjects.length,
      activeProjects: allProjects.filter(p => p.status === 'active').length,
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter(t => t.status === 'done').length,
      overdueTasks: allTasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done').length,
      totalMembers: allUsers.length
    };

    success(res, { summary, projectRows, memberRows });
  } catch (err) { next(err); }
}

async function getProjectReport(req, res, next) {
  try {
    const { projectId } = req.params;
    const now = new Date();

    const [
      { data: project },
      { data: tasks },
      { data: members }
    ] = await Promise.all([
      supabaseAdmin.from('projects').select('*').eq('id', projectId).single(),
      supabaseAdmin.from('tasks').select('*, assignee:users!tasks_assignee_id_fkey(name, email)').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabaseAdmin.from('project_members').select('role, users(id, name, email)').eq('project_id', projectId)
    ]);

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const allTasks = tasks || [];
    const allMembers = members || [];

    const taskRows = allTasks.map(t => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignee: t.assignee?.name || 'Unassigned',
      assigneeEmail: t.assignee?.email || '',
      dueDate: t.due_date ? t.due_date.split('T')[0] : '',
      effortEstimate: t.effort_estimate ? `${t.effort_estimate}h` : '',
      timeSpent: t.time_spent ? `${Math.round(t.time_spent / 60 * 10) / 10}h` : '',
      completedAt: t.completed_at ? t.completed_at.split('T')[0] : '',
      isOverdue: t.due_date && new Date(t.due_date) < now && t.status !== 'done' ? 'Yes' : 'No',
      createdAt: t.created_at.split('T')[0]
    }));

    const memberRows = allMembers.map(m => {
      const userTasks = allTasks.filter(t => t.assignee_id === m.users?.id);
      return {
        name: m.users?.name || '',
        email: m.users?.email || '',
        role: m.role,
        tasksAssigned: userTasks.length,
        tasksCompleted: userTasks.filter(t => t.status === 'done').length,
        tasksPending: userTasks.filter(t => t.status !== 'done').length,
        overdueTasks: userTasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done').length
      };
    });

    const done = allTasks.filter(t => t.status === 'done').length;
    const summary = {
      projectName: project.name,
      status: project.status,
      deadline: project.deadline ? project.deadline.split('T')[0] : 'No deadline',
      progress: allTasks.length > 0 ? `${Math.round((done / allTasks.length) * 100)}%` : '0%',
      totalTasks: allTasks.length,
      doneTasks: done,
      pendingTasks: allTasks.length - done,
      blockedTasks: allTasks.filter(t => t.status === 'blocked').length,
      overdueTasks: allTasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done').length,
      riskScore: project.risk_score || 0,
      totalMembers: allMembers.length,
      generatedAt: now.toISOString()
    };

    success(res, { summary, taskRows, memberRows });
  } catch (err) { next(err); }
}

module.exports = { listUsers, updateUserRole, deleteUser, getTeamStats, getOverviewReport, getProjectReport };
