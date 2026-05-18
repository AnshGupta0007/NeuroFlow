const { supabaseAdmin } = require('../config/supabase');
const { hasPermission, resolveEffectiveRole } = require('../config/permissions');

function requirePermission(resource, action) {
  return async (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthenticated' });

    let effectiveRole = user.role;

    // Check for project-level role override
    const projectId = req.params.projectId || req.body.project_id;
    if (projectId) {
      const { data: membership } = await supabaseAdmin
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

      if (membership) {
        effectiveRole = resolveEffectiveRole(user.role, membership.role);
      }
    }

    req.effectiveRole = effectiveRole;

    if (!hasPermission(effectiveRole, resource, action)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: `${resource}:${action}`,
        role: effectiveRole
      });
    }
    next();
  };
}

function requireAdmin() {
  return (req, res, next) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };
}

module.exports = { requirePermission, requireAdmin };
