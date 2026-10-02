# Backend DLD - Module 04: Streak Engine & Performance Star Score

This document details the domain engine for calculating consecutive gym attendance streaks and star scores while preserving Sunday closure rules.

---

## 1. Functional Requirement Traceability
- `STREAK-001`: Consecutive Attendance Streak Calculation Engine
- `STREAK-002`: Member Performance Star/Score Engine

---

## 2. Streak Engine Service Implementation

```typescript
export async function calculateUserStreakAndStars(
  userId: string,
  eventDate: Date,
  isAttendancePresent: boolean
): Promise<{ currentStreak: number; longestStreak: number; starScore: number }> {
  const dayOfWeek = eventDate.getDay(); // 0 = Sunday

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  let { currentStreak, longestStreak, starScore } = user;

  // Sunday Rule (BR-SUNDAY-001): Zero effect
  if (dayOfWeek === 0) {
    return { currentStreak, longestStreak, starScore };
  }

  // Eligible Day Evaluation (Mon-Sat)
  if (isAttendancePresent) {
    currentStreak += 1;
    starScore += 1;
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }
  } else {
    currentStreak = 0;
    starScore = Math.max(0, starScore - 2);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { currentStreak, longestStreak, starScore },
  });

  return { currentStreak, longestStreak, starScore };
}
```
