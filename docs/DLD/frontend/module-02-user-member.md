# Frontend Web DLD - Module 02: User Dashboard & Community

This document details the frontend web components for the member dashboard and community leaderboard.

---

## 1. Functional Requirement Mapping
- Maps to Backend Module `02-user-member` (`USER-001`, `MEMBER-001`, `MEMBER-002`).

---

## 2. Page Specifications

### 2.1 Member Dashboard (`app/(user)/dashboard/page.tsx`)
- **Render Mode**: React Server Component (RSC) with hydration components.
- **Backend API Mapping**: Fetches `GET /api/user/profile` and `GET /api/user/dashboard`.
- **UI Sections**:
  - `StreakHeroCard`: Displays `CurrentStreak` (days), `LongestStreak`, and `StarScore`.
  - `CheckinStatusWidget`: Visual indicator showing if today's check-in is complete or rendering CTA button `"Scan Attendance QR"`.
  - `ActiveMembershipBanner`: Displays Plan name, Days Remaining, Renewal button.
  - `AssignedDietPreview`: Today's meal breakdown card.

### 2.2 Community Leaderboard (`app/(user)/community/page.tsx`)
- **Render Mode**: Client Component (`GET /api/user/community`).
- **Data Privacy Protection**: Renders sanitized member cards (`FirstName`, `LastNameInitial`, `Streak`).
