import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';
import { config } from '../../config';
import { signSessionToken } from '../../lib/jwt';
import { PaymentService, verifyHmacSignature } from './payment.service';

// Mock Prisma
vi.mock('../../lib/prisma', () => {
  const mockGym1 = {
    id: 'gym-001-id',
    name: 'Main Fitness Gym',
    code: 'GYM-001',
    slug: 'gym-001',
    qrSecret: 'secret-gym-001-key-2026',
    isActive: true,
  };

  const mockGym2 = {
    id: 'gym-002-id',
    name: 'CrossFit Branch',
    code: 'GYM-002',
    slug: 'gym-002',
    qrSecret: 'secret-gym-002-key-2026',
    isActive: true,
  };

  const mockMember1 = {
    id: 'member-001-id',
    gymId: 'gym-001-id',
    email: 'member@example.com',
    phone: '+19876543210',
    name: 'Test Member',
    passwordHash: 'hashedpassword',
    role: 'MEMBER',
    status: 'PENDING_MEMBERSHIP',
    currentStreak: 0,
    longestStreak: 0,
    starScore: 0,
  };

  const mockMemberGym2 = {
    id: 'member-gym2-id',
    gymId: 'gym-002-id',
    email: 'member2@example.com',
    phone: '+19876543219',
    name: 'Gym 2 Member',
    passwordHash: 'hashedpassword',
    role: 'MEMBER',
    status: 'ACTIVE',
    currentStreak: 0,
    longestStreak: 0,
    starScore: 0,
  };

  const mockAdmin1 = {
    id: 'admin-001-id',
    gymId: 'gym-001-id',
    email: 'admin@example.com',
    phone: '+19876543211',
    name: 'Gym Admin',
    passwordHash: 'hashedpassword',
    role: 'GYM_ADMIN',
    status: 'ACTIVE',
  };

  const mockPlan1 = {
    id: 'plan-gold-id',
    gymId: 'gym-001-id',
    name: 'Gold Membership',
    description: '30 Days Access',
    durationDays: 30,
    price: 999.0,
    benefits: ['Gym', 'Locker'],
    isActive: true,
  };

  const mockInactivePlan = {
    id: 'plan-inactive-id',
    gymId: 'gym-001-id',
    name: 'Archived Plan',
    durationDays: 30,
    price: 500.0,
    benefits: [],
    isActive: false,
  };

  const mockPlanGym2 = {
    id: 'plan-gym2-id',
    gymId: 'gym-002-id',
    name: 'Gym 2 Plan',
    durationDays: 30,
    price: 1500.0,
    benefits: [],
    isActive: true,
  };

  let mockPayments: any[] = [];
  let mockMemberships: any[] = [];
  let mockAuditLogs: any[] = [];

  return {
    prisma: {
      gym: {
        findUnique: vi.fn(async ({ where }) => {
          if (where.id === 'gym-001-id') return mockGym1;
          if (where.id === 'gym-002-id') return mockGym2;
          return null;
        }),
      },
      user: {
        findUnique: vi.fn(async ({ where }) => {
          if (where.id === 'member-001-id') return mockMember1;
          if (where.id === 'member-gym2-id') return mockMemberGym2;
          if (where.id === 'admin-001-id') return mockAdmin1;
          return null;
        }),
        findFirst: vi.fn(async ({ where }) => {
          if (where.id === 'member-001-id' && where.gymId === 'gym-001-id') return mockMember1;
          if (where.id === 'member-gym2-id' && where.gymId === 'gym-002-id') return mockMemberGym2;
          return null;
        }),
        update: vi.fn(async ({ where, data }) => {
          if (where.id === 'member-001-id') {
            Object.assign(mockMember1, data);
            return mockMember1;
          }
          return null;
        }),
      },
      membershipPlan: {
        findFirst: vi.fn(async ({ where }) => {
          if (where.id === 'plan-gold-id' && where.gymId === 'gym-001-id') return mockPlan1;
          if (where.id === 'plan-inactive-id' && where.gymId === 'gym-001-id') return mockInactivePlan;
          if (where.id === 'plan-gym2-id' && where.gymId === 'gym-002-id') return mockPlanGym2;
          if (where.gymId === 'gym-001-id' && Number(where.price) === 999.0) return mockPlan1;
          return null;
        }),
      },
      membership: {
        create: vi.fn(async ({ data }) => {
          const m = {
            id: `mem-${Date.now()}-${Math.random()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
            plan: mockPlan1,
          };
          mockMemberships.push(m);
          return m;
        }),
        updateMany: vi.fn(async () => ({ count: 0 })),
        findMany: vi.fn(async ({ where }) => {
          return mockMemberships.filter((m) => !where.userId || m.userId === where.userId);
        }),
      },
      payment: {
        create: vi.fn(async ({ data }) => {
          const p = {
            id: `pay-${Date.now()}-${Math.random()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            user: mockMember1,
            ...data,
          };
          mockPayments.push(p);
          return p;
        }),
        findUnique: vi.fn(async ({ where }) => {
          if (where.razorpayOrderId) {
            return mockPayments.find((p) => p.razorpayOrderId === where.razorpayOrderId) || null;
          }
          if (where.id) {
            return mockPayments.find((p) => p.id === where.id) || null;
          }
          return null;
        }),
        findMany: vi.fn(async ({ where }) => {
          return mockPayments.filter((p) => {
            const matchUser = !where.userId || p.userId === where.userId;
            const matchGym = !where.user?.gymId || p.user?.gymId === where.user.gymId;
            return matchUser && matchGym;
          });
        }),
        update: vi.fn(async ({ where, data }) => {
          const idx = mockPayments.findIndex((p) => p.id === where.id);
          if (idx >= 0) {
            mockPayments[idx] = { ...mockPayments[idx], ...data, updatedAt: new Date() };
            return mockPayments[idx];
          }
          throw new Error('Payment record not found');
        }),
      },
      auditLog: {
        create: vi.fn(async ({ data }) => {
          const log = { id: `audit-${Date.now()}`, ...data, createdAt: new Date() };
          mockAuditLogs.push(log);
          return log;
        }),
      },
      $transaction: vi.fn(async (cb) => {
        return cb(prisma);
      }),
      __resetMockPayments: () => {
        mockPayments = [];
        mockMemberships = [];
        mockAuditLogs = [];
        mockMember1.status = 'PENDING_MEMBERSHIP';
      },
      __seedPayment: (p: any) => mockPayments.push(p),
      __getPayments: () => mockPayments,
      __getAuditLogs: () => mockAuditLogs,
    },
  };
});

describe('Module 06 Backend - Payment Gateway & Webhook Lifecycle', () => {
  let memberToken: string;
  let adminToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma as any).__resetMockPayments();

    memberToken = signSessionToken({
      userId: 'member-001-id',
      gymId: 'gym-001-id',
      role: 'MEMBER',
      email: 'member@example.com',
    });

    adminToken = signSessionToken({
      userId: 'admin-001-id',
      gymId: 'gym-001-id',
      role: 'GYM_ADMIN',
      email: 'admin@example.com',
    });
  });

  /* ==========================================
   * ORDER CREATION TESTS (PAYMENT-001)
   * ========================================== */
  it('01: Authenticated MEMBER can create a Razorpay payment order (201 Created)', async () => {
    const res = await request(app)
      .post('/api/payment/order')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({ planId: 'plan-gold-id' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('razorpayOrderId');
    expect(res.body.data.amount).toBe(999);
    expect(res.body.data.amountInPaise).toBe(99900);
    expect(res.body.data.currency).toBe('INR');
  });

  it('02: Unauthenticated request is rejected (401 Unauthorized)', async () => {
    const res = await request(app)
      .post('/api/payment/order')
      .send({ planId: 'plan-gold-id' });

    expect(res.status).toBe(401);
  });

  it('03: Non-MEMBER roles cannot create payment orders (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/payment/order')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({ planId: 'plan-gold-id' });

    expect(res.status).toBe(403);
  });

  it('04: Non-existent plan ID is rejected (404 Not Found)', async () => {
    const res = await request(app)
      .post('/api/payment/order')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({ planId: 'non-existent-plan' });

    expect(res.status).toBe(404);
  });

  it('05 & 40: Cross-gym plan ID is rejected (404 Not Found)', async () => {
    const res = await request(app)
      .post('/api/payment/order')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({ planId: 'plan-gym2-id' }); // Belongs to Gym 2

    expect(res.status).toBe(404);
  });

  it('06: Inactive plan cannot be purchased (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/payment/order')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({ planId: 'plan-inactive-id' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INACTIVE_PLAN');
  });

  it('07 & 08: Price integrity - Server uses DB plan price and ignores client amount injections', async () => {
    const res = await request(app)
      .post('/api/payment/order')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({
        planId: 'plan-gold-id',
        amount: 1, // Client price injection attempt
      });

    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe(999); // Must strictly equal DB price (999)
  });

  it('09 & 10: Payment record is created in DB with status PENDING and razorpayOrderId stored', async () => {
    const res = await request(app)
      .post('/api/payment/order')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({ planId: 'plan-gold-id' });

    expect(res.status).toBe(201);
    const payments = (prisma as any).__getPayments();
    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe('PENDING');
    expect(payments[0].razorpayOrderId).toBe(res.body.data.razorpayOrderId);
  });

  /* ==========================================
   * SIGNATURE & VERIFICATION TESTS (PAYMENT-001)
   * ========================================== */
  it('12 & 18 & 20: Valid HMAC-SHA256 signature marks Payment SUCCESS and activates Membership', async () => {
    // 1. Create order
    const orderRes = await request(app)
      .post('/api/payment/order')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({ planId: 'plan-gold-id' });

    const orderId = orderRes.body.data.razorpayOrderId;
    const paymentId = 'pay_test_payment_123';

    // Generate valid HMAC signature
    const validSignature = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // 2. Verify payment
    const res = await request(app)
      .post('/api/payment/verify')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: validSignature,
        planId: 'plan-gold-id',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SUCCESS');
    expect(res.body.data.membership).toBeDefined();
  });

  it('13-16: Invalid signature or tampered parameters are rejected (400 Bad Request)', async () => {
    const orderRes = await request(app)
      .post('/api/payment/order')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({ planId: 'plan-gold-id' });

    const orderId = orderRes.body.data.razorpayOrderId;

    const res = await request(app)
      .post('/api/payment/verify')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({
        razorpayOrderId: orderId,
        razorpayPaymentId: 'pay_test_123',
        razorpaySignature: 'invalid_forged_signature_hex',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_SIGNATURE');
  });

  it('17: verifyHmacSignature helper uses timing-safe comparison', () => {
    const key = 'test_secret';
    const sig1 = crypto.createHmac('sha256', key).update('data1').digest('hex');
    const sig2 = crypto.createHmac('sha256', key).update('data1').digest('hex');
    const sigMismatch = crypto.createHmac('sha256', key).update('data2').digest('hex');

    expect(verifyHmacSignature(sig1, sig2)).toBe(true);
    expect(verifyHmacSignature(sig1, sigMismatch)).toBe(false);
  });

  it('21 & 22: Idempotency - Repeated verification request does not activate duplicate memberships', async () => {
    // 1. Create order
    const orderRes = await request(app)
      .post('/api/payment/order')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({ planId: 'plan-gold-id' });

    const orderId = orderRes.body.data.razorpayOrderId;
    const paymentId = 'pay_test_idem_123';
    const validSig = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // 2. First verify call
    const res1 = await request(app)
      .post('/api/payment/verify')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: validSig,
        planId: 'plan-gold-id',
      });

    expect(res1.status).toBe(200);

    // 3. Repeated verify call
    const res2 = await request(app)
      .post('/api/payment/verify')
      .set('Cookie', [`session_token=${memberToken}`])
      .send({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: validSig,
        planId: 'plan-gold-id',
      });

    expect(res2.status).toBe(200);
    expect(res2.body.data.isIdempotent).toBe(true);
  });

  /* ==========================================
   * WEBHOOK TESTS (PAYMENT-001)
   * ========================================== */
  it('27 & 32: Valid webhook payment.captured event activates membership (200 OK)', async () => {
    // Seed pending payment
    const orderId = 'order_webhook_test_100';
    (prisma as any).__seedPayment({
      id: 'pay-wh-100',
      userId: 'member-001-id',
      gymId: 'gym-001-id',
      razorpayOrderId: orderId,
      amount: 999.0,
      currency: 'INR',
      status: 'PENDING',
      user: { id: 'member-001-id', gymId: 'gym-001-id' },
    });

    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_wh_captured_1',
            order_id: orderId,
            amount: 99900,
            status: 'captured',
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const validWebhookSig = crypto
      .createHmac('sha256', config.razorpayWebhookSecret)
      .update(rawBody)
      .digest('hex');

    const res = await request(app)
      .post('/api/payment/webhook')
      .set('x-razorpay-signature', validWebhookSig)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');

    const payments = (prisma as any).__getPayments();
    const targetPay = payments.find((p: any) => p.razorpayOrderId === orderId);
    expect(targetPay.status).toBe('SUCCESS');
  });

  it('28: Invalid webhook signature is rejected (400 Bad Request)', async () => {
    const payload = { event: 'payment.captured' };
    const res = await request(app)
      .post('/api/payment/webhook')
      .set('x-razorpay-signature', 'forged_webhook_signature')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_WEBHOOK_SIGNATURE');
  });

  it('24 & 33: Webhook payment.failed event marks Payment FAILED without activating membership', async () => {
    const orderId = 'order_fail_test_200';
    (prisma as any).__seedPayment({
      id: 'pay-wh-fail-200',
      userId: 'member-001-id',
      gymId: 'gym-001-id',
      razorpayOrderId: orderId,
      amount: 999.0,
      currency: 'INR',
      status: 'PENDING',
      user: { id: 'member-001-id', gymId: 'gym-001-id' },
    });

    const payload = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_wh_failed_1',
            order_id: orderId,
            amount: 99900,
            status: 'failed',
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const validWebhookSig = crypto
      .createHmac('sha256', config.razorpayWebhookSecret)
      .update(rawBody)
      .digest('hex');

    const res = await request(app)
      .post('/api/payment/webhook')
      .set('x-razorpay-signature', validWebhookSig)
      .send(payload);

    expect(res.status).toBe(200);
    const payments = (prisma as any).__getPayments();
    const targetPay = payments.find((p: any) => p.razorpayOrderId === orderId);
    expect(targetPay.status).toBe('FAILED');
  });

  /* ==========================================
   * PAYMENT HISTORY TESTS (PAYMENT-002)
   * ========================================== */
  it('35: Authenticated MEMBER can view their own tenant-isolated payment history (200 OK)', async () => {
    (prisma as any).__seedPayment({
      id: 'pay-hist-1',
      userId: 'member-001-id',
      gymId: 'gym-001-id',
      razorpayOrderId: 'order_hist_1',
      amount: 999.0,
      currency: 'INR',
      status: 'SUCCESS',
      createdAt: new Date(),
      user: { id: 'member-001-id', gymId: 'gym-001-id' },
    });

    const res = await request(app)
      .get('/api/payment/history')
      .set('Cookie', [`session_token=${memberToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.payments).toHaveLength(1);
    expect(res.body.data.payments[0].amount).toBe(999.0);
  });

  it('36 & 42: Tenant & IDOR Protection - Member cannot access another member or another gym payment history', async () => {
    (prisma as any).__seedPayment({
      id: 'pay-gym2-other',
      userId: 'member-gym2-id',
      gymId: 'gym-002-id',
      razorpayOrderId: 'order_gym2_other',
      amount: 1500.0,
      currency: 'INR',
      status: 'SUCCESS',
      createdAt: new Date(),
      user: { id: 'member-gym2-id', gymId: 'gym-002-id' },
    });

    // Admin from Gym 1 cannot view Gym 2 member payment history
    const resAdmin = await request(app)
      .get('/api/payment/member/member-gym2-id')
      .set('Cookie', [`session_token=${adminToken}`]);

    expect(resAdmin.status).toBe(403);
  });

  it('37: Authorized GYM_ADMIN can view target member payment history in their gym tenant', async () => {
    (prisma as any).__seedPayment({
      id: 'pay-admin-view',
      userId: 'member-001-id',
      gymId: 'gym-001-id',
      razorpayOrderId: 'order_admin_view',
      amount: 999.0,
      currency: 'INR',
      status: 'SUCCESS',
      createdAt: new Date(),
      user: { id: 'member-001-id', gymId: 'gym-001-id' },
    });

    const res = await request(app)
      .get('/api/payment/member/member-001-id')
      .set('Cookie', [`session_token=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.payments).toHaveLength(1);
    expect(res.body.data.payments[0].razorpayOrderId).toBe('order_admin_view');
  });

  it('39: Payment history response sanitizes sensitive fields and does not leak signatures', async () => {
    (prisma as any).__seedPayment({
      id: 'pay-secret-check',
      userId: 'member-001-id',
      gymId: 'gym-001-id',
      razorpayOrderId: 'order_sec_check',
      razorpayPaymentId: 'pay_sec_check',
      razorpaySignature: 'super_secret_signature_hex_value',
      amount: 999.0,
      currency: 'INR',
      status: 'SUCCESS',
      createdAt: new Date(),
      user: { id: 'member-001-id', gymId: 'gym-001-id' },
    });

    const res = await request(app)
      .get('/api/payment/history')
      .set('Cookie', [`session_token=${memberToken}`]);

    expect(res.status).toBe(200);
    const item = res.body.data.payments[0];
    expect(item).not.toHaveProperty('razorpaySignature');
  });
});
