# 03. Functional Requirements

This document contains the detailed functional requirements for the Gym Management Application. Every requirement is assigned a unique ID to ensure traceability across HLD, DLD, Prisma Schema, API specifications, and testing.

---

## 1. Authentication & Account Management (AUTH)

### AUTH-001: Member Self-Registration via QR Code
- **Requirement ID**: `AUTH-001`
- **Requirement Name**: Member Self-Registration via QR Code
- **Actor**: Unauthenticated Guest / Prospective Member
- **Description**: Allows a new user to scan a public Gym Registration QR Code, complete an online registration form, create an account, select a membership plan, and initialize their profile without requiring manual admin data entry.
- **Preconditions**:
  1. The user has scanned the dynamic or static Gym Registration QR code.
  2. The registration token/URL embedded in the QR is valid.
- **Main Flow**:
  1. User scans Registration QR code using a mobile device camera.
  2. Browser navigates to `/register?token=<REGISTER_TOKEN>`.
  3. System renders the registration page with fields: Full Name, Email, Mobile Number, Password, and Target Fitness Goal.
  4. User fills out and submits the registration form.
  5. Backend validates input schema (Zod validation for email format, phone format, password strength).
  6. Backend checks for existing user account by Email / Phone.
  7. Backend creates a new `User` record with role `MEMBER` and status `PENDING_MEMBERSHIP`.
  8. System automatically redirects user to the Membership Plan Selection page (`PAYMENT-001`).
- **Alternative Flow**:
  1. If Email or Mobile Number already exists: System displays error message *"Account already exists with this email/phone. Please log in."* with a button to redirect to `/login`.
- **Validation**:
  - Email must be valid RFC 5322 syntax.
  - Mobile number must be 10-digit E.164 compliant format.
  - Password must be at least 8 characters containing 1 uppercase, 1 lowercase, 1 number.
- **Business Rules**: `BR-REG-001` (Admin zero manual entry rule). `BR-REG-002` (Account status defaults to `PENDING_MEMBERSHIP` until payment completed).
- **Acceptance Criteria**:
  - Given a new user scanning a valid Registration QR Code,
  - When they enter valid personal details and submit,
  - Then a user record is created in Neon PostgreSQL, session JWT is established, and user is routed to plan selection.
- **Edge Cases**:
  - Scanning registration QR when already logged in: System redirects user directly to their Member Dashboard (`USER-001`).
- **Dependencies**: `MEMBERSHIP-001`, `PAYMENT-001`.

---

### AUTH-002: User Authentication & Session Management
- **Requirement ID**: `AUTH-002`
- **Requirement Name**: Secure User & Admin Login / Logout
- **Actor**: Member, Admin
- **Description**: Authenticates members and administrators using email/phone and password, issuing secure HTTP-only cookies / JWT tokens with role-based routing.
- **Preconditions**: User record exists in database.
- **Main Flow**:
  1. User visits `/login` and enters credentials.
  2. System validates input and authenticates against hashed password (bcrypt/argon2).
  3. System generates session token stored in secure `HTTP-Only`, `SameSite=Lax`, `Secure` cookie.
  4. If user role is `ADMIN`, redirect to `/admin/dashboard`.
  5. If user role is `MEMBER`, redirect to `/user/dashboard`.
- **Alternative Flow**: Invalid password or non-existent user returns `HTTP 401 Unauthorized` with generic error *"Invalid email/phone or password"*.
- **Validation**: Input sanity check preventing SQL injection via Prisma parameterized queries.
- **Business Rules**: Max 5 consecutive failed login attempts before 15-minute temporary lockout.
- **Acceptance Criteria**:
  - Given valid credentials, user is logged in and redirected to their respective role dashboard.
- **Edge Cases**: Expired token mid-session redirects cleanly to `/login` with return URL query param.
- **Dependencies**: None.

---

## 2. User & Member Dashboard (USER / MEMBER)

