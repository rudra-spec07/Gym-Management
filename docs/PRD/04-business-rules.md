# 04. Business Rules & Domain Logic

This document specifies the business logic, formulas, validation constraints, and regulatory rules governing the Gym Management Application.

---

## 1. Registration & Account Rules

### BR-REG-001: Zero Admin Manual Entry
- **Description**: Gym admins must NOT be required to manually create or enter new member accounts.
- **Enforcement**: All member account creation occurs through self-service registration initiated by scanning the public Gym Registration QR code (`AUTH-001`).

### BR-REG-002: Pending Membership State
- **Description**: Newly registered user accounts default to status `PENDING_MEMBERSHIP`.
- **Enforcement**: Accounts in this state can log in to view plans and complete payment, but are restricted from scanning attendance QR codes until an active paid subscription exists (`PAYMENT-001`).

---

## 2. Attendance & QR Security Rules

### BR-ATT-001: Single Daily Attendance Lock
- **Description**: A member can only receive attendance credit ONCE per eligible gym day.
- **Enforcement**: Server checks for existing attendance record for `(UserId, Date_Local)`. Repeated QR scans within the same calendar day MUST return `HTTP 409 Conflict` and preserve original scan timestamp without generating duplicate records.

### BR-QR-001: Separation of Registration vs Attendance QR Codes
- **Description**: Registration QR and Attendance QR are conceptually and cryptographically separate.
- **Enforcement**:
  - **Registration QR**: Encodes a static/dynamic URL pointing to public member onboarding (`/register?token=...`). Scanning while logged in redirects to user dashboard.
  - **Attendance QR**: Encodes a dynamic time-signed payload (HMAC-SHA256 signature, updated every 30-60 seconds on gym display monitor) pointing to `/api/attendance/scan`. Cannot be used to register new accounts.

### BR-QR-002: Dynamic QR Anti-Replay & Location Lock
- **Description**: Prevents members from saving dynamic attendance QR photos or sharing QR codes remotely.
- **Enforcement**: Backend verifies QR signature expiration window (e.g. 60-second validity window). Optional geolocation check validates client coordinates within 100 meters of gym coordinates.

---

## 3. Sunday & Holiday Rules

### BR-SUNDAY-001: Sunday Gym Closure Rules
- **Description**: Sunday is a designated gym holiday.
- **Rule Set**:
  1. Sunday does NOT require member attendance.
  2. Sunday MUST NOT break an active attendance streak.
  3. Sunday MUST NOT count as a missed gym day.
  4. Sunday MUST NOT reduce the user's performance star score.
  5. Sunday MUST NOT count toward the 10-day consecutive inactivity calculation.
- **Example Sequence**:
  - Friday: Present (+1 Streak, +1 Star)
  - Saturday: Present (+1 Streak, +1 Star)
  - **Sunday: Closed (Gym Holiday - Zero streak change, zero star change, zero inactivity count)**
  - Monday: Present (+1 Streak -> Total Streak = 3, +1 Star)

---

## 4. Attendance Streak & Performance Star Rules

### BR-STREAK-001: Streak Engine Calculation
- **Description**: Streak counts consecutive eligible gym days attended.
- **Formula**:
  $$\text{Streak}_{t} = \begin{cases} 
  \text{Streak}_{t-1} + 1 & \text{if Attended on Day } t \text{ (Eligible Day)} \\
  \text{Streak}_{t-1} & \text{if Day } t \text{ is Sunday / Special Closed Holiday} \\
  0 & \text{if Missed on Day } t \text{ (Eligible Day)}
  \end{cases}$$

### BR-STAR-001: Star / Score Delta Rules
- **Description**: Gamified score tracking member consistency.
- **Rule Set**:
  - Attended Eligible Day: $+1$ Star
  - Missed Eligible Day: $-2$ Stars
  - Sunday Closure: $0$ Stars
- **Current Unresolved Rule**: See `OPEN BUSINESS DECISION: OBD-STAR-001` regarding score floors (whether stars can go below 0) and score reset on streak breaks.

---

## 5. Inactivity Engine Rules

### BR-INACTIVE-001: 10-Day Consecutive Inactivity Rule
- **Description**: Identifies disengaged members requiring admin outreach.
- **Rule Set**:
  - System evaluates consecutive missed eligible gym days.
  - When a member accumulates exactly 10 consecutive missed eligible days (excluding Sundays and official gym closures), trigger an admin alert.
- **Calculation Example**:
  - Missed 6 days (Mon-Sat) + 1 Sunday (Skipped) + Missed 4 days (Mon-Thu) = 10 Missed Eligible Days spanning 11 calendar days.
  - Alert triggered on Thursday evening post end-of-day execution.

---

## 6. Membership & Payment Verification Rules

### BR-MEM-001: Membership Access Lockout
- **Description**: Members with `EXPIRED`, `CANCELLED`, or `PENDING` status cannot check in via QR.
- **Enforcement**: Middleware checks `User.ActiveMembership.EndDate >= Today` prior to processing attendance scan.

### BR-PAY-001: Strict Server-Side Payment Verification
- **Description**: Frontend payment success responses must NEVER be trusted for account activation.
- **Enforcement**: Membership subscription is activated ONLY after Next.js backend verifies Razorpay HMAC-SHA256 signature using `RAZORPAY_KEY_SECRET` or receives verified Razorpay Webhook event `payment.captured`.

---

## 7. Data Privacy & Community Rules

### BR-PRIVACY-001: Public Community Data Stripping
- **Description**: Protect member personal data on public leaderboard/community screens.
- **Enforcement**: API serializers MUST explicitly project only `FirstName`, `LastNameInitial`, `ProfilePictureUrl`, and `CurrentStreak`. Mobile numbers, email addresses, payment statuses, and diet details are strictly stripped from response payloads.
