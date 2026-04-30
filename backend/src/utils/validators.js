const { z } = require('zod');

const projectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  deadline: z.string().datetime().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed']).optional()
});

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  project_id: z.string().uuid(),
  assignee_id: z.string().uuid().nullable().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  energy_type: z.enum(['deep_work', 'shallow_work']).optional(),
  effort_estimate: z.number().min(0).max(500).optional(),
  due_date: z.string().datetime().optional().nullable(),
  status: z.enum(['todo', 'in_progress', 'review', 'done', 'blocked']).optional()
});

const memberSchema = z.object({
  user_id: z.string().uuid(),
  project_id: z.string().uuid(),
  role: z.enum(['admin', 'member', 'observer'])
});

const timeLogSchema = z.object({
  task_id: z.string().uuid(),
  minutes: z.number().min(1).max(1440),
  logged_at: z.string().datetime().optional()
});

module.exports = { projectSchema, taskSchema, memberSchema, timeLogSchema };
