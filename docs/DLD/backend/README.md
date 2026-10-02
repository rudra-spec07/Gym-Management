# Backend DLD Architecture Index

This folder contains the granular Backend Detailed Level Design specifications across all 10 core system modules.

Each module specifies:
- Prisma Schema models, attributes, enums, relations, and unique constraints.
- REST API endpoint routes, HTTP methods, headers, and Zod request/response validation schemas.
- Domain engine logic, business rule validations, error codes, and algorithms.

---

## 📂 Module Files

1. [module-01-auth.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/DLD/backend/module-01-auth.md) – Auth & Account Registration (`AUTH-001`, `AUTH-002`)
2. [module-02-user-member.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/DLD/backend/module-02-user-member.md) – Member Profile & Community Leaderboard (`USER-001`, `MEMBER-001`, `002`)
3. [module-03-attendance.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/DLD/backend/module-03-attendance.md) – Dynamic QR Check-in Engine & Admin Override (`ATT-001`, `ATT-002`, `ATT-003`)
4. [module-04-streak-engine.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/DLD/backend/module-04-streak-engine.md) – Sunday-Safe Streak Engine & Performance Star Score (`STREAK-001`, `STREAK-002`)
5. [module-05-membership.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/DLD/backend/module-05-membership.md) – Membership Plan Configuration & Subscription Engine (`MEMBERSHIP-001`, `002`)
6. [module-06-payment.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/DLD/backend/module-06-payment.md) – Razorpay Order Creation, HMAC Signature Check & Webhooks (`PAYMENT-001`, `002`)
7. [module-07-diet.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/DLD/backend/module-07-diet.md) – Diet Template Builder & Member Assignment Services (`DIET-001`, `DIET-002`)
8. [module-08-product.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/DLD/backend/module-08-product.md) – Product Store Inventory Lock & Order Processing (`PRODUCT-001`, `PRODUCT-002`)
9. [module-09-admin.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/DLD/backend/module-09-admin.md) – Executive Analytics KPI Aggregator & Member Detail Drawer (`ADMIN-001`, `ADMIN-002`)
10. [module-10-notification.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/DLD/backend/module-10-notification.md) – 10-Day Inactivity Cron Scanner & FCM Push Dispatcher (`NOTIFICATION-001`, `002`)