### USER-001: Member Dashboard Metrics & Activity Overview
- **Requirement ID**: `USER-001`
- **Requirement Name**: Member Dashboard Display
- **Actor**: Authenticated Member
- **Description**: Renders a comprehensive, personalized dashboard for the gym member showing fitness metrics, streak status, score stars, attendance calendar, active diet plan, membership status, and gym products.
- **Preconditions**: Member is authenticated with an active session.
- **Main Flow**:
  1. Member accesses `/user/dashboard`.
  2. Backend fetches member profile, active membership details, current attendance streak, longest streak, current star score, today's attendance flag, assigned diet summary, and unread notifications.
  3. Dashboard renders:
     - Streak Card: Current streak (in days), Longest streak, Star score.
     - Today's Check-in Status: "Checked In" with timestamp OR "Not Checked In" CTA to scan QR.
     - Attendance Calendar Widget: Visual monthly grid highlighting attended days, missed days, and closed Sundays.
     - Active Membership Card: Plan Name, Expiry Date, Days Remaining, Renewal CTA.
     - Assigned Diet Preview: Today's meal schedule.
     - Notification Highlights.
- **Alternative Flow**:
  - If member has no active membership: Render prominent banner *"Your membership is inactive/expired. [Renew Now]"*.
- **Validation**: Backend ensures data fetched belongs strictly to `Session.UserId`.
- **Business Rules**: `BR-STREAK-001`, `BR-SUNDAY-001`.
- **Acceptance Criteria**:
  - Given an authenticated member, accessing the dashboard displays accurate streak counts, attendance history, membership status, and diet overview without delay.
- **Edge Cases**: First-time user with zero attendance history sees empty-state guidance.
- **Dependencies**: `ATT-001`, `STREAK-001`, `MEMBERSHIP-001`, `DIET-001`.

---

### MEMBER-001: Member Community Profile & Leaderboard
- **Requirement ID**: `MEMBER-001`
- **Requirement Name**: Member Community Section & Privacy Safeguards
- **Actor**: Authenticated Member
- **Description**: Displays a community streak board allowing gym members to view peer member streaks and foster motivation, strictly enforcing privacy rules.
- **Preconditions**: Member is authenticated.
- **Main Flow**:
  1. Member navigates to `/user/community`.
  2. Backend queries list of active members ordered by `CurrentStreak` descending.
  3. API response projects ONLY public attributes: `FirstName`, `LastNameInitial` (e.g. "John D."), `ProfilePictureUrl`, and `CurrentStreak`.
  4. Frontend renders leaderboard and member grid.
- **Alternative Flow**: User searches for a specific member by first name.
- **Validation**: API explicitly excludes sensitive fields (`Phone`, `Email`, `Address`, `PaymentHistory`, `MembershipDetails`, `DietPlan`).
- **Business Rules**: `BR-PRIVACY-001` (Strict PII redaction for community views).
- **Acceptance Criteria**:
  - Given any member viewing the community section,
  - When the list renders,
  - Then no PII (phone, email, payment status, full address) is present in the DOM or API payloads.
- **Edge Cases**: Member has privacy toggle "Hide me from community leaderboard" enabled (if implemented).
- **Dependencies**: `STREAK-001`.

---

### MEMBER-002: Member Profile Management
- **Requirement ID**: `MEMBER-002`
- **Requirement Name**: Member Profile View & Update
- **Actor**: Authenticated Member
- **Description**: Enables members to view and update personal contact information, fitness goals, and profile images.
- **Preconditions**: Member is authenticated.
- **Main Flow**:
  1. Member navigates to `/user/profile`.
  2. Member views current profile data.
  3. Member updates Fitness Goal or uploads a new Profile Avatar (stored via Cloudinary/S3).
  4. Backend updates `User` record and returns success toast.
- **Validation**: Avatar file size < 5MB; image formats `jpg, png, webp`.
- **Business Rules**: Email address and Phone number updates require verification if modified.
- **Acceptance Criteria**: Profile changes persist immediately in PostgreSQL database.
- **Dependencies**: External S3/Cloudinary service integration.

---

## 3. Attendance & Scan System (ATT)

### ATT-001: Attendance QR Code Scan & Verification
- **Requirement ID**: `ATT-001`
- **Requirement Name**: QR-Based Daily Gym Attendance Verification
- **Actor**: Authenticated Member
- **Description**: Enables members to check in at the gym by scanning a physical or dynamic Attendance QR Code displayed at the gym premises.
- **Preconditions**:
  1. Member is authenticated on mobile app/browser.
  2. Member possesses an ACTIVE membership.
  3. Today is an eligible gym day (Monday through Saturday; Sunday excluded).
