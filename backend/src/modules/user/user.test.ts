import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';
import { signSessionToken } from '../../lib/jwt';
import { formatPrivacyName } from './user.service';

// Mock Users Store
const mockGymA = { id: 'gym-A-101', name: 'Alpha Gym', code: 'GYM-A', slug: 'gym-a' };
const mockGymB = { id: 'gym-B-202', name: 'Beta Gym', code: 'GYM-B', slug: 'gym-b' };

const mockUsers: any[] = [];

vi.mock('../../lib/prisma', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(async ({ where }) => {
          return mockUsers.find((u) => u.id === where.id) || null;
        }),
        findMany: vi.fn(async ({ where, select, orderBy }) => {
          let results = mockUsers.filter((u) => {
            if (where?.gymId && u.gymId !== where.gymId) return false;
            return true;
          });

          if (orderBy && Array.isArray(orderBy)) {
            results.sort((a, b) => {
              for (const order of orderBy) {
                const key = Object.keys(order)[0];
                const dir = order[key];
                if (a[key] !== b[key]) {
                  return dir === 'desc' ? b[key] - a[key] : a[key] - b[key];
                }
              }
              return 0;
            });
          }

          if (select) {
            return results.map((u) => {
              const projected: any = {};
              if (select.id) projected.id = u.id;
              if (select.name) projected.name = u.name;
              if (select.profilePicUrl !== undefined) projected.profilePicUrl = u.profilePicUrl;
              if (select.currentStreak !== undefined) projected.currentStreak = u.currentStreak;
              if (select.starScore !== undefined) projected.starScore = u.starScore;
              return projected;
            });
          }

          return results;
        }),
        update: vi.fn(async ({ where, data }) => {
          const index = mockUsers.findIndex((u) => u.id === where.id);
          if (index === -1) throw new Error('User not found');
          mockUsers[index] = { ...mockUsers[index], ...data, updatedAt: new Date() };
          return mockUsers[index];
        }),
      },
    },
  };
});

