# Backend DLD - Module 06: Payment Gateway & Webhook Lifecycle

This document details the backend architectural design for Razorpay Order generation, HMAC-SHA256 signature verification, and asynchronous payment webhooks.

---

## 1. Functional Requirement Traceability
- `PAYMENT-001`: Membership Fee Online Purchase & Payment Gateway Integration
- `PAYMENT-002`: Member & Admin Payment History Logging

---

## 2. Prisma Model Definition

```prisma
model Payment {
  id                String        @id @default(uuid())
  userId            String
  user              User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  membershipId      String?
  membership        Membership?   @relation(fields: [membershipId], references: [id])
  razorpayOrderId   String        @unique
  razorpayPaymentId String?       @unique
  razorpaySignature String?
  amount            Decimal       @db.Decimal(10, 2)
  currency          String        @default("INR")
  status            PaymentStatus @default(PENDING)
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  order   Order?  @relation(fields: [orderId], references: [id])
  orderId String?

  @@index([userId, status])
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
}
```
