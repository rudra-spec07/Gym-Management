# 03. Algorithms & Business Rule Engine Specifications

This document presents production-ready pseudocode specifications for the dynamic QR verification engine, Sunday-safe streak engine, performance star score calculator, and automated 10-day inactivity scanner.

---

## 1. Sunday-Safe Streak & Star Engine Pseudocode

```typescript
/**
 * Executes post-attendance or batch streak recalculation for a user.
 * Enforces Sunday closure rule (BR-SUNDAY-001) & Star delta rules (BR-STAR-001).
 */
export async function calculateUserStreakAndStars(
  userId: string,
  eventDate: Date,
  isAttendancePresent: boolean
): Promise<{ currentStreak: number; longestStreak: number; starScore: number }> {
  // 1. Determine Day of Week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = eventDate.getDay();

  // 2. Fetch User Current Metrics
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  let { currentStreak, longestStreak, starScore } = user;

  // 3. Sunday Rule Check (BR-SUNDAY-001)
  if (dayOfWeek === 0) {
    // Sunday: Zero streak change, zero star score change
    return { currentStreak, longestStreak, starScore };
  }

  // 4. Eligible Gym Day Evaluation (Mon-Sat)
  if (isAttendancePresent) {
    // Increment streak and stars
    currentStreak += 1;
    starScore += 1;

    // Update longest streak watermark
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }
  } else {
    // Missed eligible day: Reset streak to 0, subtract 2 stars (floor at 0)
    currentStreak = 0;
    starScore = Math.max(0, starScore - 2);
  }

  // 5. Persist updated metrics
  await prisma.user.update({
    where: { id: userId },
    data: { currentStreak, longestStreak, starScore },
  });

  return { currentStreak, longestStreak, starScore };
}
```

---

## 2. Dynamic 10-Day Inactivity Cron Engine Pseudocode

```typescript
/**
 * Daily Cron Job executing at 23:59 PM Gym Time.
 * Scans active members for 10 consecutive missed eligible gym days (excluding Sundays).
 */
export async function runInactivityDetectionCron(): Promise<{ alertsTriggered: number }> {
  let alertsTriggered = 0;

  // 1. Fetch all members with active memberships
  const activeMemberships = await prisma.membership.findMany({
    where: { status: 'ACTIVE', endDate: { gte: new Date() } },
    include: { user: true },
  });

  const today = new Date();

  for (const membership of activeMemberships) {
    const userId = membership.userId;
    let missedEligibleDaysCount = 0;
    let checkCursor = new Date(today);

    // Look back until we evaluate 10 eligible gym days or hit a present day
    while (missedEligibleDaysCount < 10) {
      const dayOfWeek = checkCursor.getDay();

      // Skip Sunday in inactivity counter (BR-SUNDAY-001)
      if (dayOfWeek !== 0) {
        const attendance = await prisma.attendance.findUnique({
          where: {
            user_daily_attendance_unique: {
              userId: userId,
              attendanceDate: checkCursor,
            },
          },
        });

        if (attendance && attendance.status === 'PRESENT') {
          // Attendance found; consecutive missed chain broken
          break;
        } else {
          // No attendance logged for this eligible gym day
          missedEligibleDaysCount += 1;
        }
      }

      // Move cursor back 1 day
      checkCursor.setDate(checkCursor.getDate() - 1);
    }

    // 2. Trigger Admin Notification if exactly 10 consecutive missed days accumulated
    if (missedEligibleDaysCount === 10) {
      await prisma.notification.create({
        data: {
          userId: membership.userId,
          title: 'Member Inactivity Alert',
          body: `Member ${membership.user.name} has missed 10 consecutive eligible gym days.`,
          actionUrl: `/admin/members/${membership.userId}`,
        },
      });

      alertsTriggered += 1;
    }
  }

  return { alertsTriggered };
}
```
