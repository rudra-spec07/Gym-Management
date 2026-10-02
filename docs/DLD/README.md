# Gym Management Application - Detailed Level Design (DLD)

Welcome to the Detailed Level Design (DLD) documentation suite for the **Gym Management Application**.

To maintain strict alignment across frontend web, backend APIs, and mobile app/PWA interfaces, the DLD is organized into three dedicated architecture tiers:

---

## 📂 DLD Architecture Structure

```
docs/DLD/
├── README.md                           # Master DLD Directory & Mapping Matrix
├── backend/                            # Backend APIs, Prisma Schema, Data Models, & Algorithms
│   ├── README.md
│   ├── module-01-auth.md               # Auth & Registration APIs, JWT, Bcrypt
│   ├── module-02-user-member.md        # Member Profile & Community Leaderboard APIs
│   ├── module-03-attendance.md         # Dynamic QR Check-in Engine, Single Lock, Admin Override
│   ├── module-04-streak-engine.md      # Sunday-Safe Streak & Performance Star Calculation Engine
│   ├── module-05-membership.md         # Membership Plan CRUD & Expiry Lifecycle Engine
│   ├── module-06-payment.md            # Razorpay Order Creation, HMAC Signature & Webhooks
│   ├── module-07-diet.md               # Diet Template CRUD & Assignment Services
│   ├── module-08-product.md            # Product Inventory Stock Lock & Order Processing
│   ├── module-09-admin.md              # Executive KPI Aggregator & Member Detail Queries
│   └── module-10-notification.md       # 10-Day Inactivity Cron Scanner & FCM Push Dispatcher
├── frontend/                           # Next.js Web Application UI, RSC, & Client Components
│   ├── README.md
│   ├── module-01-auth.md               # Registration QR Page, Login Form, Session Context
│   ├── module-02-user-member.md        # Member Dashboard, Community Leaderboard View
│   ├── module-03-attendance.md         # Attendance Calendar Grid & Manual Admin Override Drawer
│   ├── module-04-streak-engine.md      # Streak Widget, Star Score Progress Cards
│   ├── module-05-membership.md         # Membership Plan Selection & Subscription Cards
│   ├── module-06-payment.md            # Razorpay Web Checkout Modal & Payment History Table
│   ├── module-07-diet.md               # Assigned Diet Meal Breakdown & Admin Diet Builder
│   ├── module-08-product.md            # Product Store Catalog & Admin Stock Inventory Table
│   ├── module-09-admin.md              # Executive Admin KPI Cards, Searchable Member Drawer
│   └── module-10-notification.md       # In-App Notification Bell Menu & Admin Alerts
└── mobile/                             # Mobile App / PWA Views, Camera Scanner, & Push Receivers
    ├── README.md
    ├── module-01-auth.md               # Mobile QR Registration Scanner & Quick Login
    ├── module-02-user-member.md        # Mobile Member Home Screen & Community Board
    ├── module-03-attendance.md         # Native Camera QR Scanner Component & Check-in Screen
    ├── module-04-streak-engine.md      # Mobile Streak Flame Animations & Star Badges
    ├── module-05-membership.md         # Mobile Plan Card & One-Touch Renewal Screen
    ├── module-06-payment.md            # Razorpay Mobile SDK / WebView Integration
    ├── module-07-diet.md               # Mobile Daily Meal Timeline & Calorie Progress Rings
    ├── module-08-product.md            # Mobile Product Carousel & One-Tap Purchase Request
    ├── module-09-admin.md              # Admin Mobile Dashboard View
    └── module-10-notification.md       # Native FCM Push Notification Listener & Alert Center
```

---

## 🔗 Architecture Mapping Matrix

| Module | Functional Requirements | Backend API / Service | Frontend Web Component | Mobile / PWA View |
| :--- | :--- | :--- | :--- | :--- |
| **01. Auth** | `AUTH-001`, `AUTH-002` | `POST /api/auth/register`<br>`POST /api/auth/login` | `RegisterQRPage`<br>`LoginForm` | `MobileQRScanRegister`<br>`MobileLoginScreen` |
| **02. User** | `USER-001`, `MEMBER-001`, `002` | `GET /api/user/profile`<br>`GET /api/user/community` | `MemberDashboard`<br>`CommunityLeaderboard` | `MobileHomeScreen`<br>`MobileCommunityBoard` |
| **03. Attendance** | `ATT-001`, `ATT-002`, `ATT-003` | `POST /api/attendance/scan`<br>`GET /api/attendance/history` | `AttendanceCalendar`<br>`AdminOverrideDrawer` | `NativeCameraQRScanner`<br>`MobileCheckinResult` |
| **04. Streak** | `STREAK-001`, `STREAK-002` | `StreakEngine.recalculate()` | `StreakWidget`<br>`StarScoreProgress` | `StreakFlameAnimation`<br>`StarBadgeCard` |
| **05. Membership**| `MEMBERSHIP-001`, `002` | `GET /api/memberships/plans`<br>`POST /api/admin/plans` | `PlanSelectionGrid`<br>`AdminPlanBuilder` | `MobilePlanCard`<br>`MobileRenewalSheet` |
| **06. Payment** | `PAYMENT-001`, `PAYMENT-002` | `POST /api/payments/verify`<br>`POST /api/webhooks/razorpay` | `RazorpayCheckoutModal`<br>`PaymentHistoryTable` | `MobileRazorpayModal`<br>`MobileReceiptView` |
| **07. Diet** | `DIET-001`, `DIET-002` | `GET /api/user/diet`<br>`POST /api/admin/diets` | `DietMealSchedule`<br>`AdminDietBuilder` | `MobileMealTimeline`<br>`MobileMacroRings` |
| **08. Product** | `PRODUCT-001`, `PRODUCT-002` | `GET /api/products`<br>`POST /api/orders` | `ProductCatalogStore`<br>`AdminStockTable` | `MobileProductGrid`<br>`MobilePurchaseSheet` |
| **09. Admin** | `ADMIN-001`, `ADMIN-002` | `GET /api/admin/dashboard/stats`<br>`GET /api/admin/members` | `AdminKPIDashboard`<br>`MemberDetailDrawer` | `MobileAdminDashboard`<br>`MobileMemberSearch` |
| **10. Notif** | `NOTIFICATION-001`, `002` | `POST /api/cron/inactivity-check`<br>`FCM.send()` | `InAppNotificationBell`<br>`AdminAlertBanner` | `FCMPushReceiver`<br>`MobileNotificationCenter` |
