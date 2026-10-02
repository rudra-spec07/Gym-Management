# 05. Non-Functional Requirements (NFR)

This document establishes the measurable quality standards, system performance targets, security standards, availability guarantees, and operational metrics for the Gym Management Application.

---

## 1. Performance Requirements (NFR-PERF)

| NFR ID | Metric / Parameter | Target SLA / Standard | Measurement Method |
| :--- | :--- | :--- | :--- |
| `NFR-PERF-001` | **Attendance QR Validation Latency** | $\le 500 \text{ ms}$ (95th percentile) under normal load | Server-side execution timer from API ingress to DB insert |
| `NFR-PERF-002` | **Dashboard First Contentful Paint (FCP)** | $\le 1.2 \text{ seconds}$ on standard 4G mobile networks | Google Lighthouse / Core Web Vitals |
| `NFR-PERF-003` | **Page Load / Time to Interactive (TTI)** | $\le 2.0 \text{ seconds}$ across member portal pages | Web Vitals / Real User Monitoring (RUM) |
| `NFR-PERF-004` | **Database Query Execution Time** | $\le 50 \text{ ms}$ for standard Prisma read/write queries | Neon PostgreSQL Query Insights / Prisma Logging |

---

## 2. Scalability Requirements (NFR-SCALE)

| NFR ID | Metric / Parameter | Target Capacity | Notes / Verification |
| :--- | :--- | :--- | :--- |
| `NFR-SCALE-001` | **Peak Concurrent QR Check-ins** | 500 concurrent QR check-ins per minute per gym location | `OPEN BUSINESS DECISION: OBD-NFR-001` (Confirm multi-gym tenant scaling requirement) |
| `NFR-SCALE-002` | **Database Connection Management** | Serverless connection pooling enabled via Prisma Accelerate / Neon Connection Pooling | Prevents connection exhaustion during morning peak hours (6 AM - 9 AM) |
| `NFR-SCALE-003` | **Stateless Backend Scaling** | Next.js API Routes deployed on Vercel / serverless edge runtime | Auto-scales instances based on incoming HTTP request volume |

---

## 3. Security & Compliance Requirements (NFR-SEC)

| NFR ID | Security Domain | Target Standard | Implementation Detail |
| :--- | :--- | :--- | :--- |
| `NFR-SEC-001` | **Transport Layer Security** | HTTPS / TLS 1.3 enforced for all communications | HTTP Strict Transport Security (HSTS) headers enabled |
| `NFR-SEC-002` | **Data Hashing & Passwords** | bcrypt / Argon2id hashing algorithm with salt factor $\ge 12$ | Plaintext passwords NEVER stored in database |
| `NFR-SEC-003` | **API Authentication & Sessions** | Secure, HTTP-Only, SameSite=Lax JWT session cookies | Prevents XSS token exfiltration |
| `NFR-SEC-004` | **Input Validation & Injection Guard** | 100% Zod schema validation on API request body & query params | Prisma ORM parameterized queries prevent SQL Injection |
| `NFR-SEC-005` | **Rate Limiting** | Max 10 QR scan attempts per minute per IP / User | Prevents brute-force attendance QR code guessing |
| `NFR-SEC-006` | **Payment Webhook Security** | HMAC-SHA256 signature verification on Razorpay payloads | Rejects forged payment status callbacks |

---

## 4. Availability & Reliability Requirements (NFR-AVAIL)

| NFR ID | Parameter | SLA Target | Measurement / Recovery |
| :--- | :--- | :--- | :--- |
| `NFR-AVAIL-001` | **System Uptime SLA** | 99.5% Monthly Uptime | Excludes planned maintenance windows |
| `NFR-AVAIL-002` | **Recovery Point Objective (RPO)** | $\le 15 \text{ minutes}$ | Managed by Neon PostgreSQL Point-in-Time Recovery (PITR) |
| `NFR-AVAIL-003` | **Recovery Time Objective (RTO)** | $\le 1 \text{ hour}$ | Automated Vercel deployment rollback + Neon DB restore |

---

## 5. Observability, Logging & Audit Requirements (NFR-LOG)

| NFR ID | Operational Area | Standard | Storage & Retention |
| :--- | :--- | :--- | :--- |
| `NFR-LOG-001` | **Structured Application Logging** | JSON-formatted logs containing Timestamp, RequestID, UserId, Endpoint, Status Code, Latency | Retained for 30 days in centralized log analyzer |
| `NFR-LOG-002` | **Security & Admin Audit Trail** | Log all administrative manual attendance overrides, product stock edits, and user role updates in `AuditLog` table | Immutable log records retained for 365 days |
| `NFR-LOG-003` | **Error Tracking & Alerting** | Real-time tracking of uncaught exceptions via Sentry / Logflare | Alerts triggered when 5XX error rate exceeds 1% of traffic |
