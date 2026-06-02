import { Permission, RolePermissions } from './roles';

export interface AuthorizedContext {
  userId: string;
  role: keyof typeof RolePermissions;
  permissions: Permission[];
}

export function authorize(context: AuthorizedContext, permission: Permission) {
  return context.permissions.includes(permission);
}

export function authorizeAny(context: AuthorizedContext, permissions: Permission[]) {
  return permissions.some((permission) => context.permissions.includes(permission));
}

export function authorizeAll(context: AuthorizedContext, permissions: Permission[]) {
  return permissions.every((permission) => context.permissions.includes(permission));
}

export async function auditAuthorizationCheck(
  userId: string,
  action: string,
  resource: string,
  allowed: boolean,
  context?: Record<string, any>,
) {
  const auditLog = {
    timestamp: new Date().toISOString(),
    userId,
    action,
    resource,
    allowed,
    context,
  };

  console.log('[AUDIT]', JSON.stringify(auditLog));
}
