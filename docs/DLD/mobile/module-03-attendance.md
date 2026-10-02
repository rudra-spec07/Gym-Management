# Mobile App / PWA DLD - Module 03: Native Camera QR Scanner

This document details the mobile device HTML5 camera scanner component, permissions handling, dynamic QR decoding, and backend check-in payload submission.

---

## 1. Functional Requirement Mapping
- Maps to Backend Module `03-attendance` (`ATT-001`).

---

## 2. Component Specifications (`components/mobile/MobileQRScanner.tsx`)

- Uses HTML5 `navigator.mediaDevices.getUserMedia` or `@zxing/library` / `html5-qrcode`.
- Requests camera permission on tap.
- Scans front-desk display dynamic QR code payload.
- Posts payload to `POST /api/attendance/scan`.
- Renders animated check-in success sheet with updated streak and star score.
- Handles error state (Expired QR code, duplicate check-in today, expired membership).
