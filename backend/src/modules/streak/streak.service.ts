import { AttendanceStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface StreakUpdateResult {
  currentStreak: number;
  longestStreak: number;
  starScore: number;
}

export class StreakService {
  /**
   * Helper: Calculate previous eligible working day (skipping Sundays)
   * Input attendanceDate is UTC midnight Date representing local YYYY-MM-DD.
   */
  static getPreviousEligibleDay(attendanceDate: Date): Date {
    const d = new Date(attendanceDate.getTime());
    const dayOfWeek = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // If Monday (1), previous eligible day is Saturday (-2 calendar days)
    // For Tue-Sat (2-6), previous eligible day is yesterday (-1 calendar day)
    const daysToSubtract = dayOfWeek === 1 ? 2 : 1;
    d.setUTCDate(d.getUTCDate() - daysToSubtract);
    return d;
  }

  /**
   * Core Streak Engine (STREAK-001 & STREAK-002)
   * Process attendance event for a member and update currentStreak, longestStreak, starScore.
   */
  static async processAttendanceEvent(
    userId: string,
    gymId: string,
    attendanceDate: Date,
    status: AttendanceStatus,
    options: {
      isNewRecord?: boolean;
      previousStatus?: AttendanceStatus | null;
      tx?: any;
    } = {}
  ): Promise<StreakUpdateResult> {
    const db = options.tx || prisma;

    // Fetch user
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Tenant Isolation Check
    if (user.gymId !== gymId) {
      throw new Error(`Tenant scope mismatch for user ${userId} and gym ${gymId}`);
    }

    // Sunday Rule (BR-SUNDAY-001): Zero effect
    const dayOfWeek = attendanceDate.getUTCDay(); // 0 = Sunday
    if (dayOfWeek === 0) {
      return {
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        starScore: user.starScore,
      };
    }

    const isNew = options.isNewRecord ?? true;
    const prevStatus = options.previousStatus ?? null;

    // Idempotency: If existing record and status unchanged, do nothing
    if (!isNew && prevStatus === status) {
      return {
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        starScore: user.starScore,
      };
    }

    let { currentStreak, longestStreak, starScore } = user;

    if (status === 'PRESENT') {
      if (isNew || prevStatus !== 'PRESENT') {
        // Evaluate consecutive streak:
        // Check if there was PRESENT or EXCUSED attendance on the previous eligible working day
        const prevEligibleDate = StreakService.getPreviousEligibleDay(attendanceDate);

        const prevAttendance = await db.attendance.findUnique({
          where: {
            user_gym_daily_attendance_unique: {
              gymId,
              userId,
              attendanceDate: prevEligibleDate,
            },
          },
        });

        const hadPrevAttendance =
          prevAttendance &&
          (prevAttendance.status === 'PRESENT' || prevAttendance.status === 'EXCUSED');

        if (hadPrevAttendance && currentStreak > 0) {
          currentStreak += 1;
        } else {
          currentStreak = 1;
        }

        // Adjust star score (+1 star for PRESENT)
        if (!isNew && prevStatus === 'ABSENT') {
          starScore = starScore + 3; // Revert -2 ABSENT penalty + add 1 star for PRESENT
        } else {
          starScore += 1;
        }

        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
      }
    } else if (status === 'ABSENT') {
      if (isNew || prevStatus !== 'ABSENT') {
        currentStreak = 0;
        // Subtract 2 stars for ABSENT
        const penalty = !isNew && prevStatus === 'PRESENT' ? 3 : 2;
        starScore = Math.max(0, starScore - penalty);
      }
    } else if (status === 'EXCUSED') {
      // EXCUSED Rule: Zero effect on streak and stars
      if (!isNew && prevStatus === 'PRESENT') {
        starScore = Math.max(0, starScore - 1);
      } else if (!isNew && prevStatus === 'ABSENT') {
        starScore = starScore + 2;
      }
    }

    // Update User in DB
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        currentStreak,
        longestStreak,
        starScore,
      },
    });

    return {
      currentStreak: updatedUser.currentStreak,
      longestStreak: updatedUser.longestStreak,
      starScore: updatedUser.starScore,
    };
  }

  /**
   * DLD direct helper signature match: calculateUserStreakAndStars
   */
  static async calculateUserStreakAndStars(
    userId: string,
    eventDate: Date,
    isAttendancePresent: boolean,
    gymId?: string
  ): Promise<StreakUpdateResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const targetGymId = gymId || user.gymId;
    const status: AttendanceStatus = isAttendancePresent ? 'PRESENT' : 'ABSENT';

    return StreakService.processAttendanceEvent(
      userId,
      targetGymId,
      eventDate,
      status
    );
  }
}
