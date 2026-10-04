import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../lib/prisma';
import { StreakService } from './streak.service';

// Mock Prisma for unit testing
vi.mock('../../lib/prisma', () => {
  let mockUser = {
    id: 'user-001',
    gymId: 'gym-001',
    name: 'Test Member',
    email: 'test@example.com',
    currentStreak: 0,
    longestStreak: 0,
    starScore: 0,
  };

  let mockAttendances: any[] = [];

  return {
    prisma: {
      user: {
        findUnique: vi.fn(async ({ where }) => {
          if (where.id === mockUser.id) return { ...mockUser };
          return null;
        }),
        findUniqueOrThrow: vi.fn(async ({ where }) => {
          if (where.id === mockUser.id) return { ...mockUser };
          throw new Error(`User not found: ${where.id}`);
        }),
        update: vi.fn(async ({ where, data }) => {
          if (where.id === mockUser.id) {
            Object.assign(mockUser, data);
            return { ...mockUser };
          }
          throw new Error(`User not found: ${where.id}`);
        }),
      },
      attendance: {
        findUnique: vi.fn(async ({ where }) => {
          if (where.user_gym_daily_attendance_unique) {
            const { gymId, userId, attendanceDate } = where.user_gym_daily_attendance_unique;
            const targetDateMs = new Date(attendanceDate).getTime();
            return (
              mockAttendances.find(
                (a) =>
                  a.gymId === gymId &&
                  a.userId === userId &&
                  new Date(a.attendanceDate).getTime() === targetDateMs
              ) || null
            );
          }
          return null;
        }),
      },
      __resetMockUser: (overrides = {}) => {
        mockUser = {
          id: 'user-001',
          gymId: 'gym-001',
          name: 'Test Member',
          email: 'test@example.com',
          currentStreak: 0,
          longestStreak: 0,
          starScore: 0,
          ...overrides,
        };
        mockAttendances = [];
      },
      __seedMockAttendance: (record: any) => {
        mockAttendances.push(record);
      },
      __getMockUser: () => ({ ...mockUser }),
    },
  };
});

