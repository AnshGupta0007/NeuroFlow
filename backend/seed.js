require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── helpers ────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

function hoursAgo(n) {
  return new Date(Date.now() - n * 3600000).toISOString();
}

// completed_at at a specific hour of day, N days ago
function completedAt(daysBack, hour) {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString();
}

async function clean() {
  // Delete in dependency order
  await supabaseAdmin.from('predictions_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseAdmin.from('productivity_metrics').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseAdmin.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseAdmin.from('task_dependencies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseAdmin.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseAdmin.from('project_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseAdmin.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseAdmin.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✓ Cleaned existing seed data');
}

async function createUser(email, password, name, role) {
  // Create auth user
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email, password,
    email_confirm: true   // auto-confirm, no email needed
  });
  if (authErr) {
    // If already exists, fetch it
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const existing = users.find(u => u.email === email);
    if (!existing) throw new Error(`Auth error for ${email}: ${authErr.message}`);
    // Upsert profile
    await supabaseAdmin.from('users').upsert({ id: existing.id, email, name, role });
    return existing.id;
  }

  const userId = authData.user.id;
  const { error: profileErr } = await supabaseAdmin
    .from('users')
    .insert({ id: userId, email, name, role });
  if (profileErr) throw new Error(`Profile error for ${email}: ${profileErr.message}`);

  return userId;
}

