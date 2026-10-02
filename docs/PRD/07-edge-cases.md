# 07. Edge Cases & Resilience Matrix

This document identifies potential edge cases, system failure modes, race conditions, and boundary exceptions, along with mandated system resilience strategies.

---

## 1. Attendance & Scan Edge Cases

| Edge Case ID | Scenario / Trigger | Risk / Consequence | Mandated System Behavior |
| :--- | :--- | :--- | :--- |
| `EC-ATT-001` | **Timezone Shift / Client Device Tampering**: Member changes mobile phone clock to yesterday or tomorrow to fake attendance. | Fraudulent attendance logging | Server-side validation MUST strictly use server timezone (e.g. Asia/Kolkata). Client timestamps are discarded for attendance date determination. |
| `EC-ATT-002` | **Concurrent Double Tap**: Member double-clicks/scans attendance QR within milliseconds due to poor connection. | Database race condition creating duplicate attendance rows | Unique composite index on `(UserId, AttendanceDate)` in Neon PostgreSQL DB prevents duplicate inserts at database constraint level. |
| `EC-ATT-003` | **QR Code Screenshot Sharing**: Member takes picture of attendance QR code and sends to absent friend. | Remote proxy attendance fraud | Dynamic QR code refreshed every 30 seconds on display monitor. Scanned token validated against max 45-second TTL. |
| `EC-ATT-004` | **Check-in Near Midnight (23:59 PM)**: Member scans QR at 23:59:58 PM, but server receives request at 00:00:03 AM next day. | Attendance credited to wrong day or streak broken | API accepts client scan initiation timestamp if verified signed within dynamic QR window, logging actual server arrival time for audit. |

---

## 2. Inactivity & Calendar Edge Cases

| Edge Case ID | Scenario / Trigger | Risk / Consequence | Mandated System Behavior |
| :--- | :--- | :--- | :--- |
| `EC-INACT-001` | **Mid-Month Special Gym Holiday / National Holiday**: Gym closed on Wednesday for National Holiday. | System treats closure day as missed day, incrementing inactivity counter and breaking streaks | Admin can mark "Special Gym Closure Day" in system calendar. Engine treats special closure days identically to Sundays (zero streak impact, zero inactivity impact). |
| `EC-INACT-002` | **Member On Medical / Approved Leave**: Member notifies gym owner of 2-week vacation or illness. | System triggers 10-day inactivity alert despite advance notice | Admin can flag member as `ON_APPROVED_LEAVE` with Start & End dates. Inactivity engine suppresses alerts during active leave windows (`OPEN BUSINESS DECISION: OBD-LEAVE-001`). |
| `EC-INACT-003` | **New Member Joining Mid-Week**: New member signs up on Thursday. | Inactivity job evaluates previous days of week as "missed" | Inactivity counter starts strictly from member's `MembershipStartDate` or first attendance date, ignoring days prior to enrollment. |

---

## 3. Payment & Subscription Edge Cases

| Edge Case ID | Scenario / Trigger | Risk / Consequence | Mandated System Behavior |
| :--- | :--- | :--- | :--- |
| `EC-PAY-001` | **Razorpay Payment Success, but Network Drops Before Client Verification Callback**: User charged by bank, but browser closes before reaching `/api/payments/verify`. | User money deducted, but membership status remains `INACTIVE` | Razorpay Webhook listener (`payment.captured`) asynchronously processes payment, updating DB status independently of client browser state. |
| `EC-PAY-002` | **Renewal Before Expiry**: Member renews monthly membership 5 days prior to current expiration date. | Member loses 5 days of existing subscription if end date resets to today | Renewal logic extends existing `EndDate` by +30 days (`NewEndDate = CurrentEndDate + 30 Days`), preserving remaining paid days. |
