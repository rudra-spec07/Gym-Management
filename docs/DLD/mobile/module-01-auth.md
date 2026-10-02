# Mobile App / PWA DLD - Module 01: Mobile Registration & Authentication

This document details the mobile/PWA interfaces for QR code camera onboarding and login flows.

---

## 1. Functional Requirement Mapping
- Maps to Backend Module `01-auth` (`AUTH-001`, `AUTH-002`).

---

## 2. Mobile Specifications

### 2.1 Mobile Registration Flow
- Scans registration QR poster via device camera or built-in scanner.
- Opens mobile-optimized single-column registration form (`/register?token=...`).
- Stores session JWT in secure storage / HTTP-only cookie.
