# 01. Complete Prisma Database Schema Specification

This document provides the complete, production-ready `schema.prisma` file definition for the Gym Management Application on Neon PostgreSQL.

---

## 📄 `prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ==========================================
// ENUMS
// ==========================================

enum UserRole {
  ADMIN
  MEMBER
}

enum UserStatus {
  PENDING_MEMBERSHIP
  ACTIVE
  INACTIVE
  SUSPENDED
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

enum MembershipStatus {
  ACTIVE
  EXPIRING_SOON
  EXPIRED
  CANCELLED
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
}

enum OrderStatus {
  PENDING
  FULFILLED
  CANCELLED
}

// ==========================================
// MODELS
// ==========================================

model User {
  id            String      @id @default(uuid())
  email         String      @unique
  phone         String      @unique
  name          String
  passwordHash  String
  role          UserRole    @default(MEMBER)
  status        UserStatus  @default(PENDING_MEMBERSHIP)
  profilePicUrl String?
  fitnessGoal   String?
  
  // Gamification Metrics
  currentStreak Int         @default(0)
  longestStreak Int         @default(0)
  starScore     Int         @default(0)
  
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  // Relations
  memberships     Membership[]
  attendances     Attendance[]
  payments        Payment[]
  orders          Order[]
  dietAssignments DietAssignment[]
  notifications   Notification[]
  auditLogs       AuditLog[]

  @@index([status])
  @@index([role])
}

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

model DietPlan {
  id             String   @id @default(uuid())
  title          String
  description    String?
  category       String   // e.g., Weight Loss, Muscle Gain
  targetCalories Int
  proteinGrams   Int
  carbsGrams     Int
  fatsGrams      Int
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  dietItems       DietItem[]
  dietAssignments DietAssignment[]
}

model DietItem {
  id         String   @id @default(uuid())
  dietPlanId String
  dietPlan   DietPlan @relation(fields: [dietPlanId], references: [id], onDelete: Cascade)
  mealType   String   // Breakfast, Lunch, Pre-workout, Post-workout, Dinner
  foodName   String
  quantity   String
  calories   Int
}

model DietAssignment {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  dietPlanId String
  dietPlan   DietPlan @relation(fields: [dietPlanId], references: [id])
  assignedAt DateTime @default(now())

  @@unique([userId])
}

model Product {
  id            String   @id @default(uuid())
  name          String
  description   String?
  category      String   // Protein, Creatine, Accessories
  price         Decimal  @db.Decimal(10, 2)
  stockQuantity Int      @default(0)
  imageUrl      String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  orderItems OrderItem[]
}

model Order {
  id          String      @id @default(uuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  totalAmount Decimal     @db.Decimal(10, 2)
  status      OrderStatus @default(PENDING)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  orderItems OrderItem[]
  payments   Payment[]
}

model OrderItem {
  id        String  @id @default(uuid())
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  unitPrice Decimal @db.Decimal(10, 2)
}

model Notification {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  body      String
  actionUrl String?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId, isRead])
}

model AuditLog {
  id        String   @id @default(uuid())
  adminId   String
  admin     User     @relation(fields: [adminId], references: [id])
  action    String
  targetId  String?
  reason    String
  createdAt DateTime @default(now())
}
```
