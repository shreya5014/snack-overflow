import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/prisma.js';
import { resetDatabase } from '../test-utils.js';

describe('Module 1: Authentication & RBAC Verification Tests', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Health Check', () => {
    it('returns status 200 ok for /api/health', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('POST /api/auth/login', () => {
    it('successfully logs in demo ADMIN with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@snackoverflow.local',
          password: 'AdminPass123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('admin@snackoverflow.local');
      expect(res.body.data.user.role).toBe('ADMIN');
      expect(res.body.data.token).toBeDefined();
    });

    it('successfully logs in demo MEMBER with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'member@snackoverflow.local',
          password: 'MemberPass123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('member@snackoverflow.local');
      expect(res.body.data.user.role).toBe('MEMBER');
      expect(res.body.data.token).toBeDefined();
    });

    it('returns 401 with standard error format on incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@snackoverflow.local',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    });

    it('returns 400 with VALIDATION_ERROR on malformed email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: 'SomePassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toMatch(/Invalid email address/i);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns user profile when authenticated with valid token', async () => {
      // 1. Login to get token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'member@snackoverflow.local',
          password: 'MemberPass123!',
        });
      const token = loginRes.body.data.token;

      // 2. Call /api/auth/me
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('member@snackoverflow.local');
      expect(res.body.data.name).toBe('Alex Member');
      expect(res.body.data.role).toBe('MEMBER');
    });

    it('returns 401 UNAUTHORIZED when token is missing', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token required',
        },
      });
    });

    it('returns 401 INVALID_TOKEN when token is invalid or tampered', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer forged-or-tampered-token');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token',
        },
      });
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('allows ADMIN to access admin-only protected endpoint', async () => {
      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@snackoverflow.local',
          password: 'AdminPass123!',
        });
      const adminToken = adminLogin.body.data.token;

      const res = await request(app)
        .get('/api/test-admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects MEMBER from accessing admin-only protected endpoint with 403 FORBIDDEN', async () => {
      const memberLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'member@snackoverflow.local',
          password: 'MemberPass123!',
        });
      const memberToken = memberLogin.body.data.token;

      const res = await request(app)
        .get('/api/test-admin-only')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: insufficient permissions',
        },
      });
    });
  });
});
