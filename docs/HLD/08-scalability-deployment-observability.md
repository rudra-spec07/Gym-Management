# 08. Scalability, Deployment & Observability Architecture

This document defines the production deployment topology, serverless auto-scaling behavior, disaster recovery, logging standards, error tracking, and monitoring specifications.

---

## 1. Production Deployment Topology

The application is deployed on Vercel's global edge platform, backed by Neon PostgreSQL serverless database clusters.

```mermaid
graph TD
    subgraph Global Edge Layer
        DNS[Cloudflare / Route 53 DNS]
        EDGE[Vercel Edge Network / CDN Node]
    end

    subgraph Compute Layer (Serverless Engine)
        FUNC1[Next.js Serverless Function Instance 1]
        FUNC2[Next.js Serverless Function Instance 2]
        FUNCN[Next.js Serverless Function Instance N]
    end

    subgraph Database Layer
        NEON_POOL[Neon Connection Pooler - PgBouncer]
        NEON_PRIMARY[(Neon Primary Serverless Postgres DB)]
        NEON_REPLICA[(Neon Read Replica DB)]
    end

    DNS --> EDGE
    EDGE --> FUNC1
    EDGE --> FUNC2
    EDGE --> FUNCN

    FUNC1 --> NEON_POOL
    FUNC2 --> NEON_POOL
    FUNCN --> NEON_POOL

    NEON_POOL --> NEON_PRIMARY
    NEON_PRIMARY -. Real-time Async Replication .-> NEON_REPLICA
```

---

## 2. Serverless Auto-Scaling Strategy

1. **Next.js Route Handlers**: Vercel automatically scales serverless function instances dynamically from zero to hundreds of concurrent executions in response to incoming traffic bursts (e.g. morning 6 AM - 9 AM gym rush).
2. **Neon Database Connection Pooling**: To prevent PostgreSQL `too many connections` errors under high concurrent serverless function spins, all Prisma database calls connect through Neon's connection pooler (`pgBouncer`), sustaining up to 10,000 pooled client connections.

---

## 3. Observability, Logging & Monitoring SLA

- **Structured JSON Logging**: All Next.js server actions and API route handlers write logs using a structured JSON format:
  ```json
  {
    "timestamp": "2026-10-02T18:05:00.123Z",
    "level": "INFO",
    "requestId": "req_89234723",
    "userId": "usr_991823",
    "action": "ATTENDANCE_SCAN_SUCCESS",
    "latencyMs": 142,
    "environment": "production"
  }
  ```
- **Error Tracking**: Integrated with Sentry / Logflare for real-time alerting on uncaught 5XX server errors.
- **System SLA Targets**:
  - **Uptime Target**: 99.5% Monthly Uptime SLA
  - **Latency SLA**: $\le 500 \text{ ms}$ for 95th percentile QR check-ins
  - **Recovery Point Objective (RPO)**: $\le 15 \text{ minutes}$ via Neon Point-In-Time-Recovery (PITR).
