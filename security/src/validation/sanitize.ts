const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

const DANGEROUS_PATTERN = /<script|<iframe|<img|javascript:|onerror|onclick/gi;

export function escapeHtml(value: string): string {
  return value.replace(/[&<>\"'\/]/g, (char) => HTML_ENTITIES[char] || char);
}

export function sanitizeInput(input: string): string {
  return escapeHtml(input).replace(DANGEROUS_PATTERN, '');
}

export function sanitizeObject(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeInput(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeObject);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce(
      (acc, [key, nested]) => {
        acc[key] = sanitizeObject(nested);
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }

  return value;
}

export function sanitizeQueryParams(req: any, _res: any, next: any) {
  req.query = sanitizeObject(req.query);
  next();
}
