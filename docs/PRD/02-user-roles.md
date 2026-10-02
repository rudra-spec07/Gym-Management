# 02. User Roles & Access Control (RBAC)

## 1. Actor Definitions

| Actor | Role Description | Authentication Method |
| :--- | :--- | :--- |
| **System Administrator (Admin)** | Gym owner or authorized staff responsible for managing gym configuration, members, plans, diets, products, and observing system analytics/alerts. | Secure Email/Password + JWT / Session Cookie |
| **Gym Member (User)** | Registered fitness center member utilizing the application to check in via QR code, track streaks, manage subscriptions, view diets, and purchase products. | Secure Phone/Email + Password / OTP Session |
| **Unauthenticated Guest** | Prospective member scanning the Registration QR code or reaching the login/landing portal. | None (Public route limited to registration flow) |

---

## 2. Role-Based Access Control (RBAC) Permission Matrix

| Module / Feature | Unauthenticated Guest | Authenticated Member | Authenticated Admin |
| :--- | :---: | :---: | :---: |
| **Public Registration QR Scan** | ✅ Access | ❌ Redirect to Dashboard | ❌ Redirect to Admin Panel |
| **Member Self-Account Creation** | ✅ Access | ❌ Restricted | ❌ Restricted |
| **User Login / Authentication** | ✅ Access | ✅ Logged In | ✅ Logged In |
| **View Member Personal Dashboard** | ❌ Denied | ✅ Full Access (Own data) | ✅ View-as Member |
| **Attendance QR Scan & Processing** | ❌ Denied | ✅ Allowed (Backend Validated) | ❌ Restricted |
| **View Own Streak & Attendance History** | ❌ Denied | ✅ Allowed | ✅ Allowed (Under Member Detail) |
| **View Member Community (Public Streaks)** | ❌ Denied | ✅ Sanitized View Only | ✅ Full View |
| **Select & Pay Membership Plan** | ❌ Denied | ✅ Allowed (Razorpay) | ❌ N/A |
| **View Assigned Diet Plan** | ❌ Denied | ✅ Allowed | ✅ Full CRUD |
| **View Products Catalog** | ❌ Denied | ✅ Allowed | ✅ Full CRUD |
| **Purchase / Request Gym Product** | ❌ Denied | ✅ Allowed | ✅ Order Status Updates |
| **Admin Analytics Dashboard** | ❌ Denied | ❌ Denied | ✅ Full Access |
| **Member Management (View/Edit/Status)** | ❌ Denied | ❌ Denied | ✅ Full Access |
| **Membership Plan Configuration (CRUD)** | ❌ Denied | ❌ Denied | ✅ Full Access |
| **Manual Attendance Correction** | ❌ Denied | ❌ Denied | ✅ Restricted Override |
| **Receive Inactivity Notifications (10 Days)**| ❌ Denied | ❌ Denied | ✅ Triggered Alert Target |

---

## 3. Data Privacy & Scoping Rules

1. **Member Data Scoping**: Standard members can ONLY query, read, or mutate their own entity records (`UserId == Session.UserId`). Any direct object reference (IDOR) attempt to access another member's profile, payment, or diet returns `HTTP 403 Forbidden`.
2. **Community Visibility Sanitation**: The Member Community section exposes ONLY `Name`, `Profile Image URL`, and `Current Streak`. Sensitive attributes (`Email`, `Phone`, `Payment Details`, `Membership ID`, `Address`, `Diet Plan`) are strictly stripped at the API response projection layer.
3. **Admin Administrative Boundaries**: Admin users have complete read access to member operational metrics but cannot read decrypted user passwords or sensitive payment authorization tokens.
