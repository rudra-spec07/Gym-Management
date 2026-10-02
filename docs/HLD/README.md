# Gym Management Application - High-Level Design (HLD)

Welcome to the High-Level Design (HLD) documentation suite for the **Gym Management Application**. This specification translates the approved Product Requirement Document (PRD) into an architectural blueprint covering system topology, module decomposition, database strategy, cryptographically secure QR attendance engines, payment state machines, and deployment topology.

---

## 📂 HLD Documentation Index

| Document File | Core Topic / System Aspect |
| :--- | :--- |
| [01-system-architecture.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/HLD/01-system-architecture.md) | High-Level System Topology, Client/Server Boundaries, Next.js App Router Architecture, and Component Interaction. |
| [02-module-architecture.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/HLD/02-module-architecture.md) | Subsystem & Module Breakdown (Auth, User/Member, Attendance, Streak Engine, Membership, Payment, Diet, Product, Admin, Notification). |
| [03-database-architecture.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/HLD/03-database-architecture.md) | Neon PostgreSQL Architecture, Prisma ORM Configuration, Serverless Connection Pooling, Data Modeling Strategy, and Indexing. |
| [04-qr-attendance-streak-engine.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/HLD/04-qr-attendance-streak-engine.md) | Cryptographic Dynamic QR Code Verification, Anti-Replay Engine, Single Daily Attendance Locking, Sunday-Safe Streak Engine, and Star Calculation Algorithm. |
| [05-payment-membership-architecture.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/HLD/05-payment-membership-architecture.md) | Razorpay Integration Architecture, Checkout Lifecycle, Webhook / HMAC-SHA256 Signature Verification, and Subscription State Machine. |
| [06-api-service-architecture.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/HLD/06-api-service-architecture.md) | RESTful API Endpoint Map, Request/Response Protocols, Zod Middleware Pipeline, and External Integrations (FCM, Cloudinary/S3). |
| [07-security-rbac-architecture.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/HLD/07-security-rbac-architecture.md) | Authentication & Session Security (HTTP-Only Cookie / JWT), Role-Based Access Control (RBAC), Data Scoping, CSRF, and Rate Limiting. |
| [08-scalability-deployment-observability.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/HLD/08-scalability-deployment-observability.md) | Vercel Deployment Topology, Serverless Auto-scaling, Structured Logging, Sentry Error Tracking, and Monitoring SLA. |

---

## 🛠️ Technology Stack Architecture

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS, React Server Components (RSC)
- **Backend / API**: Next.js Route Handlers & Server Actions, TypeScript
- **Database**: Neon Serverless PostgreSQL
- **ORM & Client**: Prisma ORM with Prisma Accelerate / Connection Pooler
- **Payment Processing**: Razorpay Webhooks & Server SDK
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Asset Storage**: Cloudinary / AWS S3 Compatible Object Storage
