import { loadEnvironment } from './env';

describe('Host shell environment loader', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads required public environment variables', () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_HOST_URL = 'http://localhost:3002';
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3000/api';
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api';
    process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:8080';
    process.env.NEXT_PUBLIC_DEBUG = 'true';

    const env = loadEnvironment();

    expect(env.NODE_ENV).toBe('development');
    expect(env.NEXT_PUBLIC_HOST_URL).toBe('http://localhost:3002');
    expect(env.NEXT_PUBLIC_API_BASE_URL).toBe('http://localhost:3000/api');
    expect(env.NEXT_PUBLIC_API_URL).toBe('http://localhost:3000/api');
    expect(env.NEXT_PUBLIC_WS_URL).toBe('ws://localhost:8080');
    expect(env.NEXT_PUBLIC_DEBUG).toBe(true);
  });

  it('throws when a required variable is missing', () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_HOST_URL = 'http://localhost:3002';

    expect(() => loadEnvironment()).toThrow('Missing required environment variable');
  });
});
