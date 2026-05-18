const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/rbac.middleware');
const { supabaseAdmin } = require('../../config/supabase');
const { success, created } = require('../../utils/response');
const { memberSchema } = require('../../utils/validators');
const { logActivity } = require('../projects/projects.service');

router.use(authenticate);

router.get('/', requirePermission('members', 'read'), async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('project_members')
      .select('role, joined_at, users(id, name, email, avatar_url, role)')
      .eq('project_id', req.params.projectId);

    if (error) throw new Error(error.message);
    success(res, data || []);
  } catch (err) { next(err); }
});

router.post('/', requirePermission('members', 'create'), async (req, res, next) => {
  try {
    const body = memberSchema.parse({ ...req.body, project_id: req.params.projectId });

    // Check if user exists
    const { data: user } = await supabaseAdmin
      .from('users').select('id, name').eq('id', body.user_id).single();
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

    const { data, error } = await supabaseAdmin
      .from('project_members')
      .upsert({ project_id: req.params.projectId, user_id: body.user_id, role: body.role })
      .select()
      .single();

    if (error) throw new Error(error.message);
    await logActivity(req.params.projectId, req.user.id, 'member_added', { userId: body.user_id });
    created(res, data, 'Member added');
  } catch (err) { next(err); }
});

router.patch('/:memberId', requirePermission('members', 'update'), async (req, res, next) => {
  try {
    const { role } = memberSchema.pick({ role: true }).parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('project_members')
      .update({ role })
      .eq('project_id', req.params.projectId)
      .eq('user_id', req.params.memberId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    success(res, data, 'Member role updated');
  } catch (err) { next(err); }
});

router.delete('/:memberId', requirePermission('members', 'delete'), async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('project_members')
      .delete()
      .eq('project_id', req.params.projectId)
      .eq('user_id', req.params.memberId);

    if (error) throw new Error(error.message);
    success(res, null, 'Member removed');
  } catch (err) { next(err); }
});

// Search users to add
router.get('/search/users', requirePermission('members', 'create'), async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return success(res, []);

    const { data } = await supabaseAdmin
      .from('users')
      .select('id, name, email, avatar_url')
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(10);

    success(res, data || []);
  } catch (err) { next(err); }
});

module.exports = router;
