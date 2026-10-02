# Backend DLD - Module 01: Authentication & Account Registration

This document details the backend architectural design for member self-registration via QR onboarding tokens, password hashing, JWT session cookies, and role-based middleware authentication.

---

## 1. Functional Requirement Traceability
- `AUTH-001`: Member Self-Registration via QR Code
- `AUTH-002`: User Authentication & Session Management

---

## 2. Prisma Model Definition

```prisma
model User {
  id            String      @id @default(uuid())
  email         String      @unique
  phone         String      @unique
  name          String
  passwordHash  String
  role          UserRole    @default(MEMBER)
  status        UserStatus  @default(PENDING_MEMBERSHIP)
  profilePicUrl String?
  fitnessGoal   String?
  
  currentStreak Int         @default(0)
  longestStreak Int         @default(0)
  starScore     Int         @default(0)
  
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@index([status])
  @@index([role])
}

enum UserRole {
  ADMIN
  MEMBER
}

enum UserStatus {
  PENDING_MEMBERSHIP
  ACTIVE
  INACTIVE
  SUSPENDED
}
```

---

## 3. REST API Specifications

### 3.1 Self-Registration via QR (`POST /api/auth/register`)
- **Headers**: `Content-Type: application/json`
- **Zod Schema**:
  ```typescript
  export const RegisterSchema = z.object({
    token: z.string().min(1, 'Registration token required'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email syntax'),
    phone: z.string().regex(/^[0-9]{10}$/, 'Mobile must be 10 digits'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    fitnessGoal: z.string().optional(),
  });
  ```
- **Business Logic**:
  1. Validate registration token against `REGISTRATION_SECRET`.
  2. Check existing `User` where `email = input.email OR phone = input.phone`. If exists, throw `HTTP 400 Bad Request` *"Account already exists"*.
  3. Hash password using `bcrypt.hash(password, 12)`.
  4. Create `User` with `role = MEMBER` and `status = PENDING_MEMBERSHIP`.
  5. Sign JWT session token (`userId`, `role`) with 7-day expiration.
  6. Set `HTTP-Only`, `SameSite=Lax`, `Secure` session cookie `session_token`.
  7. Return `HTTP 201 Created` with redirect destination `/user/membership/select`.

### 3.2 Login (`POST /api/auth/login`)
- **Zod Schema**:
  ```typescript
  export const LoginSchema = z.object({
    identifier: z.string().min(1, 'Email or Phone required'),
    password: z.string().min(1, 'Password required'),
  });
  ```
- **Business Logic**:
  1. Lookup `User` by `email == identifier OR phone == identifier`.
  2. If user not found or `bcrypt.compare(password, user.passwordHash)` returns false, return `HTTP 401 Unauthorized` *"Invalid credentials"*.
  3. Generate JWT cookie and respond with role routing parameter (`ADMIN` -> `/admin/dashboard`, `MEMBER` -> `/user/dashboard`).
