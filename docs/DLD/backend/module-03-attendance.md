# Backend DLD - Module 03: Attendance & QR Check-in Engine

This document details the backend architectural design for dynamic QR token verification, single daily check-in locking, and manual admin overrides.

---

## 1. Functional Requirement Traceability
- `ATT-001`: QR-Based Daily Gym Attendance Verification
- `ATT-002`: Member Attendance History Visualization
- `ATT-003`: Admin Attendance Override & Manual Entry

---

## 2. Prisma Model Definition

```prisma
model Attendance {
  id             String           @id @default(uuid())
  userId         String
  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  attendanceDate DateTime         @db.Date
  status         AttendanceStatus @default(PRESENT)
  scanMethod     ScanMethod       @default(QR_SCAN)
  timestamp      DateTime         @default(now())
  notes          String?

  @@unique([userId, attendanceDate], name: "user_daily_attendance_unique")
  @@index([attendanceDate, status])
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  EXCUSED
}

enum ScanMethod {
  QR_SCAN
  MANUAL_ADMIN
}
```

---

## 3. REST API Specifications

### 3.1 Attendance Scan (`POST /api/attendance/scan`)
- **Authentication**: Required (`MEMBER`)
- **Zod Schema**:
  ```typescript
  export const AttendanceScanSchema = z.object({
    qrTokenPayload: z.string().min(10),
    clientTimestamp: z.number().int().positive(),
  });
  ```
- **Execution Flow**:
  1. Verify active membership (`endDate >= Today`). If inactive, throw `HTTP 403`.
  2. Verify HMAC-SHA256 signature of `qrTokenPayload` against `QR_SECRET`. If invalid/expired (>45s), throw `HTTP 400`.
  3. Determine date in Gym Timezone (`Asia/Kolkata`). Check if today is Sunday. If Sunday, throw `HTTP 400` *"Gym closed on Sundays"*.
  4. Perform atomic insert into `Attendance`. If duplicate key error (`user_daily_attendance_unique`), throw `HTTP 409 Conflict`.
  5. Invoke `calculateUserStreakAndStars()` to update streak and star count.
  6. Return `HTTP 200 OK`.
