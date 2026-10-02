# Frontend Web DLD - Module 05: Membership Selection & Admin Plans

This document details the frontend web pages for plan selection and admin plan management.

---

## 1. Functional Requirement Mapping
- Maps to Backend Module `05-membership` (`MEMBERSHIP-001`, `MEMBERSHIP-002`).

---

## 2. Page & Component Specifications

### 2.1 Plan Selection Page (`app/(user)/membership/select/page.tsx`)
- Displays grid of active `MembershipPlan` cards (Monthly, Quarterly, Annual).
- Benefits list, price, and "Pay Now" CTA invoking Razorpay Modal (`PAYMENT-001`).

### 2.2 Admin Plan Builder (`app/(admin)/plans/page.tsx`)
- Form to add/edit plans (Name, Duration, Price, Benefits).
- Toggle active/inactive plan state.
