export interface AuditLog {
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  method: string;
  statusCode: number;
  ipAddress: string;
  userAgent: string;
}

export function auditMiddleware(req: any, res: any, next: any) {
  const auth = req.auth;
  const originalSend = res.send;

  res.send = function (body: any) {
    const auditLog: AuditLog = {
      timestamp: new Date().toISOString(),
      userId: auth?.userId || 'anonymous',
      action: req.method,
      resource: req.path,
      method: req.method,
      statusCode: res.statusCode,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    };

    if (res.statusCode >= 400 || req.path.startsWith('/auth')) {
      console.log('[AUDIT]', JSON.stringify(auditLog));
    }

    return originalSend.call(this, body);
  };

  next();
}
