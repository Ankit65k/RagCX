import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../../src/app.js';
import { clearDatabase, seedUser } from '../test.helper.js';

describe('Authentication API Integration Tests', () => {
  const rawPassword = 'SecureP@ss1234';
  let passwordHash: string;

  beforeEach(async () => {
    await clearDatabase();
    passwordHash = await bcrypt.hash(rawPassword, 12);
  });

  afterAll(async () => {
    await clearDatabase();
  });

  it('should return 400 Bad Request on login with invalid format inputs', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'bad-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should authenticate user and return 200 OK with cookies on valid login', async () => {
    const user = await seedUser({ passwordHash });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: rawPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();

    // Check cookies written successfully
    const cookies = res.headers['set-cookie'] as string[];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('access_token'))).toBe(true);
    expect(cookies.some((c) => c.includes('refresh_token'))).toBe(true);
  });

  it('should return 401 Unauthorized for /me when unauthenticated', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('should return 200 OK for /me when providing valid bearer token', async () => {
    const user = await seedUser({ passwordHash });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: rawPassword });

    const accessToken = loginRes.body.data.tokens.accessToken;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(user.email);
  });
});
