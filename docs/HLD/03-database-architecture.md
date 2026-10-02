# 03. Database Architecture & Persistence Layer

This document specifies the Neon PostgreSQL database architecture, Prisma ORM configuration, connection pooling strategy, entity-relationship model, and index optimizations.

---

## 1. Database Infrastructure (Neon PostgreSQL)

- **Database Engine**: Neon Serverless PostgreSQL 16+
- **Connection Management**: Neon Serverless Connection Pooling (`@neondatabase/serverless` / Prisma Accelerate)
- **Timezone Setting**: UTC database storage; business day boundaries resolved using Gym Local Timezone (`Asia/Kolkata`).
- **Migration Strategy**: Prisma Migrate (`npx prisma migrate dev` / `npx prisma migrate deploy`).

---

## 2. Entity-Relationship Overview

```mermaid
erDiagram
    USER ||--o{ MEMBERSHIP : has
    USER ||--o{ ATTENDANCE : logs
    USER ||--o{ STREAK_LOG : tracks
    USER ||--o{ PAYMENT : makes
    USER ||--o{ ORDER : places
    USER ||--o| DIET_ASSIGNMENT : receives
    USER ||--o{ NOTIFICATION : receives

    MEMBERSHIP_PLAN ||--o{ MEMBERSHIP : defines
    DIET_PLAN ||--o{ DIET_ITEM : contains
    DIET_PLAN ||--o{ DIET_ASSIGNMENT : assigned_in

    PRODUCT ||--o{ ORDER_ITEM : ordered_in
    ORDER ||--o{ ORDER_ITEM : contains
    ORDER ||--o| PAYMENT : paid_via

    USER {
        uuid id PK
        string email UK
        string phone UK
        string passwordHash
        enum role "MEMBER | ADMIN"
        enum status "PENDING | ACTIVE | INACTIVE | SUSPENDED"
        int currentStreak
        int longestStreak
        int starScore
        datetime createdAt
    }

    ATTENDANCE {
        uuid id PK
        uuid userId FK
        date attendanceDate
        enum status "PRESENT | ABSENT | EXCUSED"
        enum scanMethod "QR_SCAN | MANUAL_ADMIN"
        datetime timestamp
    }

    MEMBERSHIP {
        uuid id PK
        uuid userId FK
        uuid planId FK
        datetime startDate
        datetime endDate
        enum status "ACTIVE | EXPIRING_SOON | EXPIRED | CANCELLED"
    }

    MEMBERSHIP_PLAN {
        uuid id PK
        string name
        int durationDays
        decimal price
        boolean isActive
    }

    PAYMENT {
        uuid id PK
        uuid userId FK
        uuid membershipId FK
        string razorpayOrderId UK
        string razorpayPaymentId UK
        decimal amount
        enum status "PENDING | SUCCESS | FAILED"
        datetime createdAt
    }

    PRODUCT {
        uuid id PK
        string name
        decimal price
        int stockQuantity
        boolean isActive
    }

    ORDER {
        uuid id PK
        uuid userId FK
        decimal totalAmount
        enum status "PENDING | FULFILLED | CANCELLED"
        datetime createdAt
    }

    NOTIFICATION {
        uuid id PK
        uuid userId FK
        string title
        string body
        boolean isRead
        datetime createdAt
    }
```

---

## 3. High-Performance Indexing Strategy

To maintain target latencies ($\le 500 \text{ ms}$ check-in, $\le 50 \text{ ms}$ DB queries) under high concurrency, the following composite indexes and unique constraints are defined:

1. **Attendance Single Scan & Fast Lookup**:
   - `CREATE UNIQUE INDEX "idx_attendance_user_date" ON "Attendance" ("userId", "attendanceDate");`
   - *Purpose*: Guarantees single check-in per user per day at database level and eliminates race conditions.

2. **Daily Attendance Range & Streak Queries**:
   - `CREATE INDEX "idx_attendance_date_status" ON "Attendance" ("attendanceDate", "status");`
   - *Purpose*: Optimizes daily attendance counter and 10-day inactivity cron scanner.

3. **Active Membership Lookup**:
   - `CREATE INDEX "idx_membership_user_status_dates" ON "Membership" ("userId", "status", "startDate", "endDate");`
   - *Purpose*: Accelerates attendance pre-check authorization.

4. **Razorpay Payment Verification Lookup**:
   - `CREATE UNIQUE INDEX "idx_payment_razorpay_order" ON "Payment" ("razorpayOrderId");`
   - *Purpose*: Speeds up signature verification and webhook idempotency checks.
