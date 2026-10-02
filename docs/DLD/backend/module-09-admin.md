# Backend DLD - Module 09: Admin Operations & KPI Aggregator

This document details the backend analytics queries, administrative member search lookups, and audit logging engine.

---

## 1. Functional Requirement Traceability
- `ADMIN-001`: Admin Executive Dashboard Analytics
- `ADMIN-002`: Admin Member Directory & Profile Inspection

---

## 2. Executive KPI Aggregator Queries

```typescript
export async function getAdminDashboardKPIs() {
  const [
    totalMembers,
    activeMembers,
    todayAttendance,
    inactiveMembers10Days,
    monthlyRevenue,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'MEMBER' } }),
    prisma.membership.count({ where: { status: 'ACTIVE' } }),
    prisma.attendance.count({
      where: {
        attendanceDate: new Date(),
        status: 'PRESENT',
      },
    }),
    prisma.notification.count({
      where: {
        title: 'Member Inactivity Alert',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: 'SUCCESS',
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
  ]);

  return {
    totalMembers,
    activeMembers,
    todayAttendance,
    inactiveMembers10Days,
    monthlyRevenue: monthlyRevenue._sum.amount || 0,
  };
}
```
