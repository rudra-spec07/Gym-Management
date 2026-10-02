# Frontend Web DLD - Module 01: Authentication & Registration

This document details the frontend web components, pages, state management, and backend mapping for member registration via QR code and login workflows.

---

## 1. Functional Requirement Mapping
- Maps to Backend Module `01-auth` (`AUTH-001`, `AUTH-002`).

---

## 2. Page & Component Specifications

### 2.1 Public Registration Page (`app/(auth)/register/page.tsx`)
- **Render Mode**: Client Component (`'use client'`)
- **URL**: `/register?token=<REGISTER_TOKEN>`
- **Components**:
  - `RegisterHeader`: Renders gym logo, welcome title.
  - `RegisterForm`: Reactive form with React Hook Form + Zod (`RegisterSchema`). Fields: Full Name, Email, Mobile, Password, Fitness Goal.
  - `SubmitButton`: Interactive loader button.
- **Backend API Mapping**: Sends `POST /api/auth/register`. Upon success (`HTTP 201`), routes to `/user/membership/select`.

### 2.2 Login Page (`app/(auth)/login/page.tsx`)
- **URL**: `/login`
- **Backend API Mapping**: Sends `POST /api/auth/login`. Automatically redirects based on role (`/admin/dashboard` vs `/user/dashboard`).
