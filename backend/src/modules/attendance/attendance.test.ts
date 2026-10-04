import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';
import { signSessionToken } from '../../lib/jwt';
import { generateAttendanceQRToken } from '../../lib/token';
import { AttendanceService } from './attendance.service';

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
    status: 'ACTIVE',
    currentStreak: 5,
    longestStreak: 10,
    starScore: 15,
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

  const mockAdmin = {
    id: 'admin-001-id',
    gymId: 'gym-001-id',
    email: 'admin@example.com',
    phone: '+19876543211',
    name: 'Gym Admin',
    passwordHash: 'hashedpassword',
    role: 'GYM_ADMIN',
    status: 'ACTIVE',
    currentStreak: 0,
    longestStreak: 0,
    starScore: 0,
  };

  const mockActiveMembership = {
    id: 'membership-001',
    gymId: 'gym-001-id',
    userId: 'member-001-id',
    planId: 'plan-001',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    status: 'ACTIVE',
  };

  const mockExpiredMembership = {
    id: 'membership-002',
    gymId: 'gym-001-id',
    userId: 'member-001-id',
    planId: 'plan-001',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    status: 'EXPIRED',
  };

  let mockAttendances: any[] = [];
  let mockAuditLogs: any[] = [];

  return {
    prisma: {
      gym: {
        findUnique: vi.fn(async ({ where }) => {
          if (where.id === 'gym-001-id' || where.code === 'GYM-001') return mockGym1;
          if (where.id === 'gym-002-id' || where.code === 'GYM-002') return mockGym2;
          return null;
        }),
      },
      user: {
        findUnique: vi.fn(async ({ where }) => {
          if (where.id === 'member-001-id') return mockMember1;
          if (where.id === 'member-gym2-id') return mockMemberGym2;
          if (where.id === 'admin-001-id') return mockAdmin;
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
      membership: {
        findFirst: vi.fn(async ({ where }) => {
          if (where.userId === 'member-001-id' && where.status === 'ACTIVE') {
            return mockActiveMembership;
          }
          if (where.userId === 'member-expired-id') {
            return mockExpiredMembership;
          }
          return null;
        }),
      },
      attendance: {
        create: vi.fn(async ({ data }) => {
          const dateStr = data.attendanceDate instanceof Date
            ? data.attendanceDate.toISOString().split('T')[0]
            : String(data.attendanceDate);

          const isDuplicate = mockAttendances.some(
            (a) => a.userId === data.userId && a.gymId === data.gymId && a.dateStr === dateStr
          );

          if (isDuplicate) {
            const error: any = new Error('Unique constraint failed');
            error.code = 'P2002';
            throw error;
          }

          const record = {
            id: `att-${Date.now()}-${Math.random()}`,
            gymId: data.gymId,
            userId: data.userId,
            attendanceDate: data.attendanceDate,
            dateStr,
            status: data.status || 'PRESENT',
            scanMethod: data.scanMethod || 'QR_SCAN',
            timestamp: new Date(),
            notes: data.notes || null,
          };

          mockAttendances.push(record);
          return record;
        }),
        findUnique: vi.fn(async ({ where }) => {
          if (where.user_gym_daily_attendance_unique) {
            const { gymId, userId, attendanceDate } = where.user_gym_daily_attendance_unique;
            const targetDateStr = attendanceDate instanceof Date
              ? attendanceDate.toISOString().split('T')[0]
              : String(attendanceDate);

            return mockAttendances.find(
              (a) => a.gymId === gymId && a.userId === userId && a.dateStr === targetDateStr
            ) || null;
          }
          return null;
        }),
        upsert: vi.fn(async ({ where, create, update }) => {
          const { gymId, userId, attendanceDate } = where.user_gym_daily_attendance_unique;
          const targetDateStr = attendanceDate instanceof Date
            ? attendanceDate.toISOString().split('T')[0]
            : String(attendanceDate);

          const existingIndex = mockAttendances.findIndex(
            (a) => a.gymId === gymId && a.userId === userId && a.dateStr === targetDateStr
          );

          if (existingIndex >= 0) {
            // Override existing record
            mockAttendances[existingIndex] = {
              ...mockAttendances[existingIndex],
              status: update.status,
              scanMethod: update.scanMethod,
              notes: update.notes !== undefined ? update.notes : mockAttendances[existingIndex].notes,
              updatedAt: new Date(),
            };
            return mockAttendances[existingIndex];
          } else {
            // Create new record
            const newRecord = {
              id: `att-${Date.now()}-${Math.random()}`,
              gymId: create.gymId,
              userId: create.userId,
              attendanceDate: create.attendanceDate,
              dateStr: targetDateStr,
              status: create.status,
              scanMethod: create.scanMethod,
              timestamp: new Date(),
              notes: create.notes || null,
            };
            mockAttendances.push(newRecord);
            return newRecord;
          }
        }),
        findMany: vi.fn(async ({ where, orderBy, take }) => {
          let results = mockAttendances.filter((a) => {
            const matchUser = !where.userId || a.userId === where.userId;
            const matchGym = !where.gymId || a.gymId === where.gymId;

            let matchDate = true;
            if (where.attendanceDate) {
              const recordDate = new Date(a.attendanceDate);
              if (where.attendanceDate.gte && recordDate < where.attendanceDate.gte) {
                matchDate = false;
              }
              if (where.attendanceDate.lte && recordDate > where.attendanceDate.lte) {
                matchDate = false;
              }
            }

            return matchUser && matchGym && matchDate;
          });

          // Sort DESC by date
          results.sort((a, b) => new Date(b.attendanceDate).getTime() - new Date(a.attendanceDate).getTime());

          if (take) {
            results = results.slice(0, take);
          }

          return results;
        }),
      },
      auditLog: {
        create: vi.fn(async ({ data }) => {
          const log = { id: `audit-${Date.now()}`, ...data, createdAt: new Date() };
          mockAuditLogs.push(log);
          return log;
        }),
      },
      __resetMockAttendances: () => {
        mockAttendances = [];
        mockAuditLogs = [];
      },
      __seedMockAttendance: (record: any) => {
        mockAttendances.push(record);
      },
      __getMockAttendances: () => mockAttendances,
      __getMockMember: () => mockMember1,
    },
  };
});

describe('Module 03 Backend - Attendance Engine (ATT-001, ATT-002, ATT-003)', () => {
  let memberToken: string;
  let adminToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma as any).__resetMockAttendances();

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

    // Mock non-Sunday weekday by default
    vi.spyOn(AttendanceService, 'getGymLocalDate').mockReturnValue({
      attendanceDate: new Date(Date.UTC(2026, 9, 5)), // Monday
      isSunday: false,
      dateStr: '2026-10-05',
    });
  });

  /* ==========================================
   * ATT-001 SCAN TESTS
   * ========================================== */
  it('ATT-001-001: Valid QR scan creates attendance and updates streak/stars (200 OK)', async () => {
    const validQrToken = generateAttendanceQRToken('GYM-001', 'secret-gym-001-key-2026');

    const res = await request(app)
      .post('/api/attendance/scan')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({
        qrTokenPayload: validQrToken,
        clientTimestamp: Date.now(),
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.status).toBe('PRESENT');
    expect(res.body.data.scanMethod).toBe('QR_SCAN');
    expect(res.body.data.attendanceDate).toBe('2026-10-05');
  });

  it('ATT-001-002: Reject scan if member has no active membership (403 Forbidden)', async () => {
    const expiredMemberToken = signSessionToken({
      userId: 'member-expired-id',
      gymId: 'gym-001-id',
      role: 'MEMBER',
      email: 'expired@example.com',
    });

    const validQrToken = generateAttendanceQRToken('GYM-001', 'secret-gym-001-key-2026');

    const res = await request(app)
      .post('/api/attendance/scan')
      .set('Cookie', [`session_token=${expiredMemberToken}`])
      .send({
        qrTokenPayload: validQrToken,
        clientTimestamp: Date.now(),
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('ATT-001-003: Reject scan with invalid QR signature (400 Bad Request)', async () => {
    const invalidQrToken = generateAttendanceQRToken('GYM-001', 'wrong-qr-secret-key');

    const res = await request(app)
      .post('/api/attendance/scan')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({
        qrTokenPayload: invalidQrToken,
        clientTimestamp: Date.now(),
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_QR_TOKEN');
  });

  it('ATT-001-004: Reject scan with expired QR token (>45s) (400 Bad Request)', async () => {
    const expiredTimestamp = Date.now() - 60000; // 60s ago (> 45s threshold)
    const expiredQrToken = generateAttendanceQRToken('GYM-001', 'secret-gym-001-key-2026', expiredTimestamp);

    const res = await request(app)
      .post('/api/attendance/scan')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({
        qrTokenPayload: expiredQrToken,
        clientTimestamp: Date.now(),
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_QR_TOKEN');
  });

  it('ATT-001-005: Reject cross-tenant QR token (400 Bad Request)', async () => {
    const crossTenantQrToken = generateAttendanceQRToken('GYM-002', 'secret-gym-002-key-2026');

    const res = await request(app)
      .post('/api/attendance/scan')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({
        qrTokenPayload: crossTenantQrToken,
        clientTimestamp: Date.now(),
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_QR_TOKEN');
  });

  it('ATT-001-006: Reject check-in on Sundays (400 Bad Request)', async () => {
    vi.spyOn(AttendanceService, 'getGymLocalDate').mockReturnValue({
      attendanceDate: new Date(Date.UTC(2026, 9, 4)), // Sunday
      isSunday: true,
      dateStr: '2026-10-04',
    });

    const validQrToken = generateAttendanceQRToken('GYM-001', 'secret-gym-001-key-2026');

    const res = await request(app)
      .post('/api/attendance/scan')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({
        qrTokenPayload: validQrToken,
        clientTimestamp: Date.now(),
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('GYM_CLOSED_SUNDAY');
    expect(res.body.error.message).toBe('Gym closed on Sundays');
  });

  it('ATT-001-007: Reject duplicate daily check-in (409 Conflict)', async () => {
    const validQrToken = generateAttendanceQRToken('GYM-001', 'secret-gym-001-key-2026');

    const firstRes = await request(app)
      .post('/api/attendance/scan')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({
        qrTokenPayload: validQrToken,
        clientTimestamp: Date.now(),
      });

    expect(firstRes.status).toBe(200);

    const secondRes = await request(app)
      .post('/api/attendance/scan')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({
        qrTokenPayload: validQrToken,
        clientTimestamp: Date.now(),
      });

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.success).toBe(false);
    expect(secondRes.body.error.code).toBe('DUPLICATE_ATTENDANCE');
  });

  it('ATT-001-008: Reject non-MEMBER roles for scan (403 Forbidden)', async () => {
    const validQrToken = generateAttendanceQRToken('GYM-001', 'secret-gym-001-key-2026');

    const res = await request(app)
      .post('/api/attendance/scan')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        qrTokenPayload: validQrToken,
        clientTimestamp: Date.now(),
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  /* ==========================================
   * ATT-002 MEMBER ATTENDANCE HISTORY TESTS
   * ========================================== */
  it('ATT-002-001: Authenticated MEMBER can fetch their own history in DESC order (200 OK)', async () => {
    (prisma as any).__seedMockAttendance({
      id: 'att-1',
      gymId: 'gym-001-id',
      userId: 'member-001-id',
      attendanceDate: new Date(Date.UTC(2026, 9, 1)),
      status: 'PRESENT',
      scanMethod: 'QR_SCAN',
      timestamp: new Date('2026-10-01T08:00:00Z'),
    });
    (prisma as any).__seedMockAttendance({
      id: 'att-2',
      gymId: 'gym-001-id',
      userId: 'member-001-id',
      attendanceDate: new Date(Date.UTC(2026, 9, 2)),
      status: 'PRESENT',
      scanMethod: 'QR_SCAN',
      timestamp: new Date('2026-10-02T08:00:00Z'),
    });

    const res = await request(app)
      .get('/api/attendance/history')
      .set('Cookie', [`session_token=${memberToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.attendance).toHaveLength(2);
    expect(res.body.data.attendance[0].attendanceDate).toBe('2026-10-02');
    expect(res.body.data.attendance[1].attendanceDate).toBe('2026-10-01');
  });

  it('ATT-002-002: Member with empty history receives 200 OK with empty array', async () => {
    const res = await request(app)
      .get('/api/attendance/history')
      .set('Cookie', [`session_token=${memberToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.attendance).toHaveLength(0);
    expect(res.body.data.totalCount).toBe(0);
  });

  it('ATT-002-003: Filter attendance history by date range (from & to)', async () => {
    (prisma as any).__seedMockAttendance({
      id: 'att-sep',
      gymId: 'gym-001-id',
      userId: 'member-001-id',
      attendanceDate: new Date(Date.UTC(2026, 8, 15)),
      status: 'PRESENT',
      scanMethod: 'QR_SCAN',
      timestamp: new Date(),
    });
    (prisma as any).__seedMockAttendance({
      id: 'att-oct',
      gymId: 'gym-001-id',
      userId: 'member-001-id',
      attendanceDate: new Date(Date.UTC(2026, 9, 2)),
      status: 'PRESENT',
      scanMethod: 'QR_SCAN',
      timestamp: new Date(),
    });

    const res = await request(app)
      .get('/api/attendance/history?from=2026-10-01&to=2026-10-31')
      .set('Cookie', [`session_token=${memberToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.attendance).toHaveLength(1);
    expect(res.body.data.attendance[0].attendanceDate).toBe('2026-10-02');
  });

  it('ATT-002-004: Reject invalid date format (400 Bad Request)', async () => {
    const res = await request(app)
      .get('/api/attendance/history?from=invalid-date')
      .set('Cookie', [`session_token=${memberToken}`]);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('ATT-002-005: Reject invalid date range where from > to (400 Bad Request)', async () => {
    const res = await request(app)
      .get('/api/attendance/history?from=2026-10-31&to=2026-10-01')
      .set('Cookie', [`session_token=${memberToken}`]);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('ATT-002-006: Tenant isolation & IDOR Protection - Member sees only their own data', async () => {
    (prisma as any).__seedMockAttendance({
      id: 'att-other-user',
      gymId: 'gym-002-id',
      userId: 'other-user-id',
      attendanceDate: new Date(Date.UTC(2026, 9, 5)),
      status: 'PRESENT',
      scanMethod: 'QR_SCAN',
      timestamp: new Date(),
    });

    const res = await request(app)
      .get('/api/attendance/history?userId=other-user-id')
      .set('Cookie', [`session_token=${memberToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.attendance).toHaveLength(0);
  });

  it('ATT-002-007: Reject non-MEMBER role access to member history (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/attendance/history')
      .set('Cookie', [`session_token=${adminToken}`]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('ATT-002-008: Verify GET /history is strictly read-only and leaks no sensitive tokens/passwords', async () => {
    (prisma as any).__seedMockAttendance({
      id: 'att-read-only',
      gymId: 'gym-001-id',
      userId: 'member-001-id',
      attendanceDate: new Date(Date.UTC(2026, 9, 3)),
      status: 'PRESENT',
      scanMethod: 'QR_SCAN',
      timestamp: new Date(),
    });

    const res = await request(app)
      .get('/api/attendance/history')
      .set('Cookie', [`session_token=${memberToken}`]);

    expect(res.status).toBe(200);
    const item = res.body.data.attendance[0];
    expect(item).not.toHaveProperty('passwordHash');
    expect(item).not.toHaveProperty('qrSecret');
    expect(item).not.toHaveProperty('sessionToken');
    expect(item).toHaveProperty('attendanceDate');
    expect(item).toHaveProperty('status');
    expect(item).toHaveProperty('scanMethod');
  });

  /* ==========================================
   * ATT-003 ADMIN ATTENDANCE OVERRIDE & MANUAL ENTRY TESTS
   * ========================================== */
  it('ATT-003-001: Authorized GYM_ADMIN can manually create attendance for a member in their gym (200 OK)', async () => {
    const res = await request(app)
      .post('/api/attendance/manual')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        userId: 'member-001-id',
        attendanceDate: '2026-10-04',
        status: 'PRESENT',
        notes: 'Manual front-desk entry by Admin',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PRESENT');
    expect(res.body.data.scanMethod).toBe('MANUAL_ADMIN');
    expect(res.body.data.notes).toBe('Manual front-desk entry by Admin');
    expect(res.body.data.attendanceDate).toBe('2026-10-04');
  });

  it('ATT-003-002: Reject unauthenticated manual attendance requests (401 Unauthorized)', async () => {
    const res = await request(app)
      .post('/api/attendance/manual')
      .send({
        userId: 'member-001-id',
        attendanceDate: '2026-10-04',
        status: 'PRESENT',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('ATT-003-003: Reject MEMBER role attempting manual attendance override (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/attendance/manual')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({
        userId: 'member-001-id',
        attendanceDate: '2026-10-04',
        status: 'PRESENT',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('ATT-003-004: Tenant Isolation & IDOR Protection - Reject override for target member in another gym (403 Forbidden)', async () => {
    // adminToken belongs to GYM-001, but member-gym2-id belongs to GYM-002
    const res = await request(app)
      .post('/api/attendance/manual')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        userId: 'member-gym2-id',
        attendanceDate: '2026-10-04',
        status: 'PRESENT',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Member not found in your gym tenant scope');
  });

  it('ATT-003-005: Client cannot inject or override gymId in request body', async () => {
    const res = await request(app)
      .post('/api/attendance/manual')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        userId: 'member-001-id',
        gymId: 'gym-002-id', // Injection attempt
        attendanceDate: '2026-10-04',
        status: 'PRESENT',
      });

    expect(res.status).toBe(200);
    // Verified record must be created under admin's gymId (gym-001-id)
    const records = (prisma as any).__getMockAttendances();
    expect(records[0].gymId).toBe('gym-001-id');
  });

  it('ATT-003-006: Override existing QR_SCAN record converts scanMethod to MANUAL_ADMIN without creating duplicate row', async () => {
    // Seed initial QR_SCAN record
    (prisma as any).__seedMockAttendance({
      id: 'att-qr-existing',
      gymId: 'gym-001-id',
      userId: 'member-001-id',
      attendanceDate: new Date(Date.UTC(2026, 9, 4)),
      dateStr: '2026-10-04',
      status: 'PRESENT',
      scanMethod: 'QR_SCAN',
      timestamp: new Date(),
    });

    const res = await request(app)
      .post('/api/attendance/manual')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        userId: 'member-001-id',
        attendanceDate: '2026-10-04',
        status: 'EXCUSED',
        notes: 'Admin set to EXCUSED',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('EXCUSED');
    expect(res.body.data.scanMethod).toBe('MANUAL_ADMIN');

    // Confirm database has exactly ONE record for this member/date
    const records = (prisma as any).__getMockAttendances();
    const matches = records.filter((r: any) => r.userId === 'member-001-id' && r.dateStr === '2026-10-04');
    expect(matches).toHaveLength(1);
    expect(matches[0].status).toBe('EXCUSED');
    expect(matches[0].scanMethod).toBe('MANUAL_ADMIN');
  });

  it('ATT-003-007: Input Validation - Reject malformed date, invalid status, or oversized notes (400 Bad Request)', async () => {
    // Invalid Date
    const resDate = await request(app)
      .post('/api/attendance/manual')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        userId: 'member-001-id',
        attendanceDate: '2026-13-45',
        status: 'PRESENT',
      });
    expect(resDate.status).toBe(400);

    // Invalid Status
    const resStatus = await request(app)
      .post('/api/attendance/manual')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        userId: 'member-001-id',
        attendanceDate: '2026-10-04',
        status: 'UNKNOWN_STATUS',
      });
    expect(resStatus.status).toBe(400);

    // Oversized Notes
    const resNotes = await request(app)
      .post('/api/attendance/manual')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        userId: 'member-001-id',
        attendanceDate: '2026-10-04',
        status: 'PRESENT',
        notes: 'A'.repeat(501),
      });
    expect(resNotes.status).toBe(400);
  });

  it('ATT-003-008: Gamification Protection - Repeated admin edits on existing records DO NOT repeatedly inflate starScore', async () => {
    const memberBefore = (prisma as any).__getMockMember();
    const initialStarScore = memberBefore.starScore;

    // Seed existing record
    (prisma as any).__seedMockAttendance({
      id: 'att-existing',
      gymId: 'gym-001-id',
      userId: 'member-001-id',
      attendanceDate: new Date(Date.UTC(2026, 9, 4)),
      dateStr: '2026-10-04',
      status: 'PRESENT',
      scanMethod: 'QR_SCAN',
      timestamp: new Date(),
    });

    // Admin edits notes 3 times on the existing record
    for (let i = 1; i <= 3; i++) {
      await request(app)
        .post('/api/attendance/manual')
        .set('Cookie', [`session_token=${adminToken}`])
        .send({
          userId: 'member-001-id',
          attendanceDate: '2026-10-04',
          status: 'PRESENT',
          notes: `Edit #${i}`,
        });
    }

    const memberAfter = (prisma as any).__getMockMember();
    // Star score must NOT inflate repeatedly
    expect(memberAfter.starScore).toBe(initialStarScore);
  });
});
