# 06. Acceptance Criteria (BDD Specification)

This document maps end-to-end BDD (Behavior-Driven Development) Acceptance Criteria across all functional requirement IDs defined in `03-functional-requirements.md`.

---

## 1. Authentication & Registration (`AUTH-001`, `AUTH-002`)

### AC-AUTH-001: Successful Self-Registration via QR Code
- **Given** a prospective gym member scans the Gym Registration QR Code,
- **When** they fill out valid registration credentials (Name, Email, Mobile, Password) and submit the form,
- **Then** a new user account is created in Neon PostgreSQL with role `MEMBER` and status `PENDING_MEMBERSHIP`, an authenticated session cookie is generated, and the user is redirected directly to the Membership Plan selection page (`/user/membership/select`).

### AC-AUTH-002: Rejection of Duplicate User Registration
- **Given** an existing registered member with email `member@example.com`,
- **When** a user attempts to register a new account using `member@example.com`,
- **Then** the backend rejects the registration with `HTTP 400 Bad Request`, displaying the error message *"Account already exists with this email address. Please log in."* and providing a direct link to `/login`.

---

## 2. Attendance & Streak Engine (`ATT-001`, `STREAK-001`, `STREAK-002`)

### AC-ATT-001: Valid Daily Attendance QR Scan
- **Given** an authenticated member with an active membership scanning a valid dynamic Gym Attendance QR Code on a Monday,
- **When** the request is processed by `/api/attendance/scan`,
- **Then** an `Attendance` record is created with status `PRESENT`, the member's `CurrentStreak` increments by +1, their `StarScore` increments by +1, and a success notification `"Check-in Successful! Streak: X days"` is returned.

### AC-ATT-002: Prevention of Duplicate Same-Day Attendance Scans
- **Given** a member who has already checked in today at 07:30 AM,
- **When** the member scans the Gym Attendance QR code again at 06:00 PM on the same day,
- **Then** the backend rejects the scan with `HTTP 409 Conflict`, displaying *"Attendance already recorded today at 07:30 AM"*, without creating a duplicate record or altering the streak count.

### AC-ATT-003: Sunday Gym Closure Handling
- **Given** an active member scanning the Gym Attendance QR code on a Sunday,
- **When** the backend receives the request,
- **Then** the request is rejected with message *"Gym is closed on Sundays"*, and the streak count and star score remain unchanged.

### AC-STREAK-001: Sunday Streak Preservation
- **Given** a member who attended on Friday (Streak = 4) and attended on Saturday (Streak = 5),
- **When** the member attends on Monday following the closed Sunday,
- **Then** the system calculates `CurrentStreak = 6`, verifying that Sunday did not break or reset the consecutive attendance streak.

---

## 3. Inactivity Detection & Notifications (`NOTIFICATION-001`)

### AC-NOTIF-001: 10-Day Consecutive Inactivity Alerting
- **Given** an active member who has missed 10 consecutive eligible gym days (excluding Sundays),
- **When** the daily end-of-day inactivity detection job executes at 23:59 PM,
- **Then** an `InactivityAlert` is logged in the database, and an alert notification is delivered to the Admin Dashboard and Admin Notification Bell.

---

## 4. Membership Payments (`PAYMENT-001`)

### AC-PAY-001: Server-Verified Razorpay Payment Activation
- **Given** a member completing a membership fee payment via Razorpay checkout,
- **When** Razorpay returns payment identifiers (`razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature`) to `/api/payments/verify`,
- **Then** the backend calculates HMAC-SHA256 signature using `RAZORPAY_KEY_SECRET`. Upon signature match, the payment record is marked `SUCCESS`, and `Membership.Status` is set to `ACTIVE`.

### AC-PAY-002: Rejection of Tampered Payment Payload
- **Given** a malicious user attempting to send a forged `razorpay_signature` to `/api/payments/verify`,
- **When** the backend performs cryptographic verification,
- **Then** signature check fails, backend returns `HTTP 400 Bad Request`, membership status remains `INACTIVE`, and a security incident is logged.

---

## 5. Product Management & Ordering (`PRODUCT-001`, `PRODUCT-002`)

### AC-PROD-001: Product Purchase and Inventory Stock Deduction
- **Given** a gym product with stock count = 5,
- **When** an active member places an order for 2 units,
- **Then** an `Order` record is created, product inventory stock count decrements to 3, and an alert is delivered to the admin order queue.
