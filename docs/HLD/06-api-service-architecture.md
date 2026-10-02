# 06. API & Service Integration Architecture

This document defines the REST API endpoint topology, Zod request validation pipeline, standardized JSON response contracts, and external third-party integration abstractions.

---

## 1. RESTful API Endpoint Catalog

| Endpoint | Method | Role | Req ID | Description |
| :--- | :---: | :---: | :---: | :--- |
| `/api/auth/register` | `POST` | Public | `AUTH-001` | Self-registration via QR onboarding token |
| `/api/auth/login` | `POST` | Public | `AUTH-002` | Credential login issuing HTTP-only session cookie |
| `/api/auth/logout` | `POST` | Auth | `AUTH-002` | Clears authentication session cookie |
| `/api/attendance/scan` | `POST` | Member | `ATT-001` | Validates QR code and records daily attendance |
| `/api/attendance/history` | `GET` | Member | `ATT-002` | Fetches monthly calendar attendance grid |
| `/api/user/dashboard` | `GET` | Member | `USER-001` | Returns member dashboard metrics, streak, & score |
| `/api/user/community` | `GET` | Member | `MEMBER-001` | Returns privacy-sanitized community leaderboard |
| `/api/user/diet` | `GET` | Member | `DIET-002` | Returns member assigned diet & meal plan |
| `/api/products` | `GET` | Member | `PRODUCT-002` | Returns active product catalog for store view |
| `/api/orders` | `POST` | Member | `PRODUCT-002` | Submits product purchase request / order |
| `/api/payments/create-order` | `POST` | Member | `PAYMENT-001` | Creates Razorpay order for membership plan |
| `/api/payments/verify` | `POST` | Member | `PAYMENT-001` | Server-side signature check & plan activation |
| `/api/webhooks/razorpay` | `POST` | Public | `BR-PAY-001` | Async Razorpay payment captured webhook |
| `/api/cron/inactivity-check` | `POST` | System | `NOTIFICATION-001` | Daily cron scanner for 10-day inactivity |
| `/api/admin/dashboard/stats` | `GET` | Admin | `ADMIN-001` | Aggregates executive dashboard KPIs |
| `/api/admin/members` | `GET` | Admin | `ADMIN-002` | Searchable/filterable member directory |
| `/api/admin/memberships/plans` | `POST` | Admin | `MEMBERSHIP-001` | Creates/updates membership plan templates |
| `/api/admin/diets` | `POST` | Admin | `DIET-001` | Creates diet templates & macro specifications |
| `/api/admin/products` | `POST` | Admin | `PRODUCT-001` | Creates/updates products & stock inventory |
| `/api/admin/attendance/override` | `POST` | Admin | `ATT-003` | Manual admin attendance adjustment |

---

## 2. Standard API Response Contract

All API route handlers return a consistent JSON payload structure:

### 2.1 Success Response (`HTTP 200 / 201`)
```json
{
  "success": true,
  "data": {
    "attendanceId": "att_89234792",
    "status": "PRESENT",
    "currentStreak": 12,
    "starScore": 15
  },
  "message": "Attendance successfully recorded for today."
}
```

### 2.2 Error Response (`HTTP 400 / 401 / 403 / 409 / 500`)
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_ATTENDANCE",
    "message": "Attendance already recorded for today at 08:15 AM.",
    "details": []
  }
}
```

---

## 3. Request Validation Pipeline (Zod Middleware)

Every incoming API payload passes through a Zod schema validation layer before reaching controller logic:

```typescript
// Example: Attendance Scan Payload Zod Schema
import { z } from 'zod';

export const AttendanceScanSchema = z.object({
  qrToken: z.string().min(10, 'QR Token is invalid'),
  timestamp: z.number().int().positive(),
  deviceLat: z.number().optional(),
  deviceLng: z.number().optional(),
});
```
