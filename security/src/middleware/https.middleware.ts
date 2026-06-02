export function enforceHttps(req: any, res: any, next: any) {
  const isSecure = req.secure || req.get('x-forwarded-proto') === 'https';

  if (!isSecure && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
  }

  next();
}

export function strictTransportSecurity(req: any, res: any, next: any) {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  next();
}
