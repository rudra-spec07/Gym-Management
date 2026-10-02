# Frontend Web DLD - Module 03: Attendance & Calendar Grid

This document details the frontend web components for attendance calendar views and admin manual override drawers.

---

## 1. Functional Requirement Mapping
- Maps to Backend Module `03-attendance` (`ATT-001`, `ATT-002`, `ATT-003`).

---

## 2. Component Specifications

### 2.1 Attendance Calendar Grid (`components/attendance/AttendanceCalendar.tsx`)
- **Render Mode**: Client Component (`GET /api/attendance/history?month=MM&year=YYYY`).
- **Visual Encoding**:
  - Green Badge: `PRESENT`
  - Red Badge: `ABSENT`
  - Gray Badge: `SUNDAY / GYM HOLIDAY`
  - Yellow Badge: `EXCUSED LEAVE`

### 2.2 Admin Override Drawer (`components/admin/AdminOverrideDrawer.tsx`)
- **Render Mode**: Interactive Form Modal.
- **Backend API Mapping**: Sends `POST /api/admin/attendance/override` with mandatory audit reason.
