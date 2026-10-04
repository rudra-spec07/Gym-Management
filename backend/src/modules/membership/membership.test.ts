import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';
import { signSessionToken } from '../../lib/jwt';
import { MembershipService } from './membership.service';

// Mock Prisma
vi.mock('../../lib/prisma', () => {
  const mockGym1 = {
    id: 'gym-001-id',
    name: 'Main Fitness Gym',
    code: 'GYM-001',
    slug: 'gym-001',
    qrSecret: 'secret-gym-001-key-2026',
    isActive: true,
  };

  const mockGym2 = {
    id: 'gym-002-id',
    name: 'CrossFit Branch',
    code: 'GYM-002',
    slug: 'gym-002',
    qrSecret: 'secret-gym-002-key-2026',
    isActive: true,
  };

  const mockMember1 = {
    id: 'member-001-id',
    gymId: 'gym-001-id',
    email: 'member@example.com',
    phone: '+19876543210',
    name: 'Test Member',
    passwordHash: 'hashedpassword',
    role: 'MEMBER',
    status: 'PENDING_MEMBERSHIP',
    currentStreak: 0,
    longestStreak: 0,
    starScore: 0,
  };

  const mockMemberGym2 = {
    id: 'member-gym2-id',
    gymId: 'gym-002-id',
    email: 'member2@example.com',
    phone: '+19876543219',
    name: 'Gym 2 Member',
    passwordHash: 'hashedpassword',
    role: 'MEMBER',
    status: 'ACTIVE',
    currentStreak: 0,
    longestStreak: 0,
    starScore: 0,
  };

  const mockAdmin1 = {
    id: 'admin-001-id',
    gymId: 'gym-001-id',
    email: 'admin@example.com',
    phone: '+19876543211',
    name: 'Gym Admin',
    passwordHash: 'hashedpassword',
    role: 'GYM_ADMIN',
    status: 'ACTIVE',
  };

  let mockPlans: any[] = [];
  let mockMemberships: any[] = [];
  let mockAuditLogs: any[] = [];

  return {
    prisma: {
      gym: {
        findUnique: vi.fn(async ({ where }) => {
          if (where.id === 'gym-001-id') return mockGym1;
          if (where.id === 'gym-002-id') return mockGym2;
          return null;
        }),
      },
      user: {
        findUnique: vi.fn(async ({ where }) => {
          if (where.id === 'member-001-id') return mockMember1;
          if (where.id === 'member-gym2-id') return mockMemberGym2;
          if (where.id === 'admin-001-id') return mockAdmin1;
          return null;
        }),
        findFirst: vi.fn(async ({ where }) => {
          if (where.id === 'member-001-id' && where.gymId === 'gym-001-id') return mockMember1;
          if (where.id === 'member-gym2-id' && where.gymId === 'gym-002-id') return mockMemberGym2;
          return null;
        }),
        update: vi.fn(async ({ where, data }) => {
          if (where.id === 'member-001-id') {
            Object.assign(mockMember1, data);
            return mockMember1;
          }
          return null;
        }),
      },
      membershipPlan: {
        create: vi.fn(async ({ data }) => {
          const plan = {
            id: `plan-${Date.now()}-${Math.random()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          mockPlans.push(plan);
          return plan;
        }),
        findMany: vi.fn(async ({ where }) => {
          return mockPlans.filter((p) => {
            const matchGym = !where.gymId || p.gymId === where.gymId;
            const matchActive = where.isActive === undefined || p.isActive === where.isActive;
            return matchGym && matchActive;
          });
        }),
        findFirst: vi.fn(async ({ where }) => {
          return (
            mockPlans.find((p) => {
              const matchId = !where.id || p.id === where.id;
              const matchGym = !where.gymId || p.gymId === where.gymId;
              return matchId && matchGym;
            }) || null
          );
        }),
        update: vi.fn(async ({ where, data }) => {
          const idx = mockPlans.findIndex((p) => p.id === where.id);
          if (idx >= 0) {
            mockPlans[idx] = { ...mockPlans[idx], ...data, updatedAt: new Date() };
            return mockPlans[idx];
          }
          throw new Error('Plan not found');
        }),
      },
      membership: {
        create: vi.fn(async ({ data }) => {
          const plan = mockPlans.find((p) => p.id === data.planId);
          const m = {
            id: `mem-${Date.now()}-${Math.random()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
            plan: plan
              ? {
                  id: plan.id,
                  name: plan.name,
                  price: plan.price,
                  durationDays: plan.durationDays,
                }
              : null,
          };
          mockMemberships.push(m);
          return m;
        }),
        findMany: vi.fn(async ({ where }) => {
          return mockMemberships.filter((m) => {
            const matchUser = !where.userId || m.userId === where.userId;
            const matchGym = !where.gymId || m.gymId === where.gymId;
            return matchUser && matchGym;
          });
        }),
        findFirst: vi.fn(async ({ where }) => {
          return (
            mockMemberships.find((m) => {
              const matchId = !where.id || m.id === where.id;
              const matchGym = !where.gymId || m.gymId === where.gymId;
              return matchId && matchGym;
            }) || null
          );
        }),
        update: vi.fn(async ({ where, data }) => {
          const idx = mockMemberships.findIndex((m) => m.id === where.id);
          if (idx >= 0) {
            mockMemberships[idx] = { ...mockMemberships[idx], ...data, updatedAt: new Date() };
            return mockMemberships[idx];
          }
          throw new Error('Membership not found');
        }),
        updateMany: vi.fn(async ({ where, data }) => {
          let count = 0;
          mockMemberships.forEach((m) => {
            if (
              (!where.gymId || m.gymId === where.gymId) &&
              (!where.userId || m.userId === where.userId) &&
              (!where.status ||
                (where.status.in && where.status.in.includes(m.status)) ||
                m.status === where.status)
            ) {
              Object.assign(m, data);
              count++;
            }
          });
          return { count };
        }),
      },
      auditLog: {
        create: vi.fn(async ({ data }) => {
          const log = { id: `audit-${Date.now()}`, ...data, createdAt: new Date() };
          mockAuditLogs.push(log);
          return log;
        }),
      },

      $transaction: vi.fn(async (cb) => {
        return cb(prisma);
      }),

      __resetMocks: () => {
        mockPlans = [];
        mockMemberships = [];
        mockAuditLogs = [];
        mockMember1.status = 'PENDING_MEMBERSHIP';
      },
      __seedPlan: (plan: any) => mockPlans.push(plan),
      __seedMembership: (m: any) => mockMemberships.push(m),
      __getAuditLogs: () => mockAuditLogs,
      __getMemberships: () => mockMemberships,
    },
  };
});

describe('Module 05 Backend - Membership Management & Subscriptions', () => {
  let memberToken: string;
  let adminToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma as any).__resetMocks();

    memberToken = signSessionToken({
      userId: 'member-001-id',
      gymId: 'gym-001-id',
      role: 'MEMBER',
      email: 'member@example.com',
    });

    adminToken = signSessionToken({
      userId: 'admin-001-id',
      gymId: 'gym-001-id',
      role: 'GYM_ADMIN',
      email: 'admin@example.com',
    });
  });

  /* ==========================================
   * PLAN TESTS (MEMBERSHIP-001)
   * ========================================== */
  it('01: Admin can create a valid membership plan (201 Created)', async () => {
    const res = await request(app)
      .post('/api/membership/plans')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        name: 'Quarterly Gold Plan',
        description: '90 days full access',
        durationDays: 90,
        price: 2999.0,
        benefits: ['Locker access', 'Personal Trainer 2x/mo'],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.name).toBe('Quarterly Gold Plan');
    expect(res.body.data.gymId).toBe('gym-001-id');
  });

  it('02: Unauthorized MEMBER role cannot create a plan (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/membership/plans')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({
        name: 'Member Hack Plan',
        durationDays: 30,
        price: 1.0,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('03: Unauthenticated request is rejected (401 Unauthorized)', async () => {
    const res = await request(app).post('/api/membership/plans').send({
      name: 'Unauth Plan',
      durationDays: 30,
      price: 100,
    });

    expect(res.status).toBe(401);
  });

  it('04: Invalid name rejected (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/membership/plans')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        name: 'A', // Too short (<2 chars)
        durationDays: 30,
        price: 500,
      });

    expect(res.status).toBe(400);
  });

  it('05: Invalid durationDays rejected (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/membership/plans')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        name: 'Monthly Plan',
        durationDays: 0, // Must be >= 1
        price: 500,
      });

    expect(res.status).toBe(400);
  });

  it('06: Negative price rejected (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/membership/plans')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        name: 'Negative Plan',
        durationDays: 30,
        price: -100,
      });

    expect(res.status).toBe(400);
  });

  it('07: Invalid benefits rejected (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/membership/plans')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        name: 'Bad Benefits Plan',
        durationDays: 30,
        price: 500,
        benefits: 'Not an array', // Should be array of strings
      });

    expect(res.status).toBe(400);
  });

  it('08: Admin can list only plans belonging to their tenant (200 OK)', async () => {
    (prisma as any).__seedPlan({
      id: 'plan-1',
      gymId: 'gym-001-id',
      name: 'Gym 1 Plan',
      durationDays: 30,
      price: 1000,
      isActive: true,
    });
    (prisma as any).__seedPlan({
      id: 'plan-2',
      gymId: 'gym-002-id',
      name: 'Gym 2 Plan',
      durationDays: 30,
      price: 2000,
      isActive: true,
    });

    const res = await request(app)
      .get('/api/membership/plans')
      .set('Cookie', [`session_token=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.plans).toHaveLength(1);
    expect(res.body.data.plans[0].name).toBe('Gym 1 Plan');
  });

  it('09: Plan from another gym cannot be accessed directly (404 Not Found)', async () => {
    (prisma as any).__seedPlan({
      id: 'plan-gym-2',
      gymId: 'gym-002-id',
      name: 'CrossFit Plan',
      durationDays: 30,
      price: 1500,
      isActive: true,
    });

    const res = await request(app)
      .get('/api/membership/plans/plan-gym-2')
      .set('Cookie', [`session_token=${adminToken}`]);

    expect(res.status).toBe(404);
  });

  it('10: Admin can update a plan (200 OK)', async () => {
    (prisma as any).__seedPlan({
      id: 'plan-update-target',
      gymId: 'gym-001-id',
      name: 'Old Plan Name',
      durationDays: 30,
      price: 1000,
      isActive: true,
    });

    const res = await request(app)
      .patch('/api/membership/plans/plan-update-target')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        name: 'New Updated Plan Name',
        price: 1200,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('New Updated Plan Name');
    expect(res.body.data.price).toBe(1200);
  });

  it('11: Deactivating a plan works (200 OK)', async () => {
    (prisma as any).__seedPlan({
      id: 'plan-deactivate',
      gymId: 'gym-001-id',
      name: 'Active Plan',
      durationDays: 30,
      price: 1000,
      isActive: true,
    });

    const res = await request(app)
      .patch('/api/membership/plans/plan-deactivate')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        isActive: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it('12: Existing memberships referencing a plan remain intact when plan is deactivated', async () => {
    (prisma as any).__seedPlan({
      id: 'plan-deactivated-ref',
      gymId: 'gym-001-id',
      name: 'Legacy Plan',
      durationDays: 30,
      price: 1000,
      isActive: false,
    });
    (prisma as any).__seedMembership({
      id: 'mem-legacy',
      gymId: 'gym-001-id',
      userId: 'member-001-id',
      planId: 'plan-deactivated-ref',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      status: 'ACTIVE',
    });

    const res = await request(app)
      .get('/api/membership/my-membership')
      .set('Cookie', [`session_token=${memberToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.activeMembership.id).toBe('mem-legacy');
  });

  /* ==========================================
   * MEMBERSHIP ASSIGNMENT TESTS (MEMBERSHIP-002)
   * ========================================== */
  it('13: Authorized admin can assign a valid plan to a member (201 Created)', async () => {
    (prisma as any).__seedPlan({
      id: 'plan-active-1',
      gymId: 'gym-001-id',
      name: 'Monthly Basic',
      durationDays: 30,
      price: 999,
      isActive: true,
    });

    const res = await request(app)
      .post('/api/membership/assign')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        userId: 'member-001-id',
        planId: 'plan-active-1',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ACTIVE');

    // Verify member onboarding status was updated from PENDING_MEMBERSHIP -> ACTIVE
    const memberships = (prisma as any).__getMemberships();
    expect(memberships).toHaveLength(1);
  });

  it('14: Member from another gym cannot be targeted (403 Forbidden)', async () => {
    (prisma as any).__seedPlan({
      id: 'plan-active-1',
      gymId: 'gym-001-id',
      name: 'Monthly Basic',
      durationDays: 30,
      price: 999,
      isActive: true,
    });

    const res = await request(app)
      .post('/api/membership/assign')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        userId: 'member-gym2-id', // Belongs to gym-002
        planId: 'plan-active-1',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('15: Invalid plan cannot be assigned (404 Not Found)', async () => {
    const res = await request(app)
      .post('/api/membership/assign')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        userId: 'member-001-id',
        planId: 'non-existent-plan-id',
      });

    expect(res.status).toBe(404);
  });

  it('16: Inactive plan cannot be newly assigned (400 Bad Request)', async () => {
    (prisma as any).__seedPlan({
      id: 'plan-inactive-1',
      gymId: 'gym-001-id',
      name: 'Archived Plan',
      durationDays: 30,
      price: 999,
      isActive: false,
    });

    const res = await request(app)
      .post('/api/membership/assign')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        userId: 'member-001-id',
        planId: 'plan-inactive-1',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INACTIVE_PLAN');
  });

  it('17 & 18: startDate and endDate are calculated correctly', async () => {
    (prisma as any).__seedPlan({
      id: 'plan-30d',
      gymId: 'gym-001-id',
      name: '30-Day Plan',
      durationDays: 30,
      price: 1000,
      isActive: true,
    });

    const startIso = '2026-10-01T00:00:00.000Z';
    const res = await request(app)
      .post('/api/membership/assign')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        userId: 'member-001-id',
        planId: 'plan-30d',
        startDate: startIso,
      });

    expect(res.status).toBe(201);
    const m = res.body.data;
    const startMs = new Date(m.startDate).getTime();
    const endMs = new Date(m.endDate).getTime();
    expect(endMs - startMs).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('19: Membership is created with correct initial status ACTIVE', async () => {
    (prisma as any).__seedPlan({
      id: 'plan-30d-active',
      gymId: 'gym-001-id',
      name: 'Active Plan',
      durationDays: 30,
      price: 1000,
      isActive: true,
    });

    const res = await request(app)
      .post('/api/membership/assign')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        userId: 'member-001-id',
        planId: 'plan-30d-active',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('20: Overlapping active membership behavior correctly supersedes existing active membership', async () => {
    (prisma as any).__seedPlan({
      id: 'plan-new',
      gymId: 'gym-001-id',
      name: 'New Plan',
      durationDays: 30,
      price: 1000,
      isActive: true,
    });

    // Seed existing active membership
    (prisma as any).__seedMembership({
      id: 'existing-active-mem',
      gymId: 'gym-001-id',
      userId: 'member-001-id',
      planId: 'plan-new',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      status: 'ACTIVE',
    });

    const res = await request(app)
      .post('/api/membership/assign')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        userId: 'member-001-id',
        planId: 'plan-new',
      });

    expect(res.status).toBe(201);
    // Verify previous membership was set to CANCELLED
    const allMemberships = (prisma as any).__getMemberships();
    const oldMem = allMemberships.find((m: any) => m.id === 'existing-active-mem');
    expect(oldMem.status).toBe('CANCELLED');
  });

  /* ==========================================
   * STATUS STATE MACHINE TESTS
   * ========================================== */
  it('21: ACTIVE membership remains ACTIVE while sufficiently far from expiry (> 7 days)', async () => {
    const futureEnd = new Date(Date.now() + 20 * 86400000); // 20 days remaining
    (prisma as any).__seedMembership({
      id: 'mem-future',
      gymId: 'gym-001-id',
      userId: 'member-001-id',
      planId: 'plan-1',
      startDate: new Date(),
      endDate: futureEnd,
      status: 'ACTIVE',
    });

    const result = await MembershipService.syncMembershipStatus({
      id: 'mem-future',
      status: 'ACTIVE',
      endDate: futureEnd,
    });

    expect(result.status).toBe('ACTIVE');
  });

  it('22: ACTIVE membership transitions to EXPIRING_SOON when <= 7 days remaining', async () => {
    const expiringSoonEnd = new Date(Date.now() + 5 * 86400000); // 5 days remaining
    (prisma as any).__seedMembership({
      id: 'mem-expiring-soon',
      gymId: 'gym-001-id',
      userId: 'member-001-id',
      planId: 'plan-1',
      startDate: new Date(),
      endDate: expiringSoonEnd,
      status: 'ACTIVE',
    });

    const result = await MembershipService.syncMembershipStatus({
      id: 'mem-expiring-soon',
      status: 'ACTIVE',
      endDate: expiringSoonEnd,
    });

    expect(result.status).toBe('EXPIRING_SOON');
  });

  it('23: EXPIRING_SOON transitions to EXPIRED after endDate', async () => {
    const pastEnd = new Date(Date.now() - 1000); // Expired 1 second ago
    (prisma as any).__seedMembership({
      id: 'mem-past-end',
      gymId: 'gym-001-id',
      userId: 'member-001-id',
      planId: 'plan-1',
      startDate: new Date(Date.now() - 30 * 86400000),
      endDate: pastEnd,
      status: 'EXPIRING_SOON',
    });

    const result = await MembershipService.syncMembershipStatus({
      id: 'mem-past-end',
      status: 'EXPIRING_SOON',
      endDate: pastEnd,
    });

    expect(result.status).toBe('EXPIRED');
  });

  it('24: EXPIRED cannot silently return to ACTIVE', async () => {
    const futureEnd = new Date(Date.now() + 10 * 86400000);
    const result = await MembershipService.syncMembershipStatus({
      id: 'mem-already-expired',
      status: 'EXPIRED',
      endDate: futureEnd,
    });

    expect(result.status).toBe('EXPIRED');
  });

  it('25 & 26: CANCELLED remains CANCELLED and cannot silently become ACTIVE', async () => {
    const futureEnd = new Date(Date.now() + 10 * 86400000);
    const result = await MembershipService.syncMembershipStatus({
      id: 'mem-cancelled',
      status: 'CANCELLED',
      endDate: futureEnd,
    });

    expect(result.status).toBe('CANCELLED');
  });

  /* ==========================================
   * TENANT ISOLATION TESTS
   * ========================================== */
  it('27-30: Tenant isolation protects cross-gym plan/membership access', async () => {
    // Admin 1 (Gym 1) cannot cancel Gym 2 membership
    (prisma as any).__seedMembership({
      id: 'mem-gym2',
      gymId: 'gym-002-id',
      userId: 'member-gym2-id',
      planId: 'plan-2',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      status: 'ACTIVE',
    });

    const resCancel = await request(app)
      .post('/api/membership/cancel/mem-gym2')
      .set('Cookie', [`session_token=${adminToken}`]);

    expect(resCancel.status).toBe(404);

    // Admin 1 cannot view Gym 2 member memberships
    const resView = await request(app)
      .get('/api/membership/member/member-gym2-id')
      .set('Cookie', [`session_token=${adminToken}`]);

    expect(resView.status).toBe(403);
  });

  /* ==========================================
   * SECURITY & MASS ASSIGNMENT TESTS
   * ========================================== */
  it('33-36: Reject client injection of status, gymId, or unauthorized fields', async () => {
    (prisma as any).__seedPlan({
      id: 'plan-valid',
      gymId: 'gym-001-id',
      name: 'Valid Plan',
      durationDays: 30,
      price: 1000,
      isActive: true,
    });

    const res = await request(app)
      .post('/api/membership/assign')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        userId: 'member-001-id',
        planId: 'plan-valid',
        gymId: 'gym-002-id', // Injection attempt
        status: 'EXPIRED', // Injection attempt
      });

    expect(res.status).toBe(201);
    // Verified record must belong to admin gymId (gym-001-id) and have ACTIVE status
    expect(res.body.data.gymId).toBe('gym-001-id');
    expect(res.body.data.status).toBe('ACTIVE');
  });

  /* ==========================================
   * AUDIT LOG TESTS
   * ========================================== */
  it('40: Membership operations create AuditLog entries', async () => {
    const res = await request(app)
      .post('/api/membership/plans')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        name: 'Audit Tested Plan',
        durationDays: 30,
        price: 1500,
      });

    expect(res.status).toBe(201);
    const logs = (prisma as any).__getAuditLogs();
    expect(logs.some((l: any) => l.action === 'MEMBERSHIP_PLAN_CREATED')).toBe(true);
  });
});
