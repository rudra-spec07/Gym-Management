# 02. Granular REST API Specifications

This document defines the exact HTTP specifications, Zod schemas, parameters, and response contracts for the core API endpoints of the Gym Management Application.

---

## 1. Attendance Scan API (`ATT-001`)

### Endpoint Details
- **Path**: `POST /api/attendance/scan`
- **Authentication**: Required (`Role = MEMBER`)
- **Headers**: `Content-Type: application/json`, `Cookie: session_token=...`

### Request Zod Schema
```typescript
import { z } from 'zod';

export const AttendanceScanRequestSchema = z.object({
  qrTokenPayload: z.string().min(1, 'QR Token is required'),
  clientTimestamp: z.number().int().positive('Invalid timestamp'),
});
```

### Business Logic Execution Steps
1. Parse session cookie to authenticate `UserId`.
2. Query active membership for `UserId` where `endDate >= TODAY`. If no active plan, return `HTTP 403 Forbidden`.
3. Decode `qrTokenPayload` and compute expected HMAC-SHA256 signature using `QR_SECRET`. If signature check fails or token age > 45s, return `HTTP 400 Bad Request`.
4. Calculate current date in Gym Timezone (`Asia/Kolkata`). Check if today is Sunday. If Sunday, return `HTTP 400 Bad Request` *"Gym is closed on Sundays"*.
5. Attempt Prisma insert into `Attendance` table for `(userId, attendanceDate)`.
6. If unique constraint violation occurs (`user_daily_attendance_unique`), catch error and return `HTTP 409 Conflict` *"Attendance already recorded for today"*.
7. Update member's `currentStreak`, `longestStreak`, and `starScore`.
8. Return `HTTP 200 OK`.

### Success Response Payload (`HTTP 200 OK`)
```json
{
  "success": true,
  "data": {
    "attendanceId": "att_c7b8f9e1",
    "attendanceDate": "2026-10-02",
    "status": "PRESENT",
    "currentStreak": 5,
    "longestStreak": 12,
    "starScore": 8,
    "message": "Check-in successful! 5-day streak maintained!"
  }
}
```

---

## 2. Payment Verification API (`PAYMENT-001`)

### Endpoint Details
- **Path**: `POST /api/payments/verify`
- **Authentication**: Required (`Role = MEMBER`)

### Request Zod Schema
```typescript
export const PaymentVerifyRequestSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  planId: z.string().uuid(),
});
```

### Business Logic Execution Steps
1. Authenticate user from session token.
2. Calculate HMAC-SHA256 signature:
   ```crypto
   expectedSignature = hmac_sha256(razorpayOrderId + "|" + razorpayPaymentId, RAZORPAY_KEY_SECRET)
   ```
3. If `expectedSignature !== razorpaySignature`, set `Payment.status = FAILED` and return `HTTP 400 Bad Request` *"Invalid payment signature"*.
4. If match succeeds, update `Payment.status = SUCCESS`, set `razorpayPaymentId` and `razorpaySignature`.
5. Create/renew `Membership` record for `UserId` and `PlanId` setting `startDate = Today` and `endDate = Today + Plan.durationDays`. Set `Membership.status = ACTIVE`.
6. Return `HTTP 200 OK`.

### Success Response Payload (`HTTP 200 OK`)
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_981237",
    "membershipId": "mem_441209",
    "status": "ACTIVE",
    "startDate": "2026-10-02T00:00:00.000Z",
    "endDate": "2026-11-02T00:00:00.000Z"
  }
}
```
