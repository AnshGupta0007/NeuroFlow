// Permission matrix — maps [role][resource][action] → boolean
// Roles: admin, member, observer
// Project-level overrides are applied on top of global role permissions

const PERMISSIONS = {
  admin: {
    projects:   { create: true,  read: true,  update: true,  delete: true  },
    tasks:      { create: true,  read: true,  update: true,  delete: true  },
    members:    { create: true,  read: true,  update: true,  delete: true  },
    analytics:  { read: true  },
    intelligence: { read: true },
  },
  member: {
    projects:   { create: false, read: true,  update: true,  delete: false },
    tasks:      { create: true,  read: true,  update: true,  delete: true  },
    members:    { create: false, read: true,  update: false, delete: false },
    analytics:  { read: true  },
    intelligence: { read: true },
  },
  observer: {
    projects:   { create: false, read: true,  update: false, delete: false },
    tasks:      { create: false, read: true,  update: false, delete: false },
    members:    { create: false, read: true,  update: false, delete: false },
    analytics:  { read: true  },
    intelligence: { read: true },
  },
};

function hasPermission(role, resource, action) {
  const rolePerms = PERMISSIONS[role];
  if (!rolePerms) return false;
  const resourcePerms = rolePerms[resource];
  if (!resourcePerms) return false;
  return resourcePerms[action] === true;
}

function resolveEffectiveRole(globalRole, projectRole) {
  // Project-level role override takes precedence if explicitly set
  if (projectRole) return projectRole;
  return globalRole;
}

module.exports = { PERMISSIONS, hasPermission, resolveEffectiveRole };