describe('Module 04 - Streak Engine & Star Score (STREAK-001 & STREAK-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma as any).__resetMockUser();
  });

  /* ==========================================
   * STREAK-001 TESTS
   * ========================================== */

  it('STREAK-001-001: Initial PRESENT check-in sets currentStreak = 1, starScore = 1, longestStreak = 1', async () => {
    const monday = new Date(Date.UTC(2026, 9, 5)); // Monday
    const result = await StreakService.processAttendanceEvent('user-001', 'gym-001', monday, 'PRESENT');

    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.starScore).toBe(1);
  });

  it('STREAK-001-002: Consecutive PRESENT days increments streak 1 -> 2 -> 3', async () => {
    // Day 1: Monday
    const monday = new Date(Date.UTC(2026, 9, 5));
    await StreakService.processAttendanceEvent('user-001', 'gym-001', monday, 'PRESENT');
    (prisma as any).__seedMockAttendance({
      gymId: 'gym-001',
      userId: 'user-001',
      attendanceDate: monday,
      status: 'PRESENT',
    });

    // Day 2: Tuesday
    const tuesday = new Date(Date.UTC(2026, 9, 6));
    const res2 = await StreakService.processAttendanceEvent('user-001', 'gym-001', tuesday, 'PRESENT');
    (prisma as any).__seedMockAttendance({
      gymId: 'gym-001',
      userId: 'user-001',
      attendanceDate: tuesday,
      status: 'PRESENT',
    });

    expect(res2.currentStreak).toBe(2);
    expect(res2.starScore).toBe(2);

    // Day 3: Wednesday
    const wednesday = new Date(Date.UTC(2026, 9, 7));
    const res3 = await StreakService.processAttendanceEvent('user-001', 'gym-001', wednesday, 'PRESENT');

    expect(res3.currentStreak).toBe(3);
    expect(res3.longestStreak).toBe(3);
    expect(res3.starScore).toBe(3);
  });

  it('STREAK-001-003: Longest streak tracks maximum and does not decrease when currentStreak resets', async () => {
    (prisma as any).__resetMockUser({ currentStreak: 5, longestStreak: 10, starScore: 10 });
    const tuesday = new Date(Date.UTC(2026, 9, 6));

    const result = await StreakService.processAttendanceEvent('user-001', 'gym-001', tuesday, 'ABSENT');

    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(10); // Longest streak remains 10!
  });

  it('STREAK-001-004: ABSENT attendance resets currentStreak to 0', async () => {
    (prisma as any).__resetMockUser({ currentStreak: 4, longestStreak: 4, starScore: 5 });
    const tuesday = new Date(Date.UTC(2026, 9, 6));

    const result = await StreakService.processAttendanceEvent('user-001', 'gym-001', tuesday, 'ABSENT');

    expect(result.currentStreak).toBe(0);
  });

  it('STREAK-001-005: ABSENT attendance penalizes starScore by 2', async () => {
    (prisma as any).__resetMockUser({ currentStreak: 3, longestStreak: 3, starScore: 5 });
    const tuesday = new Date(Date.UTC(2026, 9, 6));

    const result = await StreakService.processAttendanceEvent('user-001', 'gym-001', tuesday, 'ABSENT');

    expect(result.starScore).toBe(3); // 5 - 2 = 3
  });

  it('STREAK-001-006: Star score floor enforces starScore never drops below 0', async () => {
    (prisma as any).__resetMockUser({ currentStreak: 0, longestStreak: 2, starScore: 1 });
    const tuesday = new Date(Date.UTC(2026, 9, 6));

    const result = await StreakService.processAttendanceEvent('user-001', 'gym-001', tuesday, 'ABSENT');

    expect(result.starScore).toBe(0); // 1 - 2 = max(0, -1) -> 0
  });

  it('STREAK-001-007: BR-SUNDAY-001 - Sunday PRESENT check-in has zero effect', async () => {
    (prisma as any).__resetMockUser({ currentStreak: 3, longestStreak: 5, starScore: 4 });
    const sunday = new Date(Date.UTC(2026, 9, 4)); // Sunday

    const result = await StreakService.processAttendanceEvent('user-001', 'gym-001', sunday, 'PRESENT');

    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(5);
    expect(result.starScore).toBe(4);
  });

  it('STREAK-001-008: BR-SUNDAY-001 - Sunday ABSENT has zero effect', async () => {
    (prisma as any).__resetMockUser({ currentStreak: 3, longestStreak: 5, starScore: 4 });
    const sunday = new Date(Date.UTC(2026, 9, 4)); // Sunday

    const result = await StreakService.processAttendanceEvent('user-001', 'gym-001', sunday, 'ABSENT');

    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(5);
    expect(result.starScore).toBe(4);
  });

  it('STREAK-001-009: Non-consecutive PRESENT events do NOT falsely produce a consecutive streak', async () => {
    // Day 1: Monday PRESENT
    const monday = new Date(Date.UTC(2026, 9, 5));
    await StreakService.processAttendanceEvent('user-001', 'gym-001', monday, 'PRESENT');
    (prisma as any).__seedMockAttendance({
      gymId: 'gym-001',
      userId: 'user-001',
      attendanceDate: monday,
      status: 'PRESENT',
    });

    // Day 2: Tuesday MISSED (no record)

    // Day 3: Wednesday PRESENT
    const wednesday = new Date(Date.UTC(2026, 9, 7));
    const result = await StreakService.processAttendanceEvent('user-001', 'gym-001', wednesday, 'PRESENT');

    // Tuesday was missed, so Wednesday starts a new streak of 1!
    expect(result.currentStreak).toBe(1);
  });

  it('STREAK-001-010: Idempotency - Duplicate processing of same attendance event does NOT double-increment streak/star', async () => {
    const monday = new Date(Date.UTC(2026, 9, 5));
    await StreakService.processAttendanceEvent('user-001', 'gym-001', monday, 'PRESENT', { isNewRecord: true });

    // Processing same event again with isNewRecord = false and previousStatus = 'PRESENT'
    const result2 = await StreakService.processAttendanceEvent('user-001', 'gym-001', monday, 'PRESENT', {
      isNewRecord: false,
      previousStatus: 'PRESENT',
    });

    expect(result2.currentStreak).toBe(1);
    expect(result2.starScore).toBe(1);
  });

  it('STREAK-001-011: Tenant Isolation - Reject processing when user gymId mismatches', async () => {
    const monday = new Date(Date.UTC(2026, 9, 5));

    await expect(
      StreakService.processAttendanceEvent('user-001', 'different-gym-id', monday, 'PRESENT')
    ).rejects.toThrow('Tenant scope mismatch');
  });

  it('STREAK-001-012: Sunday to Monday consecutive streak connection - Saturday PRESENT -> Sunday skipped -> Monday PRESENT = streak 2', async () => {
    // Saturday PRESENT
    const saturday = new Date(Date.UTC(2026, 9, 3)); // Oct 3, 2026 is Saturday
    await StreakService.processAttendanceEvent('user-001', 'gym-001', saturday, 'PRESENT');
    (prisma as any).__seedMockAttendance({
      gymId: 'gym-001',
      userId: 'user-001',
      attendanceDate: saturday,
      status: 'PRESENT',
    });

    // Sunday (Oct 4) skipped automatically (BR-SUNDAY-001)

    // Monday PRESENT (Oct 5)
    const monday = new Date(Date.UTC(2026, 9, 5));
    const result = await StreakService.processAttendanceEvent('user-001', 'gym-001', monday, 'PRESENT');

    // Since Sunday is skipped, previous eligible day for Monday is Saturday. Saturday was PRESENT!
    expect(result.currentStreak).toBe(2);
  });

  /* ==========================================
   * STREAK-002 TESTS
   * ========================================== */

  it('STREAK-002-001: Star score increases by 1 for each valid PRESENT day', async () => {
    const monday = new Date(Date.UTC(2026, 9, 5));
    const res = await StreakService.processAttendanceEvent('user-001', 'gym-001', monday, 'PRESENT');

    expect(res.starScore).toBe(1);
  });

  it('STREAK-002-002: EXCUSED status has zero effect on currentStreak and starScore', async () => {
    (prisma as any).__resetMockUser({ currentStreak: 3, longestStreak: 5, starScore: 4 });
    const monday = new Date(Date.UTC(2026, 9, 5));

    const result = await StreakService.processAttendanceEvent('user-001', 'gym-001', monday, 'EXCUSED');

    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(5);
    expect(result.starScore).toBe(4);
  });

  it('STREAK-002-003: Direct DLD helper signature calculateUserStreakAndStars works as expected', async () => {
    const monday = new Date(Date.UTC(2026, 9, 5));

    const result = await StreakService.calculateUserStreakAndStars('user-001', monday, true);

    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.starScore).toBe(1);
  });
});
