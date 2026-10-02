# Frontend Web DLD - Module 06: Razorpay Web Checkout & Invoices

This document details the frontend web integration with Razorpay Checkout JS SDK and payment history tables.

---

## 1. Functional Requirement Mapping
- Maps to Backend Module `06-payment` (`PAYMENT-001`, `PAYMENT-002`).

---

## 2. Component Specifications

### 2.1 Razorpay Checkout Trigger (`components/payment/RazorpayCheckoutModal.tsx`)
- Loads Razorpay Script (`https://checkout.razorpay.com/v1/checkout.js`).
- Calls `POST /api/payments/create-order` to fetch `orderId`.
- Opens Razorpay modal with `order_id`, `amount`, `key`.
- On client handler callback, submits payload to `POST /api/payments/verify`.
- Handles success state (toast + redirect) or error state.

### 2.2 Payment History Table (`app/(user)/payments/page.tsx`)
- Displays historical payment logs (Order ID, Payment ID, Date, Amount, Status).
