import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';
import { hashPassword } from '../../lib/password';

// Mock Prisma
vi.mock('../../lib/prisma', () => {
  const mockGym = {
    id: 'gym-uuid-101',
    name: 'Main Fitness Center',
    slug: 'gym-001',
    code: 'GYM-001',
    qrSecret: 'qr-secret-123',
    isActive: true,
  };

  const mockUsers: any[] = [];

  return {
    prisma: {
      gym: {
        findUnique: vi.fn(async ({ where }) => {
          if (where.code === 'GYM-001' || where.code === 'VALID_GYM') return mockGym;
          return null;
        }),
        create: vi.fn(async ({ data }) => ({
          id: 'gym-uuid-101',
          ...data,
        })),
      },
      user: {
        findFirst: vi.fn(async ({ where }) => {
          if (!where) return null;
          return mockUsers.find((u) => {
            const matchesGym = !where.gymId || u.gymId === where.gymId;
            if (where.OR) {
              const matchesOR = where.OR.some(
                (cond: any) =>
                  (cond.email && u.email === cond.email) ||
                  (cond.phone && u.phone === cond.phone)
              );
              return matchesGym && matchesOR;
            }
            return matchesGym;
          }) || null;
        }),
        findUnique: vi.fn(async ({ where }) => {
          return mockUsers.find((u) => u.id === where.id) || null;
        }),
        create: vi.fn(async ({ data }) => {
          const created = {
            id: `usr-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            currentStreak: 0,
            longestStreak: 0,
            starScore: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          mockUsers.push(created);
          return created;
        }),
      },
      __mockUsers: mockUsers,
    },
  };
});

describe('Backend DLD Module 01 - Authentication & Account Registration', () => {
  beforeEach(() => {
    // Reset mock database array
    (prisma as any).__mockUsers.length = 0;
  });

  describe('Validation & Payload Security', () => {
    it('should reject registration if email format is invalid', async () => {
      const res = await request(app).post('/api/auth/register').send({
        token: 'gym-qr-reg-secret-2026',
        gymCode: 'GYM-001',
        name: 'John Doe',
        email: 'invalid-email-address',
        phone: '9876543210',
        password: 'Password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: any) => d.field === 'email')).toBe(true);
    });

    it('should reject registration if mobile number is not 10 digits', async () => {
      const res = await request(app).post('/api/auth/register').send({
        token: 'gym-qr-reg-secret-2026',
        gymCode: 'GYM-001',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '12345',
        password: 'Password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details.some((d: any) => d.field === 'phone')).toBe(true);
    });

    it('should reject registration if password lacks required complexity', async () => {
      const res = await request(app).post('/api/auth/register').send({
        token: 'gym-qr-reg-secret-2026',
        gymCode: 'GYM-001',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '9876543210',
        password: 'simplepassword',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details.some((d: any) => d.field === 'password')).toBe(true);
    });
  });

  describe('AUTH-001: Member Self-Registration via QR Code', () => {
    it('should register a new member successfully with valid QR token', async () => {
      const res = await request(app).post('/api/auth/register').send({
        token: 'gym-qr-reg-secret-2026',
        gymCode: 'GYM-001',
        name: 'Alex Rivera',
        email: 'alex.rivera@example.com',
        phone: '9876543210',
        password: 'SecurePassword123',
        fitnessGoal: 'Muscle Gain',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('alex.rivera@example.com');
      expect(res.body.data.user.role).toBe('MEMBER');
      expect(res.body.data.user.status).toBe('PENDING_MEMBERSHIP');
      expect(res.body.data.redirectTo).toBe('/user/membership/select');

      // Check cookie header
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('session_token=');
    });

    it('should reject registration if email is already registered in the gym', async () => {
      // Seed existing user
      const hashed = await hashPassword('SecurePassword123');
      (prisma as any).__mockUsers.push({
        id: 'usr-existing-1',
        gymId: 'gym-uuid-101',
        email: 'alex.rivera@example.com',
        phone: '9999999999',
        name: 'Alex Existing',
        passwordHash: hashed,
        role: 'MEMBER',
        status: 'ACTIVE',
      });

      const res = await request(app).post('/api/auth/register').send({
        token: 'gym-qr-reg-secret-2026',
        gymCode: 'GYM-001',
        name: 'Alex Rivera Duplicate',
        email: 'alex.rivera@example.com',
        phone: '8888888888',
        password: 'SecurePassword123',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Account already exists with this email address');
    });
  });

  describe('AUTH-002: Login & Session Verification', () => {
    beforeEach(async () => {
      const hashed = await hashPassword('CorrectPassword123');
      (prisma as any).__mockUsers.push({
        id: 'usr-member-100',
        gymId: 'gym-uuid-101',
        gym: { code: 'GYM-001' },
        email: 'member@gym.com',
        phone: '9876543210',
        name: 'Active Member',
        passwordHash: hashed,
        role: 'MEMBER',
        status: 'ACTIVE',
        currentStreak: 5,
        longestStreak: 10,
        starScore: 12,
      });

      (prisma as any).__mockUsers.push({
        id: 'usr-admin-100',
        gymId: 'gym-uuid-101',
        gym: { code: 'GYM-001' },
        email: 'admin@gym.com',
        phone: '9123456789',
        name: 'Gym Administrator',
        passwordHash: hashed,
        role: 'GYM_ADMIN',
        status: 'ACTIVE',
        currentStreak: 0,
        longestStreak: 0,
        starScore: 0,
      });
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        identifier: 'member@gym.com',
        password: 'WrongPassword123',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email/phone or password');
    });

    it('should log in a member successfully and direct to /user/dashboard', async () => {
      const res = await request(app).post('/api/auth/login').send({
        identifier: 'member@gym.com',
        password: 'CorrectPassword123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('member@gym.com');
      expect(res.body.data.user.role).toBe('MEMBER');
      expect(res.body.data.redirectTo).toBe('/user/dashboard');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should log in an admin successfully and direct to /admin/dashboard', async () => {
      const res = await request(app).post('/api/auth/login').send({
        identifier: 'admin@gym.com',
        password: 'CorrectPassword123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('GYM_ADMIN');
      expect(res.body.data.redirectTo).toBe('/admin/dashboard');
    });

    it('should verify authenticated session profile via /api/auth/me including active membership status', async () => {
      // First login to get session cookie
      const loginRes = await request(app).post('/api/auth/login').send({
        identifier: 'member@gym.com',
        password: 'CorrectPassword123',
      });

      const cookie = loginRes.headers['set-cookie'][0];

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [cookie]);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.user.id).toBe('usr-member-100');
      expect(meRes.body.data.user.name).toBe('Active Member');
      expect(meRes.body.data.user.hasActiveMembership).toBeDefined();
    });

    it('should verify registration onboarding QR token via /api/auth/verify-token', async () => {
      const res = await request(app)
        .get('/api/auth/verify-token?token=gym-qr-reg-secret-2026&gymCode=GYM-001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.gym).toBeDefined();
      expect(res.body.data.gym.code).toBe('GYM-001');
    });

    it('should resolve public gym tenant by code via /api/auth/gyms/:code', async () => {
      const res = await request(app).get('/api/auth/gyms/GYM-001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.gym.name).toBe('Main Fitness Center');
      expect(res.body.data.gym.code).toBe('GYM-001');
    });

    it('should logout cleanly and clear session cookie', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged out successfully');
    });
  });
});