- **Main Flow**:
  1. Member clicks "Scan Attendance QR" on `/user/attendance`.
  2. Member scans the physical/dynamic QR code at the gym desk.
  3. Frontend transmits payload `{ qrPayload, timestamp, locationCoords? }` to API `/api/attendance/scan`.
  4. Backend verifies QR signature and dynamic time-window validity (`BR-QR-001`).
  5. Backend checks if today is Sunday (`BR-SUNDAY-001`). If Sunday, reject scan with message *"Gym is closed on Sundays."*
  6. Backend validates member membership status (`BR-MEM-001`). If inactive/expired, reject with message *"Membership expired."*
  7. Backend queries `Attendance` table for `UserId` and `Date == Today(Gym Local Timezone)`.
  8. If attendance already exists for today, reject scan with message *"Attendance already recorded for today."* (`BR-ATT-001`).
  9. Backend inserts new `Attendance` record with status `PRESENT`, timestamp, and verification method `QR_SCAN`.
  10. Backend invokes Streak & Score Engine (`STREAK-001`, `STREAK-002`) to update current streak and stars.
  11. Backend returns success response with updated streak count.
- **Alternative Flow**:
  - *Duplicate Scan*: Step 8 detects existing record -> Returns `HTTP 409 Conflict` with `"Attendance already recorded today at 08:15 AM"`.
  - *Expired Membership*: Step 6 detects status `EXPIRED` -> Returns `HTTP 403 Forbidden` with direct link to Membership Renewal.
- **Validation**:
  - QR Code payload must contain non-replayable signed token (HMAC-SHA256).
  - Timezone lock: Date calculated using Gym Local Timezone (e.g. Asia/Kolkata), not client device clock.
- **Business Rules**: `BR-ATT-001` (One attendance per user per eligible gym day). `BR-SUNDAY-001` (Sunday gym closure). `BR-QR-001` (QR token security).
- **Acceptance Criteria**:
  - Given an active member scanning a valid QR code on a weekday,
  - When backend receives request,
  - Then attendance is recorded exactly once, streak increases by +1, and duplicate scans on the same day are blocked.
- **Edge Cases**: Device clock set to wrong date by user -> Server validates strictly against server-side time.
- **Dependencies**: `STREAK-001`, `MEMBERSHIP-001`, `AUTH-002`.

---

### ATT-002: Member Attendance History & Calendar View
- **Requirement ID**: `ATT-002`
- **Requirement Name**: Member Attendance History Visualization
- **Actor**: Authenticated Member, Admin
- **Description**: Provides a monthly calendar view showing daily check-in timestamps, missed days, gym closure Sundays, and attendance statistics.
- **Preconditions**: User is authenticated.
- **Main Flow**:
  1. User opens attendance history tab.
  2. Selects Month and Year (defaults to current month).
  3. API returns array of daily attendance statuses for the selected range (`PRESENT`, `ABSENT`, `HOLIDAY_SUNDAY`, `SPECIAL_HOLIDAY`).
  4. UI displays color-coded monthly grid: Green (Present), Red (Missed), Gray (Sunday/Holiday).
- **Acceptance Criteria**: Monthly attendance accurately reflects historical database records without missing dates.
- **Dependencies**: `ATT-001`.

---

### ATT-003: Manual Attendance Correction by Admin
- **Requirement ID**: `ATT-003`
- **Requirement Name**: Admin Attendance Override & Manual Entry
- **Actor**: Authenticated Admin
- **Description**: Allows an admin to manually mark or adjust attendance for a member in cases of technical failure or approved manual check-in.
- **Preconditions**: Admin is authenticated.
- **Main Flow**:
  1. Admin navigates to Member Detail -> Attendance Tab (`/admin/members/[id]/attendance`).
  2. Admin clicks "Manual Attendance Override".
  3. Admin selects Date, Status (`PRESENT` / `EXCUSED_LEAVE`), and enters mandatory audit reason text.
  4. Admin submits change.
  5. System creates/updates `Attendance` record with audit tag `OVERRIDDEN_BY_ADMIN`, logs Admin ID and Reason in `AuditLog`.
  6. Streak Engine recalculates streaks for affected date range (`STREAK-001`).
