import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createNestTestApp } from './nest-test-app';

describe('BFF (NestJS unified entry)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createNestTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health', () => {
    it('GET /health/live returns liveness', async () => {
      const response = await request(app.getHttpServer()).get('/health/live');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'alive' });
    });
  });

  describe('Auth PKCE', () => {
    it('POST /api/auth/initiate starts PKCE for allowed user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/initiate')
        .send({ email: 'test@example.com', provider: 'local' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ provider: 'local' });
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.codeChallenge).toBeDefined();
      expect(response.body.state).toBeDefined();
    });

    it('POST /api/auth/initiate rejects unknown user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/initiate')
        .send({ email: 'unknown@example.com', provider: 'local' });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('USER_NOT_FOUND');
    });

    it('POST /api/auth/exchange returns tokens', async () => {
      const initiate = await request(app.getHttpServer())
        .post('/api/auth/initiate')
        .send({ email: 'test@example.com', provider: 'local' });

      const { sessionId, state, codeVerifier } = initiate.body;

      const exchange = await request(app.getHttpServer())
        .post('/api/auth/exchange')
        .send({ sessionId, state, codeVerifier });

      expect(exchange.status).toBe(200);
      expect(exchange.body.accessToken).toBeDefined();
      expect(exchange.body.refreshToken).toBeDefined();
      expect(exchange.body.user).toMatchObject({ email: 'test@example.com' });
    });

    it('GET /api/auth/me requires authentication', async () => {
      const response = await request(app.getHttpServer()).get('/api/auth/me');
      expect(response.status).toBe(401);
    });

    it('GET /api/auth/me returns user when Bearer token provided', async () => {
      const initiate = await request(app.getHttpServer())
        .post('/api/auth/initiate')
        .send({ email: 'test@example.com', provider: 'local' });

      const { sessionId, state, codeVerifier } = initiate.body;

      const exchange = await request(app.getHttpServer())
        .post('/api/auth/exchange')
        .send({ sessionId, state, codeVerifier });

      const me = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${exchange.body.accessToken}`);

      expect(me.status).toBe(200);
      expect(me.body.email).toBe('test@example.com');
    });
  });
});
