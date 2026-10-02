# Frontend Web DLD - Module 09: Admin Executive Dashboard & Member Lookup

This document details the frontend web components for executive admin analytics cards and searchable member directories.

---

## 1. Functional Requirement Mapping
- Maps to Backend Module `09-admin` (`ADMIN-001`, `ADMIN-002`).

---

## 2. Page & Component Specifications

### 2.1 Executive Dashboard (`app/(admin)/dashboard/page.tsx`)
- Metric KPI cards: Total Members, Active Members, Today's Check-ins, 10-Day Inactive Members, Monthly Revenue.

### 2.2 Member Search Directory (`app/(admin)/members/page.tsx`)
- Search bar filtering by Name, Mobile, Email, Membership status.
- Clicking a member opens a detail drawer showing attendance calendar, streak history, payment history, and assigned diet.