- **Validation**: Mandatory non-empty reason field (min 10 characters).
- **Business Rules**: `OPEN BUSINESS DECISION: OBD-ATT-001` (Policy on manual streak restoration).
- **Acceptance Criteria**: Manual attendance change is persisted and recorded with full audit trail.
- **Dependencies**: `ADMIN-001`, `STREAK-001`.

---

## 4. Streak & Score System (STREAK)

### STREAK-001: Attendance Streak Engine
- **Requirement ID**: `STREAK-001`
- **Requirement Name**: Consecutive Attendance Streak Calculation Engine
- **Actor**: System / Automated Engine
- **Description**: Calculates and maintains member `CurrentStreak` and `LongestStreak` values accurately across eligible gym days, ignoring closed Sundays.
- **Preconditions**: Triggered after an attendance entry or daily midnight streak evaluation job.
- **Main Flow**:
  1. System checks attendance for member on consecutive eligible gym days.
  2. Sunday is explicitly skipped in consecutive day evaluation.
  3. Example scenario:
     - Friday: Present (+1 day to streak)
     - Saturday: Present (+1 day to streak)
     - Sunday: Closed (Skipped - Streak preserved)
     - Monday: Present (+1 day to streak -> Streak = 3)
  4. If member misses an eligible gym day (e.g. Monday absent), `CurrentStreak` resets to 0 upon missing.
  5. If `CurrentStreak` > `LongestStreak`, update `LongestStreak = CurrentStreak`.
- **Business Rules**: `BR-STREAK-001` (Streak rules), `BR-SUNDAY-001` (Sunday exclusion).
- **Acceptance Criteria**:
  - Given a member attending Friday and Saturday, and then attending Monday after Sunday closure,
  - When streak is recalculated,
  - Then the current streak increases to 3 and Sunday does not break the streak.
- **Edge Cases**: `OPEN BUSINESS DECISION: OBD-STREAK-001` (Does an approved leave preserve streak?).
- **Dependencies**: `ATT-001`.

---

### STREAK-002: Star / Score Calculation Engine
- **Requirement ID**: `STREAK-002`
- **Requirement Name**: Member Performance Star/Score Engine
- **Actor**: System / Automated Engine
- **Description**: Updates member's Star/Score metric based on gym attendance (+1 Star for attendance, -2 Stars for missed eligible gym days, 0 for Sundays).
- **Preconditions**: Attendance event or daily end-of-day batch processing.
- **Main Flow**:
  1. When member attends an eligible gym day: `Stars = Stars + 1`.
  2. When member misses an eligible gym day: `Stars = Stars - 2`.
  3. Sunday closure: `Stars = Stars + 0` (no change).
  4. System updates member's `StarScore` record.
- **Business Rules**: `BR-STAR-001` (Star delta logic). `OPEN BUSINESS DECISION: OBD-STAR-001` (Floor limit for star score; can stars be negative?).
- **Acceptance Criteria**:
  - Attending an eligible day increments stars by 1; missing an eligible day decrements stars by 2; Sunday has zero net effect.
- **Dependencies**: `ATT-001`, `STREAK-001`.

---

## 5. Inactivity Engine & Alerts (NOTIFICATION)

### NOTIFICATION-001: 10-Day Consecutive Inactivity Detection
- **Requirement ID**: `NOTIFICATION-001`
- **Requirement Name**: Automated 10-Day Member Inactivity Alerting
- **Actor**: System Service / Cron Job
- **Description**: Automatically evaluates member attendance logs daily and triggers an admin alert whenever a member is absent for 10 consecutive eligible gym days (excluding Sundays).
- **Preconditions**: Daily automated cron execution at end of day (e.g. 23:59 PM Gym Time).
- **Main Flow**:
  1. Cron service initiates `/api/cron/inactivity-check`.
  2. Service queries all active members with memberships valid during the last period.
  3. For each member, service counts consecutive missed eligible gym days backwards from today.
  4. Sundays are strictly excluded from the 10-day counter. (e.g., 10 missed days spanning 11-12 calendar days including 1 or 2 Sundays).
  5. If `ConsecutiveMissedEligibleDays == 10`:
     - System creates an `InactivityAlert` record in database.
     - System sends Push Notification / Email / Admin Dashboard Alert to Gym Admins.
