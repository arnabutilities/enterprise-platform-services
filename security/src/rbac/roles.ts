export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
  VIEWER = 'viewer',
  API = 'api',
}

export enum Permission {
  DASHBOARD_CREATE = 'dashboard:create',
  DASHBOARD_READ = 'dashboard:read',
  DASHBOARD_UPDATE = 'dashboard:update',
  DASHBOARD_DELETE = 'dashboard:delete',
  DASHBOARD_SHARE = 'dashboard:share',
  REPORT_CREATE = 'report:create',
  REPORT_READ = 'report:read',
  REPORT_UPDATE = 'report:update',
  REPORT_DELETE = 'report:delete',
  REPORT_SCHEDULE = 'report:schedule',
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_EXPORT = 'analytics:export',
  ANALYTICS_QUERY = 'analytics:query',
  USER_MANAGE = 'user:manage',
  ROLE_MANAGE = 'role:manage',
  SYSTEM_ADMIN = 'system:admin',
}

export const RolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission),
  [Role.MANAGER]: [
    Permission.DASHBOARD_READ,
    Permission.DASHBOARD_CREATE,
    Permission.DASHBOARD_UPDATE,
    Permission.DASHBOARD_SHARE,
    Permission.REPORT_READ,
    Permission.REPORT_CREATE,
    Permission.REPORT_UPDATE,
    Permission.REPORT_SCHEDULE,
    Permission.ANALYTICS_READ,
    Permission.ANALYTICS_EXPORT,
    Permission.ANALYTICS_QUERY,
    Permission.USER_MANAGE,
  ],
  [Role.USER]: [
    Permission.DASHBOARD_READ,
    Permission.DASHBOARD_CREATE,
    Permission.DASHBOARD_UPDATE,
    Permission.REPORT_READ,
    Permission.REPORT_CREATE,
    Permission.REPORT_UPDATE,
    Permission.ANALYTICS_READ,
    Permission.ANALYTICS_EXPORT,
  ],
  [Role.VIEWER]: [Permission.DASHBOARD_READ, Permission.REPORT_READ, Permission.ANALYTICS_READ],
  [Role.API]: [Permission.ANALYTICS_QUERY, Permission.ANALYTICS_READ, Permission.REPORT_READ],
};

export function hasPermission(role: Role, permission: Permission) {
  return RolePermissions[role].includes(permission);
}

export function hasAnyPermission(role: Role, permissions: Permission[]) {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function hasAllPermissions(role: Role, permissions: Permission[]) {
  return permissions.every((permission) => hasPermission(role, permission));
}