// ─── main seed ──────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🌱 Seeding NeuroFlow...\n');

  await clean();

  // ── 1. USERS ──────────────────────────────────────────────────────────────
  console.log('Creating users...');

  const PASSWORD = 'Password@123';

  const alexId   = await createUser('alex@neuroflow.dev',   PASSWORD, 'Alex Johnson', 'admin');
  const sarahId  = await createUser('sarah@neuroflow.dev',  PASSWORD, 'Sarah Chen',   'member');
  const marcusId = await createUser('marcus@neuroflow.dev', PASSWORD, 'Marcus Williams', 'member');
  const priyaId  = await createUser('priya@neuroflow.dev',  PASSWORD, 'Priya Patel',  'member');
  const jordanId = await createUser('jordan@neuroflow.dev', PASSWORD, 'Jordan Smith', 'observer');

  console.log('✓ 5 users created');
  console.log('  admin   → alex@neuroflow.dev   / Password@123');
  console.log('  member  → sarah@neuroflow.dev  / Password@123  (Fast Worker)');
  console.log('  member  → marcus@neuroflow.dev / Password@123  (Consistent Worker)');
  console.log('  member  → priya@neuroflow.dev  / Password@123  (Last-Minute Worker)');
  console.log('  observer→ jordan@neuroflow.dev / Password@123  (Read-only)');

  // ── 2. PROJECTS ───────────────────────────────────────────────────────────
  console.log('\nCreating projects...');

  const { data: p1 } = await supabaseAdmin.from('projects').insert({
    name: 'NeuroFlow v2.0',
    description: 'Next-gen release with real-time collaboration and advanced AI features.',
    status: 'active',
    deadline: daysFromNow(18),
    complexity_score: 78,
    risk_score: 62,
    created_by: alexId
  }).select().single();

  const { data: p2 } = await supabaseAdmin.from('projects').insert({
    name: 'Mobile App Launch',
    description: 'iOS & Android launch of the NeuroFlow companion app.',
    status: 'active',
    deadline: daysFromNow(45),
    complexity_score: 54,
    risk_score: 28,
    created_by: alexId
  }).select().single();

  const { data: p3 } = await supabaseAdmin.from('projects').insert({
    name: 'API Performance Refactor',
    description: 'Optimize all critical endpoints. Target: < 100ms p95 latency.',
    status: 'on_hold',
    deadline: daysFromNow(60),
    complexity_score: 42,
    risk_score: 15,
    created_by: sarahId
  }).select().single();

  console.log('✓ 3 projects created');

  // ── 3. PROJECT MEMBERS ────────────────────────────────────────────────────
  console.log('Adding members...');

  const memberRows = [
    // Project 1 — NeuroFlow v2.0
    { project_id: p1.id, user_id: alexId,   role: 'admin'  },
    { project_id: p1.id, user_id: sarahId,  role: 'member' },
    { project_id: p1.id, user_id: marcusId, role: 'member' },
    { project_id: p1.id, user_id: priyaId,  role: 'member' },
    { project_id: p1.id, user_id: jordanId, role: 'observer' },
    // Project 2 — Mobile App
    { project_id: p2.id, user_id: alexId,   role: 'admin'  },
    { project_id: p2.id, user_id: sarahId,  role: 'member' },
    { project_id: p2.id, user_id: marcusId, role: 'member' },
    // Project 3 — API Refactor
    { project_id: p3.id, user_id: sarahId,  role: 'admin'  },
    { project_id: p3.id, user_id: marcusId, role: 'member' },
    { project_id: p3.id, user_id: alexId,   role: 'observer' },
  ];
  await supabaseAdmin.from('project_members').insert(memberRows);
  console.log('✓ Members assigned');

  // ── 4. TASKS — Project 1: NeuroFlow v2.0 ─────────────────────────────────
  console.log('Creating tasks...');

  // Alex's completed tasks (admin — morning productivity pattern)
  await supabaseAdmin.from('tasks').insert([
    {
      title: 'Define Q2 product roadmap',
      project_id: p1.id, assignee_id: alexId, created_by: alexId,
      status: 'done', priority: 'critical', energy_type: 'deep_work',
      effort_estimate: 8, created_at: daysAgo(25),
      completed_at: completedAt(23, 9), due_date: daysAgo(22)
    },
    {
      title: 'Stakeholder presentation prep',
      project_id: p1.id, assignee_id: alexId, created_by: alexId,
      status: 'done', priority: 'high', energy_type: 'shallow_work',
      effort_estimate: 4, created_at: daysAgo(20),
      completed_at: completedAt(19, 10), due_date: daysAgo(18)
    },
    {
      title: 'Review and merge 12 pull requests',
      project_id: p1.id, assignee_id: alexId, created_by: alexId,
      status: 'done', priority: 'medium', energy_type: 'shallow_work',
      effort_estimate: 3, created_at: daysAgo(15),
      completed_at: completedAt(14, 11), due_date: daysAgo(13)
    },
    {
      title: 'Set up production monitoring alerts',
      project_id: p1.id, assignee_id: alexId, created_by: alexId,
      status: 'done', priority: 'high', energy_type: 'deep_work',
      effort_estimate: 6, created_at: daysAgo(12),
      completed_at: completedAt(10, 9), due_date: daysAgo(9)
    },
    {
      title: 'Team sprint retrospective facilitation',
      project_id: p2.id, assignee_id: alexId, created_by: alexId,
      status: 'done', priority: 'medium', energy_type: 'shallow_work',
      effort_estimate: 2, created_at: daysAgo(10),
      completed_at: completedAt(9, 10), due_date: daysAgo(9)
    },
    {
      title: 'Approve infrastructure cost budget',
      project_id: p1.id, assignee_id: alexId, created_by: alexId,
      status: 'done', priority: 'high', energy_type: 'shallow_work',
      effort_estimate: 2, created_at: daysAgo(7),
      completed_at: completedAt(6, 8), due_date: daysAgo(5)
    },
  ]);

  // DONE tasks (historical — feed the behavior engine)
  const doneTasks1 = await supabaseAdmin.from('tasks').insert([
    {
      title: 'Design new dashboard wireframes',
      project_id: p1.id, assignee_id: sarahId, created_by: alexId,
      status: 'done', priority: 'high', energy_type: 'deep_work',
      effort_estimate: 8,
      created_at: daysAgo(28), completed_at: completedAt(26, 23), // Sarah works late
      due_date: daysAgo(25)
    },
    {
      title: 'Set up CI/CD pipeline',
      project_id: p1.id, assignee_id: marcusId, created_by: alexId,
      status: 'done', priority: 'high', energy_type: 'deep_work',
      effort_estimate: 12,
      created_at: daysAgo(27), completed_at: completedAt(24, 10), // Marcus works mornings
      due_date: daysAgo(23)
    },
    {
      title: 'Database schema migration v2',
      project_id: p1.id, assignee_id: sarahId, created_by: alexId,
      status: 'done', priority: 'critical', energy_type: 'deep_work',
      effort_estimate: 6,
      created_at: daysAgo(22), completed_at: completedAt(20, 22),
      due_date: daysAgo(19)
    },
    {
      title: 'Write API documentation',
      project_id: p1.id, assignee_id: marcusId, created_by: alexId,
      status: 'done', priority: 'medium', energy_type: 'shallow_work',
      effort_estimate: 4,
      created_at: daysAgo(18), completed_at: completedAt(16, 11),
      due_date: daysAgo(15)
    },
    {
      title: 'User research interviews',
      project_id: p1.id, assignee_id: priyaId, created_by: alexId,
      status: 'done', priority: 'high', energy_type: 'shallow_work',
      effort_estimate: 6,
      created_at: daysAgo(20), completed_at: completedAt(15, 23), // Priya finishes last minute
      due_date: daysAgo(15)
    },
    {
      title: 'Setup error monitoring (Sentry)',
      project_id: p1.id, assignee_id: sarahId, created_by: alexId,
      status: 'done', priority: 'medium', energy_type: 'shallow_work',
      effort_estimate: 3,
      created_at: daysAgo(14), completed_at: completedAt(12, 0), // midnight
      due_date: daysAgo(11)
    },
    {
      title: 'Performance audit — identify bottlenecks',
      project_id: p1.id, assignee_id: marcusId, created_by: sarahId,
      status: 'done', priority: 'high', energy_type: 'deep_work',
      effort_estimate: 8,
      created_at: daysAgo(12), completed_at: completedAt(10, 9),
      due_date: daysAgo(9)
    },
    {
      title: 'Implement JWT refresh token logic',
      project_id: p1.id, assignee_id: sarahId, created_by: alexId,
      status: 'done', priority: 'critical', energy_type: 'deep_work',
      effort_estimate: 5,
      created_at: daysAgo(10), completed_at: completedAt(8, 1),
      due_date: daysAgo(7)
    },
    {
      title: 'Update onboarding flow copy',
      project_id: p1.id, assignee_id: priyaId, created_by: alexId,
      status: 'done', priority: 'low', energy_type: 'shallow_work',
      effort_estimate: 2,
      created_at: daysAgo(9), completed_at: completedAt(7, 22), // last minute
      due_date: daysAgo(7)
    },
    {
      title: 'Add dark mode support',
      project_id: p1.id, assignee_id: priyaId, created_by: alexId,
      status: 'done', priority: 'medium', energy_type: 'deep_work',
      effort_estimate: 10,
      created_at: daysAgo(16), completed_at: completedAt(6, 23), // very late, drifted
      due_date: daysAgo(8)
    },
  ]).select();

  // ACTIVE tasks — various statuses
  const { data: activeTasks1 } = await supabaseAdmin.from('tasks').insert([
    {
      title: 'Build real-time notification system',
      description: 'WebSocket-based notifications for task updates, mentions, and project events.',
      project_id: p1.id, assignee_id: sarahId, created_by: alexId,
      status: 'in_progress', priority: 'critical', energy_type: 'deep_work',
      effort_estimate: 20, due_date: daysFromNow(5),
      started_at: daysAgo(3)
    },
    {
      title: 'Redesign Intelligence Panel UI',
      description: 'New layout for predictions, workload charts, and AI assistant.',
      project_id: p1.id, assignee_id: priyaId, created_by: alexId,
      status: 'in_progress', priority: 'high', energy_type: 'deep_work',
      effort_estimate: 16, due_date: daysFromNow(8),
      started_at: daysAgo(2)
    },
    {
      title: 'Write integration tests for auth module',
      project_id: p1.id, assignee_id: marcusId, created_by: alexId,
      status: 'todo', priority: 'high', energy_type: 'deep_work',
      effort_estimate: 8, due_date: daysFromNow(7)
    },
    {
      title: 'Implement task bulk actions',
      description: 'Select multiple tasks → bulk assign, move status, delete.',
      project_id: p1.id, assignee_id: priyaId, created_by: alexId,
      status: 'todo', priority: 'medium', energy_type: 'shallow_work',
      effort_estimate: 6, due_date: daysFromNow(12)
    },
    {
      title: 'Add CSV export for analytics',
      project_id: p1.id, assignee_id: marcusId, created_by: sarahId,
      status: 'todo', priority: 'low', energy_type: 'shallow_work',
      effort_estimate: 4, due_date: daysFromNow(15)
    },
    {
      title: 'Security audit — OWASP checklist',
      project_id: p1.id, assignee_id: alexId, created_by: alexId,
      status: 'review', priority: 'critical', energy_type: 'deep_work',
      effort_estimate: 12, due_date: daysFromNow(3),
      started_at: daysAgo(5)
    },
    {
      title: 'Fix memory leak in graph renderer',
      project_id: p1.id, assignee_id: sarahId, created_by: sarahId,
      status: 'blocked', priority: 'high', energy_type: 'deep_work',
      effort_estimate: 6, due_date: daysFromNow(6),
      started_at: daysAgo(4)
    },
    // OVERDUE — drives up risk score
    {
      title: 'Migrate legacy user data',
      project_id: p1.id, assignee_id: priyaId, created_by: alexId,
      status: 'todo', priority: 'critical', energy_type: 'deep_work',
      effort_estimate: 14, due_date: daysAgo(2)  // overdue
    },
    {
      title: 'Load testing — 10k concurrent users',
      project_id: p1.id, assignee_id: marcusId, created_by: alexId,
      status: 'todo', priority: 'high', energy_type: 'deep_work',
      effort_estimate: 8, due_date: daysAgo(1)   // overdue
    },
  ]).select();

  console.log(`✓ Project 1: ${doneTasks1.data.length} done + ${activeTasks1.length} active tasks`);

  // ── 5. TASKS — Project 2: Mobile App ─────────────────────────────────────
  const { data: doneTasks2 } = await supabaseAdmin.from('tasks').insert([
    {
      title: 'Finalize app wireframes',
      project_id: p2.id, assignee_id: priyaId, created_by: alexId,
      status: 'done', priority: 'high', energy_type: 'deep_work',
      effort_estimate: 10,
      created_at: daysAgo(30), completed_at: completedAt(28, 14),
      due_date: daysAgo(27)
    },
    {
      title: 'Set up React Native project',
      project_id: p2.id, assignee_id: sarahId, created_by: alexId,
      status: 'done', priority: 'high', energy_type: 'deep_work',
      effort_estimate: 4,
      created_at: daysAgo(25), completed_at: completedAt(23, 22),
      due_date: daysAgo(22)
    },
    {
      title: 'Implement push notifications',
      project_id: p2.id, assignee_id: marcusId, created_by: alexId,
      status: 'done', priority: 'medium', energy_type: 'deep_work',
      effort_estimate: 8,
      created_at: daysAgo(18), completed_at: completedAt(15, 10),
      due_date: daysAgo(14)
    },
  ]).select();

  const { data: activeTasks2 } = await supabaseAdmin.from('tasks').insert([
    {
      title: 'Build offline sync engine',
      project_id: p2.id, assignee_id: sarahId, created_by: alexId,
      status: 'in_progress', priority: 'critical', energy_type: 'deep_work',
      effort_estimate: 24, due_date: daysFromNow(20),
      started_at: daysAgo(5)
    },
    {
      title: 'App Store submission prep',
      project_id: p2.id, assignee_id: priyaId, created_by: alexId,
      status: 'todo', priority: 'high', energy_type: 'shallow_work',
      effort_estimate: 6, due_date: daysFromNow(35)
    },
    {
      title: 'QA — iOS device matrix testing',
      project_id: p2.id, assignee_id: marcusId, created_by: alexId,
      status: 'todo', priority: 'high', energy_type: 'shallow_work',
      effort_estimate: 12, due_date: daysFromNow(30)
    },
    {
      title: 'Analytics SDK integration',
      project_id: p2.id, assignee_id: sarahId, created_by: alexId,
      status: 'todo', priority: 'medium', energy_type: 'shallow_work',
      effort_estimate: 4, due_date: daysFromNow(25)
    },
    {
      title: 'Beta user onboarding flow',
      project_id: p2.id, assignee_id: priyaId, created_by: alexId,
      status: 'review', priority: 'high', energy_type: 'deep_work',
      effort_estimate: 8, due_date: daysFromNow(15),
      started_at: daysAgo(3)
    },
  ]).select();

  console.log(`✓ Project 2: ${(doneTasks2 || []).length} done + ${(activeTasks2 || []).length} active tasks`);

  // ── 6. TASKS — Project 3: API Refactor ───────────────────────────────────
  const { data: activeTasks3 } = await supabaseAdmin.from('tasks').insert([
    {
      title: 'Profile all API endpoints',
      project_id: p3.id, assignee_id: sarahId, created_by: sarahId,
      status: 'done', priority: 'high', energy_type: 'deep_work',
      effort_estimate: 6,
      created_at: daysAgo(15), completed_at: completedAt(13, 23),
      due_date: daysAgo(12)
    },
    {
      title: 'Add Redis caching layer',
      project_id: p3.id, assignee_id: marcusId, created_by: sarahId,
      status: 'in_progress', priority: 'high', energy_type: 'deep_work',
      effort_estimate: 16, due_date: daysFromNow(40),
      started_at: daysAgo(8)
    },
    {
      title: 'Optimize database indexes',
      project_id: p3.id, assignee_id: sarahId, created_by: sarahId,
      status: 'todo', priority: 'medium', energy_type: 'deep_work',
      effort_estimate: 8, due_date: daysFromNow(50)
    },
    {
      title: 'Replace ORM with raw SQL for hot paths',
      project_id: p3.id, assignee_id: marcusId, created_by: sarahId,
      status: 'todo', priority: 'medium', energy_type: 'deep_work',
      effort_estimate: 20, due_date: daysFromNow(55)
    },
  ]).select();

  console.log(`✓ Project 3: 1 done + ${activeTasks3.length - 1} active tasks`);

  // ── 7. TASK DEPENDENCIES ──────────────────────────────────────────────────
  console.log('Creating task dependencies...');

  const t = activeTasks1;
  // "Fix memory leak" is blocked by "Build real-time notification system"
  const notifTask = t.find(x => x.title.includes('real-time notification'));
  const memLeakTask = t.find(x => x.title.includes('memory leak'));
  const integTestTask = t.find(x => x.title.includes('integration tests'));
  const bulkActionsTask = t.find(x => x.title.includes('bulk actions'));
  const csvTask = t.find(x => x.title.includes('CSV export'));
  const migrationTask = t.find(x => x.title.includes('Migrate legacy'));

  const redisTask = activeTasks3.find(x => x.title.includes('Redis'));
  const indexTask = activeTasks3.find(x => x.title.includes('indexes'));
  const ormTask = activeTasks3.find(x => x.title.includes('ORM'));

  const deps = [];

  if (notifTask && memLeakTask)
    deps.push({ project_id: p1.id, task_id: memLeakTask.id, depends_on_task_id: notifTask.id });
  if (integTestTask && notifTask)
    deps.push({ project_id: p1.id, task_id: integTestTask.id, depends_on_task_id: notifTask.id });
  if (bulkActionsTask && integTestTask)
    deps.push({ project_id: p1.id, task_id: bulkActionsTask.id, depends_on_task_id: integTestTask.id });
  if (csvTask && bulkActionsTask)
    deps.push({ project_id: p1.id, task_id: csvTask.id, depends_on_task_id: bulkActionsTask.id });
  if (migrationTask && integTestTask)
    deps.push({ project_id: p1.id, task_id: migrationTask.id, depends_on_task_id: integTestTask.id });

  // Project 3 chain
  if (redisTask && indexTask)
    deps.push({ project_id: p3.id, task_id: ormTask.id, depends_on_task_id: redisTask.id });
  if (indexTask && ormTask)
    deps.push({ project_id: p3.id, task_id: indexTask.id, depends_on_task_id: redisTask.id });

  if (deps.length > 0) {
    await supabaseAdmin.from('task_dependencies').insert(deps);
  }
  console.log(`✓ ${deps.length} task dependencies created`);

  // ── 8. ACTIVITY LOGS ──────────────────────────────────────────────────────
  console.log('Creating activity logs...');

  await supabaseAdmin.from('activity_logs').insert([
    { project_id: p1.id, user_id: alexId,   action: 'project_created',  metadata: { name: 'NeuroFlow v2.0' },          created_at: daysAgo(30) },
    { project_id: p1.id, user_id: alexId,   action: 'member_added',     metadata: { userId: sarahId },                 created_at: daysAgo(29) },
    { project_id: p1.id, user_id: alexId,   action: 'member_added',     metadata: { userId: marcusId },                created_at: daysAgo(29) },
    { project_id: p1.id, user_id: alexId,   action: 'member_added',     metadata: { userId: priyaId },                 created_at: daysAgo(29) },
    { project_id: p1.id, user_id: sarahId,  action: 'task_created',     metadata: { title: 'Design wireframes' },      created_at: daysAgo(28) },
    { project_id: p1.id, user_id: sarahId,  action: 'task_updated',     metadata: { changes: ['status'] },            created_at: daysAgo(26) },
    { project_id: p1.id, user_id: marcusId, action: 'task_updated',     metadata: { changes: ['status'] },            created_at: daysAgo(24) },
    { project_id: p1.id, user_id: priyaId,  action: 'task_updated',     metadata: { changes: ['status'] },            created_at: daysAgo(15) },
    { project_id: p1.id, user_id: sarahId,  action: 'time_logged',      metadata: { minutes: 120 },                   created_at: daysAgo(10) },
    { project_id: p1.id, user_id: alexId,   action: 'project_updated',  metadata: { changes: ['status'] },            created_at: daysAgo(7)  },
    { project_id: p1.id, user_id: marcusId, action: 'task_created',     metadata: { title: 'Integration tests' },     created_at: daysAgo(5)  },
    { project_id: p1.id, user_id: sarahId,  action: 'task_updated',     metadata: { changes: ['status', 'priority'] }, created_at: daysAgo(3) },
    { project_id: p2.id, user_id: alexId,   action: 'project_created',  metadata: { name: 'Mobile App Launch' },      created_at: daysAgo(32) },
    { project_id: p2.id, user_id: priyaId,  action: 'task_updated',     metadata: { changes: ['status'] },            created_at: daysAgo(28) },
    { project_id: p2.id, user_id: sarahId,  action: 'time_logged',      metadata: { minutes: 240 },                   created_at: daysAgo(5)  },
    { project_id: p3.id, user_id: sarahId,  action: 'project_created',  metadata: { name: 'API Refactor' },           created_at: daysAgo(20) },
    { project_id: p3.id, user_id: marcusId, action: 'task_updated',     metadata: { changes: ['status'] },            created_at: daysAgo(8)  },
  ]);
  console.log('✓ Activity logs created');

  // ── 9. PRODUCTIVITY METRICS (historical cache) ────────────────────────────
  console.log('Creating productivity metrics...');

  const metricRows = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Sarah: peaks at night (22-24), fast
    metricRows.push({
      user_id: sarahId,
      project_id: p1.id,
      metric_date: dateStr,
      tasks_completed: i % 3 === 0 ? 2 : i % 5 === 0 ? 3 : 1,
      avg_speed_ratio: 0.78,
      delay_rate: 12,
      focus_sessions: 2,
      peak_hour_start: 22,
      peak_hour_end: 24
    });

    // Marcus: peaks in morning (9-11), very consistent
    metricRows.push({
      user_id: marcusId,
      project_id: p1.id,
      metric_date: dateStr,
      tasks_completed: i % 4 === 0 ? 2 : 1,
      avg_speed_ratio: 0.95,
      delay_rate: 8,
      focus_sessions: 3,
      peak_hour_start: 9,
      peak_hour_end: 11
    });

    // Alex: peaks in morning (8-10), strategic worker
    metricRows.push({
      user_id: alexId,
      project_id: p1.id,
      metric_date: dateStr,
      tasks_completed: i % 5 === 0 ? 2 : i % 7 === 0 ? 0 : 1,
      avg_speed_ratio: 0.90,
      delay_rate: 15,
      focus_sessions: 2,
      peak_hour_start: 8,
      peak_hour_end: 11
    });

    // Priya: peaks late (23), last-minute pattern
    metricRows.push({
      user_id: priyaId,
      project_id: p1.id,
      metric_date: dateStr,
      tasks_completed: i % 6 === 0 ? 2 : i % 8 === 0 ? 0 : 1,
      avg_speed_ratio: 1.35,
      delay_rate: 45,
      focus_sessions: 1,
      peak_hour_start: 23,
      peak_hour_end: 24
    });
  }

  // Insert in batches of 50
  for (let i = 0; i < metricRows.length; i += 50) {
    await supabaseAdmin.from('productivity_metrics').insert(metricRows.slice(i, i + 50));
  }
  console.log('✓ Productivity metrics created (30-day history per user)');

  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('LOGIN CREDENTIALS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Role      Email                    Password');
  console.log('──────────────────────────────────────────────');
  console.log('Admin     alex@neuroflow.dev       Password@123');
  console.log('Member    sarah@neuroflow.dev      Password@123  (Fast Worker, night owl)');
  console.log('Member    marcus@neuroflow.dev     Password@123  (Consistent Worker, morning)');
  console.log('Member    priya@neuroflow.dev      Password@123  (Last-Minute Worker)');
  console.log('Observer  jordan@neuroflow.dev     Password@123  (Read-only)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

seed().catch(err => {
  console.error('\n❌ Seed failed:', err.message);
  process.exit(1);
});