- **Business Rules**: `BR-INACTIVE-001` (10 eligible gym days rule excluding Sundays).
- **Acceptance Criteria**:
  - Given a member absent for 10 consecutive eligible days (excluding Sundays),
  - When the daily inactivity job executes,
  - Then an inactivity alert is delivered to the admin dashboard and notification inbox.
- **Edge Cases**: Member membership was paused or expired during the 10-day window -> Do not flag as unexcused inactivity.
- **Dependencies**: `ATT-001`, `ADMIN-001`, `NOTIFICATION-002`.

---

### NOTIFICATION-002: Multi-Channel Notification Dispatcher
- **Requirement ID**: `NOTIFICATION-002`
- **Requirement Name**: Push & In-App Notification System
- **Actor**: System, Admin, Member
- **Description**: Delivers in-app notifications and Firebase Cloud Messaging (FCM) push alerts for membership expiry reminders, inactivity alerts, and order status updates.
- **Preconditions**: User has granted push notification permissions or accesses in-app notification bell.
- **Main Flow**:
  1. Event triggered (e.g., Membership expiring in 3 days, 10-day inactivity alert).
  2. System constructs notification payload `{ title, body, actionUrl, type }`.
  3. System persists notification in `Notification` table for in-app bell menu.
  4. System dispatches FCM push notification to target user device tokens.
- **Acceptance Criteria**: In-app notifications render real-time unread badges; push notifications deliver to mobile devices.
- **Dependencies**: External Firebase Cloud Messaging API.

---

## 6. Membership Management & Payments (MEMBERSHIP / PAYMENT)

### MEMBERSHIP-001: Admin Membership Plan Management (CRUD)
- **Requirement ID**: `MEMBERSHIP-001`
- **Requirement Name**: Membership Plan Configuration
- **Actor**: Authenticated Admin
- **Description**: Allows administrators to define, update, activate, and deactivate membership plans (e.g., Monthly, Quarterly, Annual, VIP Pass) with custom duration, pricing, and feature benefits.
- **Preconditions**: Admin is authenticated.
- **Main Flow**:
  1. Admin opens `/admin/memberships/plans`.
  2. Admin clicks "Create Plan".
  3. Admin enters Plan Name, Description, Duration (in Days/Months), Price (INR), Benefits list, and Active Status.
  4. Admin submits form.
  5. Backend creates `MembershipPlan` record in Neon PostgreSQL.
- **Validation**: Price must be > 0; Duration must be >= 1 day.
- **Business Rules**: Deactivating a plan hides it from new member selection but does NOT affect existing active member subscriptions.
- **Acceptance Criteria**: Plans created by admin immediately appear in member purchase options.
- **Dependencies**: None.

---

### MEMBERSHIP-002: Member Subscription Lifecycle & Expiry Tracking
- **Requirement ID**: `MEMBERSHIP-002`
- **Requirement Name**: Member Subscription Status & Expiry Management
- **Actor**: System, Member
- **Description**: Tracks active member subscriptions, transition statuses (`ACTIVE`, `EXPIRING_SOON`, `EXPIRED`), and enforces access restrictions upon expiry.
- **Preconditions**: User has an existing membership subscription.
- **Main Flow**:
  1. Daily job evaluates `Membership.EndDate`.
  2. If `EndDate - Today <= 3 days`: Set status to `EXPIRING_SOON` and dispatch renewal reminder notification (`NOTIFICATION-002`).
  3. If `Today > EndDate`: Set status to `EXPIRED` and disable attendance scan permission (`ATT-001`).
- **Acceptance Criteria**: Members with expired subscriptions are blocked at QR scan check-in.
- **Dependencies**: `NOTIFICATION-002`, `ATT-001`.

---

