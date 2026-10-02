# Frontend Web DLD - Module 10: In-App Notification Bell & Admin Alerts

This document details the frontend web notification bell dropdown menu and admin inactivity alert banner.

---

## 1. Functional Requirement Mapping
- Maps to Backend Module `10-notification` (`NOTIFICATION-001`, `NOTIFICATION-002`).

---

## 2. Component Specifications

### 2.1 In-App Notification Bell (`components/navigation/NotificationBell.tsx`)
- Header bell icon with unread badge counter.
- Popover menu rendering notifications with timestamp and mark-as-read action.

### 2.2 Admin Inactivity Alert Banner (`components/admin/InactivityAlertBanner.tsx`)
- High-priority alert banner rendering members absent for 10 consecutive eligible gym days with single-click action to view member contact drawer.
