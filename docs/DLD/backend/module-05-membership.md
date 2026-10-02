# Backend DLD - Module 05: Membership Management & Subscriptions

This document details the backend architectural design for membership plan CRUD, active membership tracking, and expiry status state machines.

---

## 1. Functional Requirement Traceability
- `MEMBERSHIP-001`: Membership Plan Configuration
- `MEMBERSHIP-002`: Member Subscription Status & Expiry Management

---

## 2. Prisma Model Definitions

```prisma
model MembershipPlan {
  id           String   @id @default(uuid())
  name         String
  description  String?
  durationDays Int
  price        Decimal  @db.Decimal(10, 2)
  benefits     String[]
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  memberships Membership[]
}

model Membership {
  id        String           @id @default(uuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  planId    String
  plan      MembershipPlan   @relation(fields: [planId], references: [id])
  startDate DateTime
  endDate   DateTime
  status    MembershipStatus @default(ACTIVE)
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  payments Payment[]

  @@index([userId, status, startDate, endDate])
}

enum MembershipStatus {
  ACTIVE
  EXPIRING_SOON
  EXPIRED
  CANCELLED
}
```