### PAYMENT-001: Online Membership Fee Payment via Razorpay
- **Requirement ID**: `PAYMENT-001`
- **Requirement Name**: Membership Fee Online Purchase & Payment Gateway Integration
- **Actor**: Authenticated Member
- **Description**: Enables members to select a membership plan, initiate payment via Razorpay payment gateway, complete checkout, and activate membership upon server-side verification.
- **Preconditions**: Member is authenticated; Membership plan is active.
- **Main Flow**:
  1. Member selects plan on `/user/membership/select`.
  2. Member clicks "Pay Now".
  3. Backend creates Razorpay Order ID via API `/api/payments/create-order` and responds with Order ID & Amount.
  4. Frontend opens Razorpay Checkout modal with Order ID.
  5. Member enters payment details (UPI/Card/NetBanking) and completes transaction.
  6. Razorpay returns client payment response (`razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature`).
  7. Frontend sends payload to server verification endpoint `/api/payments/verify`.
  8. Backend verifies HMAC-SHA256 signature using Razorpay Secret (`BR-PAY-001`).
  9. Upon successful signature match, backend updates `Payment` record to `SUCCESS`, creates/renews `Membership` subscription with status `ACTIVE`, and sets start/end dates.
  10. System displays confirmation page and enables member dashboard access.
- **Alternative Flow**:
  - *Payment Failed / Cancelled*: Razorpay callback returns error. Backend updates `Payment` record to `FAILED`. User shown option to retry payment.
- **Validation**: MUST NEVER activate membership based purely on frontend callback. Signature verification MUST take place on Next.js server side.
- **Business Rules**: `BR-PAY-001` (Strict server-side webhook / signature verification).
- **Acceptance Criteria**:
  - Given a member completing payment,
  - When server verifies Razorpay signature,
  - Then membership is activated immediately and payment audit log is saved.
- **Dependencies**: External Razorpay API Integration.

---

### PAYMENT-002: Payment History & Invoice Receipt Access
- **Requirement ID**: `PAYMENT-002`
- **Requirement Name**: Member & Admin Payment History Logging
- **Actor**: Member, Admin
- **Description**: Displays detailed payment transaction history, Razorpay transaction IDs, payment methods, timestamps, amounts, and downloadable tax receipts.
- **Preconditions**: User is authenticated.
- **Main Flow**: Member/Admin navigates to Payments tab to view paginated transaction records.
- **Acceptance Criteria**: Payment records show accurate Razorpay Order ID, Payment ID, Status, and Date.
- **Dependencies**: `PAYMENT-001`.

---

## 7. Diet & Workout Management (DIET)

### DIET-001: Admin Diet Plan Creation & Template Management
- **Requirement ID**: `DIET-001`
- **Requirement Name**: Diet Plan & Meal Template Management
- **Actor**: Authenticated Admin
- **Description**: Allows administrators to create structured diet plans, define meal schedules (Breakfast, Lunch, Pre-workout, Post-workout, Dinner), add calorie/macro details, and categorize plans by fitness goals (e.g. Weight Loss, Muscle Gain, Maintenance).
- **Preconditions**: Admin is authenticated.
- **Main Flow**:
  1. Admin navigates to `/admin/diets`.
  2. Admin clicks "Create Diet Plan".
  3. Admin specifies Plan Title, Fitness Goal Category, Target Daily Calories, and Protein/Carb/Fat breakdown.
  4. Admin adds meals with specific food items, quantities, and timings.
  5. Admin saves diet plan template.
- **Acceptance Criteria**: Created diet plan templates are available in the master diet repository for assignment.
- **Dependencies**: None.

---

### DIET-002: Member Diet Plan Assignment & View
- **Requirement ID**: `DIET-002`
- **Requirement Name**: Diet Assignment & Member View
- **Actor**: Admin, Member
- **Description**: Enables admins to assign a specific diet plan to individual members or member groups, and allows members to view their personalized daily meal breakdown on their dashboard.
- **Preconditions**: Diet plan template exists.
- **Main Flow**:
  1. Admin opens Member Detail -> Diet Tab, selects a Diet Plan, and assigns it to Member.
  2. Member logs in to `/user/diet`.
  3. Member views assigned meal schedule with itemized food recommendations and caloric targets.
- **Acceptance Criteria**: Members can view their active assigned diet plan in real-time.
- **Dependencies**: `DIET-001`, `ADMIN-001`.

