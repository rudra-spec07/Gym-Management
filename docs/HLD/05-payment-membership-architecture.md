# 05. Payment & Membership Architecture

This document details the integration architecture with Razorpay Payment Gateway, membership subscription state transitions, server-side signature verification, and webhook resilience.

---

## 1. Subscription State Machine

A member subscription transitions through explicit lifecycle states:

```mermaid
stateDiagram-v2
    [*] --> PENDING_PAYMENT : Select Plan
    PENDING_PAYMENT --> ACTIVE : Server Signature Verified / Webhook Captured
    PENDING_PAYMENT --> FAILED : Payment Failed / Cancelled
    FAILED --> PENDING_PAYMENT : Retry Checkout
    
    ACTIVE --> EXPIRING_SOON : EndDate - Today <= 3 Days
    EXPIRING_SOON --> ACTIVE : Renew Membership (Pay Fee)
    EXPIRING_SOON --> EXPIRED : Today > EndDate
    ACTIVE --> EXPIRED : Today > EndDate
    
    EXPIRED --> ACTIVE : Renew Membership (Pay Fee)
    ACTIVE --> CANCELLED : Admin Revocation
```

---

## 2. Razorpay Payment & Verification Flow

```mermaid
sequenceDiagram
    autonumber
    actor Member as Member Client
    participant App as Next.js Server
    participant RZP as Razorpay API
    participant DB as Neon PostgreSQL

    Member->>App: Select Plan & Click "Pay Now"
    App->>RZP: POST /v1/orders { amount, currency: "INR", receipt }
    RZP-->>App: Return Order ID (order_789XYZ)
    App->>DB: Insert Payment Record (Status: PENDING, razorpayOrderId)
    App-->>Member: Return { orderId, amount, keyId }

    Member->>Member: Open Razorpay Checkout Modal & Enter Payment Details
    Member->>RZP: Process Transaction (UPI / Card / NetBanking)
    RZP-->>Member: Transaction Complete (razorpay_payment_id, razorpay_signature)

    Member->>App: POST /api/payments/verify { orderId, paymentId, signature }
    
    rect rgb(235, 245, 255)
        note over App: Server-Side Cryptographic Verification (BR-PAY-001)
        App->>App: Generated_Signature = HMAC_SHA256(orderId + "|" + paymentId, RAZORPAY_KEY_SECRET)
        App->>App: Compare Generated_Signature with Client Signature
    end

    alt Signature Matches Valid
        App->>DB: Update Payment (Status: SUCCESS, razorpayPaymentId)
        App->>DB: Activate / Extend Membership (Status: ACTIVE, EndDate)
        App-->>Member: Return HTTP 200 OK { Status: "ACTIVE", MembershipDetails }
    else Signature Mismatch (Tampered / Fraudulent)
        App->>DB: Update Payment (Status: FAILED)
        App-->>Member: Return HTTP 400 Bad Request "Invalid Payment Signature"
    end
```

---

## 3. Webhook Handling (`payment.captured`)

To handle edge cases where the user closes their browser window before client verification finishes (`EC-PAY-001`), an asynchronous Razorpay Webhook listener is exposed at `/api/webhooks/razorpay`.

1. **Header Verification**: Validates `X-Razorpay-Signature` header using `RAZORPAY_WEBHOOK_SECRET`.
2. **Idempotency Execution**: Checks if payment record for `orderId` is already marked `SUCCESS`. If already processed, return `HTTP 200 OK` immediately.
3. **Async State Update**: Updates payment status to `SUCCESS` and updates `Membership` start and end dates.