describe('Backend DLD Module 02 - User & Member Profile', () => {
  let tokenGymA: string;
  let tokenGymB: string;

  beforeEach(() => {
    mockUsers.length = 0;

    // Seed Gym A User
    const userA = {
      id: 'usr-gym-A-1',
      gymId: mockGymA.id,
      gym: mockGymA,
      email: 'alex.rivera@gymA.com',
      phone: '9876543210',
      name: 'Alex Rivera',
      passwordHash: '$2a$12$hashedPasswordA',
      role: 'MEMBER',
      status: 'ACTIVE',
      fitnessGoal: 'Muscle Gain',
      profilePicUrl: 'https://example.com/avatarA.jpg',
      currentStreak: 12,
      longestStreak: 15,
      starScore: 20,
      createdAt: new Date(),
    };

    // Seed Gym B User
    const userB = {
      id: 'usr-gym-B-2',
      gymId: mockGymB.id,
      gym: mockGymB,
      email: 'samuel.jackson@gymB.com',
      phone: '9123456789',
      name: 'Samuel Jackson',
      passwordHash: '$2a$12$hashedPasswordB',
      role: 'MEMBER',
      status: 'ACTIVE',
      fitnessGoal: 'Weight Loss',
      profilePicUrl: 'https://example.com/avatarB.jpg',
      currentStreak: 25,
      longestStreak: 30,
      starScore: 40,
      createdAt: new Date(),
    };

    // Seed Gym A Secondary User
    const userA2 = {
      id: 'usr-gym-A-3',
      gymId: mockGymA.id,
      gym: mockGymA,
      email: 'carol.danvers@gymA.com',
      phone: '9888877777',
      name: 'Carol Danvers',
      passwordHash: '$2a$12$hashedPasswordA2',
      role: 'MEMBER',
      status: 'ACTIVE',
      currentStreak: 8,
      longestStreak: 10,
      starScore: 10,
      createdAt: new Date(),
    };

    mockUsers.push(userA, userB, userA2);

    tokenGymA = signSessionToken({
      userId: userA.id,
      gymId: userA.gymId,
      role: userA.role as any,
      email: userA.email,
    });

    tokenGymB = signSessionToken({
      userId: userB.id,
      gymId: userB.gymId,
      role: userB.role as any,
      email: userB.email,
    });
  });

  describe('Privacy Name Formatter Helper', () => {
    it('should format full name to FirstName + LastNameInitial', () => {
      expect(formatPrivacyName('John Doe')).toBe('John D.');
      expect(formatPrivacyName('Alex Rivera')).toBe('Alex R.');
      expect(formatPrivacyName('SingleName')).toBe('SingleName');
      expect(formatPrivacyName('Mary Jane Smith')).toBe('Mary S.');
    });
  });

  describe('Personal Profile (GET /api/user/profile)', () => {
    it('USER-002-001: Authenticated member can retrieve own profile', async () => {
      const res = await request(app)
        .get('/api/user/profile')
        .set('Cookie', [`session_token=${tokenGymA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.id).toBe('usr-gym-A-1');
      expect(res.body.data.profile.email).toBe('alex.rivera@gymA.com');
      expect(res.body.data.profile.fitnessGoal).toBe('Muscle Gain');
    });

    it('USER-002-002: Unauthenticated request is rejected with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/user/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('USER-002-003 & USER-002-004: Response does NOT expose passwordHash or sensitive credentials', async () => {
      const res = await request(app)
        .get('/api/user/profile')
        .set('Cookie', [`session_token=${tokenGymA}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.profile.passwordHash).toBeUndefined();
    });
  });

  describe('Profile Update (PATCH /api/user/profile)', () => {
    it('USER-002-005: Member can update allowed fields (name, fitnessGoal)', async () => {
      const res = await request(app)
        .patch('/api/user/profile')
        .set('Cookie', [`session_token=${tokenGymA}`])
        .send({
          name: 'Alex Rivera Updated',
          fitnessGoal: 'Endurance Shredding',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.name).toBe('Alex Rivera Updated');
      expect(res.body.data.profile.fitnessGoal).toBe('Endurance Shredding');
    });

    it('USER-002-006 & Section 23: Mass assignment protection rejects protected fields (gymId, role, status)', async () => {
      const res = await request(app)
        .patch('/api/user/profile')
        .set('Cookie', [`session_token=${tokenGymA}`])
        .send({
          name: 'Alex Hack',
          gymId: 'gym-B-202', // Malicious attempt to switch gym tenant
          role: 'ADMIN',      // Malicious attempt to escalate privileges
          status: 'SUSPENDED',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');

      // Verify DB record was unchanged
      const targetUser = mockUsers.find((u) => u.id === 'usr-gym-A-1');
      expect(targetUser.gymId).toBe('gym-A-101');
      expect(targetUser.role).toBe('MEMBER');
    });

    it('USER-002-007: Member updates ONLY their own session profile (IDOR Protection)', async () => {
      // User A makes request with their token
      await request(app)
        .patch('/api/user/profile')
        .set('Cookie', [`session_token=${tokenGymA}`])
        .send({
          name: 'Alex Self Edit',
        });

      // User B should remain untouched
      const userB = mockUsers.find((u) => u.id === 'usr-gym-B-2');
      expect(userB.name).toBe('Samuel Jackson');
    });
  });

  describe('Community Leaderboard & Tenant Isolation (GET /api/user/community)', () => {
    it('MEMBER-001-001: Authenticated member can retrieve community data', async () => {
      const res = await request(app)
        .get('/api/user/community')
        .set('Cookie', [`session_token=${tokenGymA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.leaderboard)).toBe(true);
    });

    it('MEMBER-001-002: Unauthenticated request is rejected', async () => {
      const res = await request(app).get('/api/user/community');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('MEMBER-001-003 & MEMBER-001-004 & Section 22: Tenant isolation - Gym A member sees ONLY Gym A members', async () => {
      const resA = await request(app)
        .get('/api/user/community')
        .set('Cookie', [`session_token=${tokenGymA}`]);

      expect(resA.status).toBe(200);
      const leaderboardA = resA.body.data.leaderboard;

      // Should contain Alex R. and Carol D. from Gym A, but NOT Samuel J. from Gym B
      expect(leaderboardA.length).toBe(2);
      expect(leaderboardA.some((m: any) => m.id === 'usr-gym-A-1')).toBe(true);
      expect(leaderboardA.some((m: any) => m.id === 'usr-gym-A-3')).toBe(true);
      expect(leaderboardA.some((m: any) => m.id === 'usr-gym-B-2')).toBe(false);

      // Now query as Gym B user
      const resB = await request(app)
        .get('/api/user/community')
        .set('Cookie', [`session_token=${tokenGymB}`]);

      const leaderboardB = resB.body.data.leaderboard;
      expect(leaderboardB.length).toBe(1);
      expect(leaderboardB[0].id).toBe('usr-gym-B-2');
    });

    it('MEMBER-001-005 to MEMBER-001-009 & BR-PRIVACY-001: Privacy projection scrubs email, phone, password, and formats surname', async () => {
      const res = await request(app)
        .get('/api/user/community')
        .set('Cookie', [`session_token=${tokenGymA}`]);

      const member = res.body.data.leaderboard[0];

      // Privacy projections
      expect(member.email).toBeUndefined();
      expect(member.phone).toBeUndefined();
      expect(member.passwordHash).toBeUndefined();
      expect(member.status).toBeUndefined();

      // Transformed Privacy Name
      expect(member.name).toBe('Alex R.');
    });

    it('MEMBER-001-010: Results ordered by currentStreak DESC', async () => {
      const res = await request(app)
        .get('/api/user/community')
        .set('Cookie', [`session_token=${tokenGymA}`]);

      const leaderboard = res.body.data.leaderboard;
      // Alex Rivera has streak 12, Carol Danvers has streak 8
      expect(leaderboard[0].id).toBe('usr-gym-A-1');
      expect(leaderboard[1].id).toBe('usr-gym-A-3');
    });
  });
});