---

## 8. Product Catalog & Inventory Management (PRODUCT)

### PRODUCT-001: Admin Product Catalog & Stock Management
- **Requirement ID**: `PRODUCT-001`
- **Requirement Name**: Gym Supplement & Gear Catalog Management
- **Actor**: Authenticated Admin
- **Description**: Allows admins to add, edit, activate/deactivate gym products (supplements, protein powder, shakers, gym apparel), set pricing, manage inventory stock counts, upload product images, and set categories.
- **Preconditions**: Admin is authenticated.
- **Main Flow**:
  1. Admin opens `/admin/products`.
  2. Admin clicks "Add Product".
  3. Form submitted with: Name, Description, Category (Protein, Creatine, Accessories), Price, Inventory Stock Count, Image URL (Cloudinary/S3).
  4. Backend creates `Product` record.
- **Validation**: Price > 0; Stock Quantity >= 0 integer.
- **Acceptance Criteria**: Products marked as ACTIVE with stock > 0 display in the member store.
- **Dependencies**: External Image Storage Service (Cloudinary/S3).

---

### PRODUCT-002: Member Product Store & Purchase Request
- **Requirement ID**: `PRODUCT-002`
- **Requirement Name**: Member Gym Product Storefront & Ordering
- **Actor**: Authenticated Member
- **Description**: Enables members to view gym products, check real-time stock availability, view prices, and place product orders/requests.
- **Preconditions**: Products exist in active catalog.
- **Main Flow**:
  1. Member opens `/user/store`.
  2. Member filters products by category.
  3. Member selects product, clicks "Purchase Request / Buy Now".
  4. Member confirms order.
  5. System creates `Order` and `OrderItem` record with status `PENDING_FULFILLMENT`, decrements product stock count (`BR-PROD-001`).
- **Business Rules**: `BR-PROD-001` (Stock inventory deduction lock).
- **Acceptance Criteria**: Member order is saved, product stock decrements, and admin receives order alert.
- **Dependencies**: `PRODUCT-001`.

---

## 9. Admin Dashboard & Operations (ADMIN)

### ADMIN-001: Central Admin Operations Dashboard
- **Requirement ID**: `ADMIN-001`
- **Requirement Name**: Admin Executive Dashboard Analytics
- **Actor**: Authenticated Admin
- **Description**: Displays real-time macro analytics and operational KPIs for gym management.
- **Preconditions**: Admin is authenticated.
- **Main Flow**:
  1. Admin opens `/admin/dashboard`.
  2. Dashboard displays metric cards:
     - **Total Members Count**
     - **Active Members Count** vs **Inactive Members Count**
     - **Today's Attendance Count**
     - **Members Absent 10+ Eligible Gym Days** (Inactivity Alert List)
     - **Active Memberships Count**
     - **Expired Memberships Count**
     - **Memberships Approaching Expiry (within 7 days)**
     - **Total Revenue / Monthly Revenue**
     - **Pending Gym Product Orders Count**
- **Acceptance Criteria**: Dashboard analytics update in real time with high query efficiency.
- **Dependencies**: `ATT-001`, `MEMBERSHIP-002`, `NOTIFICATION-001`, `PAYMENT-001`.

---

### ADMIN-002: Comprehensive Member Oversight & Detail Inspection
- **Requirement ID**: `ADMIN-002`
- **Requirement Name**: Admin Member Directory & Profile Inspection
- **Actor**: Authenticated Admin
- **Description**: Provides admins with a searchable, filterable directory of all gym members, with single-click inspection of member profiles, attendance history, current/longest streaks, membership status, payment records, and assigned diets.
- **Preconditions**: Admin is authenticated.
- **Main Flow**:
  1. Admin opens `/admin/members`.
  2. Admin searches member by Name, Phone, Email, or Membership ID.
  3. Admin clicks member row to view full profile drawer/page.
  4. Profile page displays tabs: Overview, Attendance Calendar, Streak History, Payment Logs, Diet Plan, and Notes.
- **Acceptance Criteria**: Admin can access complete historical records for any registered member.
- **Dependencies**: `USER-001`, `ATT-002`, `MEMBERSHIP-002`, `PAYMENT-002`.
