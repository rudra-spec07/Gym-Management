# Gym Management Application - Product Requirement Document (PRD)

Welcome to the central repository for the Product Requirement Document (PRD) of the **Gym Management Application**. This documentation serves as the single source of truth (SSOT) for product scope, functional and non-functional specifications, business rules, edge case handling, and open business decisions prior to Technical Design (HLD/DLD) and implementation.

---

## 📂 PRD Documentation Structure

| Document File | Topic / Description |
| :--- | :--- |
| [00-document-control.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/PRD/00-document-control.md) | Revision history, approval matrix, document status, and project metadata. |
| [01-product-overview.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/PRD/01-product-overview.md) | Problem statement, vision, strategic objectives, target audience, and high-level ecosystem. |
| [02-user-roles.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/PRD/02-user-roles.md) | Actor definitions, RBAC hierarchy, permissions matrix, and user personas. |
| [03-functional-requirements.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/PRD/03-functional-requirements.md) | Structured functional requirements (AUTH, MEMBER, ATT, STREAK, MEMBERSHIP, PAYMENT, DIET, PRODUCT, NOTIF, ADMIN). |
| [04-business-rules.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/PRD/04-business-rules.md) | Domain business logic (Attendance, Streak Engine, Star/Score System, Inactivity Engine, Sunday Rules, QR Security). |
| [05-non-functional-requirements.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/PRD/05-non-functional-requirements.md) | Performance, scalability, security, privacy, logging, rate limiting, availability, and observability metrics. |
| [06-acceptance-criteria.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/PRD/06-acceptance-criteria.md) | End-to-end BDD acceptance criteria mapped across all functional requirement IDs. |
| [07-edge-cases.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/PRD/07-edge-cases.md) | Failure modes, race conditions, time-zone shifts, network drops, and offline/edge handling. |
| [08-open-business-decisions.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/PRD/08-open-business-decisions.md) | Unresolved product decisions explicitly flagged as `OPEN BUSINESS DECISION` needing stakeholder confirmation. |
| [09-scope.md](file:///c:/Users/faizadev/Desktop/gym-management/docs/PRD/09-scope.md) | In-scope MVP features, out-of-scope items, assumptions, dependencies, and future phase roadmap. |

---

## 🛠️ Fixed Technology Stack

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js Server Actions / API Routes, TypeScript
- **Database**: Neon PostgreSQL
- **ORM**: Prisma
- **External Integrations**: Razorpay Payment Gateway, Firebase Cloud Messaging (FCM), S3-compatible / Cloudinary Storage

---

## 📌 Working Rules & Methodology
1. **No Code Implementation**: No application code is written until PRD, HLD, and DLD are reviewed and finalized.
2. **Strict Requirement Mapping**: Every API endpoint, Prisma model, and frontend UI view in subsequent phases must directly map back to a requirement ID defined in `03-functional-requirements.md`.
3. **No Unsubstantiated Assumptions**: Undefined business logic is captured under `08-open-business-decisions.md`.
