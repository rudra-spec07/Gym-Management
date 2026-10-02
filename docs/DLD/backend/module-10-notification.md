# Backend DLD - Module 10: Inactivity Scanner & FCM Push Dispatcher

This document details the backend architectural design for automated 10-day member inactivity cron scanning and Firebase Cloud Messaging (FCM) push dispatching.

---

## 1. Functional Requirement Traceability
- `NOTIFICATION-001`: Automated 10-Day Member Inactivity Alerting
- `NOTIFICATION-002`: Push & In-App Notification System

---

## 2. Prisma Model Definition

```prisma
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
```

---

## 3. Inactivity Cron Service (`POST /api/cron/inactivity-check`)
- **Schedule**: Nightly at 23:59 PM (Gym Local Timezone)
- **Algorithm**:
  1. Iterate active member subscriptions.
  2. Count consecutive missed eligible days (excluding Sundays).
  3. If count == 10, insert `Notification` record and send FCM Push Alert to Gym Admins.
