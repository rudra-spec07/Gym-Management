import { prisma } from '../../lib/prisma';
import { verifyAttendanceQRToken } from '../../lib/token';
import { StreakService } from '../streak/streak.service';

export class AttendanceError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = 'ATTENDANCE_ERROR'
  ) {
    super(message);
    this.name = 'AttendanceError';
  }
}

export class AttendanceService {
  /**
   * Helper: Get current date in Gym timezone (Asia/Kolkata)
   */
  static getGymLocalDate(timeZone: string = 'Asia/Kolkata') {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    });

    const parts = formatter.formatToParts(now);
    const month = parts.find((p) => p.type === 'month')?.value || '01';
    const day = parts.find((p) => p.type === 'day')?.value || '01';
    const year = parts.find((p) => p.type === 'year')?.value || '2026';
    const weekday = parts.find((p) => p.type === 'weekday')?.value || 'Mon';

    const isSunday = weekday === 'Sun';
    const attendanceDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

    return { attendanceDate, isSunday, dateStr: `${year}-${month}-${day}` };
  }

  /**
   * Process QR Scan Attendance (ATT-001)
   */
  static async processScan(userId: string, gymId: string, qrTokenPayload: string) {
    const todayLocal = AttendanceService.getGymLocalDate();

    // 1. Verify Active Membership (endDate >= today)
    const activeMembership = await prisma.membership.findFirst({
      where: {
        userId,
        gymId,
        status: 'ACTIVE',
      },
      orderBy: { endDate: 'desc' },
    });

    if (!activeMembership || new Date(activeMembership.endDate) < todayLocal.attendanceDate) {
      throw new AttendanceError(
        403,
        'No active membership subscription found. Please activate or renew your membership plan.',
        'FORBIDDEN'
      );
    }

    // 2. Fetch Gym Details (for QR secret and Gym Code verification)
    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
    });

    if (!gym) {
      throw new AttendanceError(404, 'Gym tenant record not found', 'NOT_FOUND');
    }

    // 3. Verify QR Token (HMAC-SHA256, 45s expiry, tenant isolation)
    const qrVerification = verifyAttendanceQRToken(qrTokenPayload, gym.code, gym.qrSecret, 45000);
    if (!qrVerification.valid) {
      throw new AttendanceError(
        400,
        `Invalid or expired gym QR token: ${qrVerification.reason || 'Verification failed'}`,
        'INVALID_QR_TOKEN'
      );
    }

    // 4. Sunday Check (Asia/Kolkata timezone)
    if (todayLocal.isSunday) {
      throw new AttendanceError(400, 'Gym closed on Sundays', 'GYM_CLOSED_SUNDAY');
    }

    // 5. Atomic Daily Attendance Insert
    let attendanceRecord;
    try {
      attendanceRecord = await prisma.attendance.create({
        data: {
          gymId,
          userId,
          attendanceDate: todayLocal.attendanceDate,
          status: 'PRESENT',
          scanMethod: 'QR_SCAN',
        },
      });
    } catch (err: any) {
      // P2002 is Prisma unique constraint violation (user_gym_daily_attendance_unique)
      if (err.code === 'P2002') {
        throw new AttendanceError(
          409,
          'Attendance check-in already recorded for today',
          'DUPLICATE_ATTENDANCE'
        );
      }
      throw err;
    }

    // 6. Calculate & Update User Streak and Stars via Module 04 Engine
    await StreakService.processAttendanceEvent(
      userId,
      gymId,
      todayLocal.attendanceDate,
      'PRESENT',
      { isNewRecord: true }
    );

    return {
      id: attendanceRecord.id,
      attendanceDate: todayLocal.dateStr,
      status: attendanceRecord.status,
      scanMethod: attendanceRecord.scanMethod,
      timestamp: attendanceRecord.timestamp,
    };
  }

  /**
   * Get authenticated member's own attendance history (ATT-002)
   */
  static async getMemberHistory(
    userId: string,
    gymId: string,
    query: { from?: string; to?: string; limit?: number }
  ) {
    const whereCondition: any = {
      userId,
      gymId,
    };

    if (query.from || query.to) {
      whereCondition.attendanceDate = {};
      if (query.from) {
        const [y, m, d] = query.from.split('-').map(Number);
        whereCondition.attendanceDate.gte = new Date(Date.UTC(y, m - 1, d));
      }
      if (query.to) {
        const [y, m, d] = query.to.split('-').map(Number);
        whereCondition.attendanceDate.lte = new Date(Date.UTC(y, m - 1, d));
      }
    }

    const records = await prisma.attendance.findMany({
      where: whereCondition,
      orderBy: [
        { attendanceDate: 'desc' },
        { timestamp: 'desc' },
      ],
      take: query.limit || 50,
      select: {
        id: true,
        attendanceDate: true,
        status: true,
        scanMethod: true,
        timestamp: true,
        notes: true,
      },
    });

    const formattedHistory = records.map((record) => {
      const d = new Date(record.attendanceDate);
      const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      return {
        id: record.id,
        attendanceDate: dateStr,
        status: record.status,
        scanMethod: record.scanMethod,
        timestamp: record.timestamp,
        notes: record.notes,
      };
    });

    return {
      attendance: formattedHistory,
      totalCount: formattedHistory.length,
    };
  }

  /**
   * Admin Attendance Override & Manual Entry (ATT-003)
   */
  static async processManualOverride(
    adminUserId: string,
    adminGymId: string,
    input: {
      userId: string;
      attendanceDate: string;
      status: 'PRESENT' | 'ABSENT' | 'EXCUSED';
      notes?: string;
    }
  ) {
    // 1. Strict Tenant Isolation & Target Member Validation (IDOR Protection)
    const targetUser = await prisma.user.findFirst({
      where: {
        id: input.userId,
        gymId: adminGymId, // Must belong to admin's tenant gym!
      },
    });

    if (!targetUser) {
      throw new AttendanceError(
        403,
        'Member not found in your gym tenant scope',
        'FORBIDDEN'
      );
    }

    // 2. Parse attendanceDate to UTC Midnight Date
    const [year, month, day] = input.attendanceDate.split('-').map(Number);
    const attendanceDate = new Date(Date.UTC(year, month - 1, day));

    // 3. Check existing attendance record to determine if this is a NEW insertion or OVERRIDE
    const existingRecord = await prisma.attendance.findUnique({
      where: {
        user_gym_daily_attendance_unique: {
          gymId: adminGymId,
          userId: input.userId,
          attendanceDate,
        },
      },
    });

    // 4. Atomic Upsert Handling Create & Override Cases cleanly
    const attendanceRecord = await prisma.attendance.upsert({
      where: {
        user_gym_daily_attendance_unique: {
          gymId: adminGymId,
          userId: input.userId,
          attendanceDate,
        },
      },
      create: {
        gymId: adminGymId,
        userId: input.userId,
        attendanceDate,
        status: input.status,
        scanMethod: 'MANUAL_ADMIN',
        notes: input.notes || null,
      },
      update: {
        status: input.status,
        scanMethod: 'MANUAL_ADMIN',
        notes: input.notes || null,
      },
    });

    // 5. Gamification / Streak Engine (Module 04 Integration)
    await StreakService.processAttendanceEvent(
      input.userId,
      adminGymId,
      attendanceDate,
      input.status,
      {
        isNewRecord: !existingRecord,
        previousStatus: existingRecord ? existingRecord.status : null,
      }
    );

    // 6. Audit Logging (if AuditLog model is available)
    try {
      await prisma.auditLog.create({
        data: {
          adminId: adminUserId,
          action: 'MANUAL_ATTENDANCE_OVERRIDE',
          targetId: attendanceRecord.id,
          reason: input.notes || `Manual attendance set to ${input.status}`,
        },
      });
    } catch (err) {
      // Non-fatal logging fallback
    }

    const dateStr = `${attendanceDate.getUTCFullYear()}-${String(attendanceDate.getUTCMonth() + 1).padStart(2, '0')}-${String(attendanceDate.getUTCDate()).padStart(2, '0')}`;

    return {
      id: attendanceRecord.id,
      userId: targetUser.id,
      memberName: targetUser.name,
      attendanceDate: dateStr,
      status: attendanceRecord.status,
      scanMethod: attendanceRecord.scanMethod,
      timestamp: attendanceRecord.timestamp,
      notes: attendanceRecord.notes,
    };
  }
}
