import { extractToken, verifyToken } from '../auth/jwt';
import { Role, Permission } from '../rbac/roles';

export interface AuthenticatedRequest {
  userId: string;
  email: string;
  role: Role;
  permissions: Permission[];
  mfeName: string;
}

export function authMiddleware(req: any, res: any, next: any) {
  try {
    const token = extractToken(req.get('Authorization'));

    if (!token) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing authorization token' });
    }

    const decoded = verifyToken(token);

    req.auth = {
      userId: decoded.sub,
      email: decoded.email,
      role: decoded.role as Role,
      permissions: decoded.permissions as Permission[],
      mfeName: decoded.aud,
    } as AuthenticatedRequest;

    next();
  } catch (error) {
    return res.status(401).json({ code: 'INVALID_TOKEN', message: (error as Error).message });
  }
}

export function requirePermission(...permissions: Permission[]) {
  return (req: any, res: any, next: any) => {
    const auth = req.auth as AuthenticatedRequest;

    if (!auth) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const allowed = permissions.some((permission) => auth.permissions.includes(permission));

    if (!allowed) {
      return res
        .status(403)
        .json({ code: 'FORBIDDEN', message: `Required permissions: ${permissions.join(', ')}` });
    }

    next();
  };
}

export function requireRole(...roles: Role[]) {
  return (req: any, res: any, next: any) => {
    const auth = req.auth as AuthenticatedRequest;

    if (!auth) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    if (!roles.includes(auth.role)) {
      return res
        .status(403)
        .json({ code: 'FORBIDDEN', message: `Required roles: ${roles.join(', ')}` });
    }

    next();
  };
}
