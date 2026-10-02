# Backend DLD - Module 02: User & Member Profile

This document details the backend architectural design for member profile lookup, updating fitness preferences, and generating privacy-sanitized community leaderboards.

---

## 1. Functional Requirement Traceability
- `USER-001`: Member Dashboard Display
- `MEMBER-001`: Member Community Section & Privacy Safeguards
- `MEMBER-002`: Member Profile View & Update

---

## 2. REST API Specifications

### 2.1 Fetch Personal Member Profile (`GET /api/user/profile`)
- **Authentication**: Session Cookie Required (`UserId`)
- **Business Logic**:
  1. Query `User` by `id == Session.UserId`.
  2. Include active `Membership` and active assigned `DietAssignment`.
  3. Return `HTTP 200 OK`.

### 2.2 Privacy-Sanitized Community Leaderboard (`GET /api/user/community`)
- **Authentication**: Session Cookie Required (`MEMBER` or `ADMIN`)
- **Business Logic**:
  1. Query active users ordered by `currentStreak` DESC.
  2. **Data Privacy Projection (`BR-PRIVACY-001`)**: Explicitly select ONLY:
     - `id`
     - `name` (Transformed to `FirstName` + `LastNameInitial`, e.g., "John D.")
     - `profilePicUrl`
     - `currentStreak`
     - `starScore`
  3. Redact `email`, `phone`, `passwordHash`, `status`, and payment records from SQL query projection.
  4. Return `HTTP 200 OK` array.
