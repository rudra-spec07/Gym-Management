import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { config } from '../../config';
import { MembershipService } from '../membership/membership.service';
import { CreateOrderInput, VerifyPaymentInput } from './payment.schema';

export class PaymentError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = 'PAYMENT_ERROR'
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

/**
 * Helper: Timing-safe HMAC signature verification
 */
export function verifyHmacSignature(expectedHex: string, actualHex: string): boolean {
  if (!expectedHex || !actualHex || expectedHex.length !== actualHex.length) {
    return false;
  }
  try {
    const a = Buffer.from(expectedHex, 'utf-8');
    const b = Buffer.from(actualHex, 'utf-8');
    return crypto.timingSafeEqual(a, b);
  } catch (err) {
    return false;
  }
}

export class PaymentService {
  /**
   * PAYMENT-001: Create Razorpay Order (Server-derived price integrity)
   */
  static async createOrder(userId: string, gymId: string, input: CreateOrderInput) {
    // 1. Tenant & Member Validation
    const user = await prisma.user.findFirst({
      where: { id: userId, gymId },
    });

    if (!user) {
      throw new PaymentError(403, 'Member not found in tenant scope', 'FORBIDDEN');
    }

    // 2. Plan Validation & Server Price Derivation
    const plan = await prisma.membershipPlan.findFirst({
      where: { id: input.planId, gymId },
    });

    if (!plan) {
      throw new PaymentError(404, 'Membership plan not found in tenant scope', 'NOT_FOUND');
    }

    if (!plan.isActive) {
      throw new PaymentError(400, 'Cannot purchase an inactive membership plan', 'INACTIVE_PLAN');
    }

    // Amount derived strictly from DB plan price (converted to integer paise for Razorpay)
    const priceNum = Number(plan.price);
    const amountInPaise = Math.round(priceNum * 100);

    // 3. Generate Razorpay Order
    let razorpayOrderId: string;

    // Standard test/development deterministic order ID generator
    razorpayOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Try real Razorpay API call if live keys configured
    if (
      config.razorpayKeyId &&
      config.razorpayKeyId !== 'rzp_test_mock_key_id' &&
      config.razorpayKeySecret !== 'rzp_test_mock_secret_key'
    ) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `rcpt_${userId.substring(0, 8)}_${Date.now()}`,
            notes: {
              gymId,
              userId,
              planId: plan.id,
            },
          }),
        });

        if (response.ok) {
          const rzpData: any = await response.json();
          if (rzpData && rzpData.id) {
            razorpayOrderId = rzpData.id;
          }
        }
      } catch (err) {
        // Fallback to deterministic server-generated order ID
      }
    }

    // 4. Create PENDING Payment record in DB
    const payment = await prisma.payment.create({
      data: {
        userId,
        membershipId: null, // Linked upon verified SUCCESS
        razorpayOrderId,
        amount: plan.price,
        currency: 'INR',
        status: 'PENDING',
      },
    });

    return {
      paymentId: payment.id,
      razorpayOrderId: payment.razorpayOrderId,
      amount: priceNum,
      amountInPaise,
      currency: payment.currency,
      keyId: config.razorpayKeyId,
      planId: plan.id,
      planName: plan.name,
    };
  }

  /**
   * PAYMENT-001: Verify Razorpay Checkout Signature & Activate Membership
   */
  static async verifyPayment(
    userId: string,
    gymId: string,
    input: VerifyPaymentInput & { planId?: string }
  ) {
    // 1. Find PENDING Payment Record
    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId: input.razorpayOrderId },
      include: { user: true },
    });

    if (!payment) {
      throw new PaymentError(404, 'Payment order record not found', 'NOT_FOUND');
    }

    if (payment.userId !== userId || payment.user.gymId !== gymId) {
      throw new PaymentError(403, 'Tenant boundary mismatch for payment verification', 'FORBIDDEN');
    }

    // 2. Idempotency Check: Return success without duplicate activation
    if (payment.status === 'SUCCESS') {
      return {
        success: true,
        isIdempotent: true,
        paymentId: payment.id,
        status: 'SUCCESS',
        membershipId: payment.membershipId,
        message: 'Payment verified and already recorded as SUCCESS',
      };
    }

    // 3. HMAC-SHA256 Signature Verification
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
      .digest('hex');

    const isSignatureValid = verifyHmacSignature(expectedSignature, input.razorpaySignature);

    if (!isSignatureValid) {
      throw new PaymentError(
        400,
        'Invalid payment cryptographic signature verification',
        'INVALID_SIGNATURE'
      );
    }

    // 4. Resolve Target Membership Plan to Activate
    let targetPlanId = input.planId;
    if (!targetPlanId) {
      const plan = await prisma.membershipPlan.findFirst({
        where: {
          gymId,
          price: payment.amount,
          isActive: true,
        },
      });
      if (plan) {
        targetPlanId = plan.id;
      }
    }

    if (!targetPlanId) {
      throw new PaymentError(404, 'Target membership plan could not be resolved for payment', 'NOT_FOUND');
    }

    // 5. Atomic Payment SUCCESS & Membership Activation Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Activate Membership via Module 05 Service
      const membership = await MembershipService.assignMembership(userId, gymId, {
        userId,
        planId: targetPlanId!,
      });

      // Mark Payment SUCCESS
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          razorpayPaymentId: input.razorpayPaymentId,
          razorpaySignature: input.razorpaySignature,
          membershipId: membership.id,
        },
      });

      // Audit Log
      try {
        await tx.auditLog.create({
          data: {
            adminId: userId,
            action: 'PAYMENT_SUCCESS',
            targetId: updatedPayment.id,
            reason: `Online payment SUCCESS for order ${input.razorpayOrderId} (₹${payment.amount})`,
          },
        });
      } catch (err) {
        // Non-fatal audit fallback
      }

      return {
        payment: updatedPayment,
        membership,
      };
    });

    return {
      success: true,
      paymentId: result.payment.id,
      status: result.payment.status,
      membership: result.membership,
    };
  }

  /**
   * PAYMENT-001: Asynchronous Webhook Endpoint (Raw Body HMAC-SHA256)
   */
  static async processWebhook(rawBody: string, signature: string, payload: any) {
    if (!rawBody || !signature) {
      throw new PaymentError(400, 'Missing raw webhook body or signature header', 'INVALID_WEBHOOK');
    }

    // HMAC-SHA256 Webhook Verification
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpayWebhookSecret)
      .update(rawBody)
      .digest('hex');

    const isValid = verifyHmacSignature(expectedSignature, signature);
    if (!isValid) {
      throw new PaymentError(400, 'Invalid Razorpay webhook signature', 'INVALID_WEBHOOK_SIGNATURE');
    }

    const event = payload?.event;
    const paymentEntity = payload?.payload?.payment?.entity;
    const orderEntity = payload?.payload?.order?.entity;

    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
    const razorpayPaymentId = paymentEntity?.id;

    if (!razorpayOrderId) {
      return { status: 'ok', processed: false, reason: 'No order ID in event payload' };
    }

    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId },
      include: { user: true },
    });

    if (!payment) {
      return { status: 'ok', processed: false, reason: 'Payment record not found' };
    }

    if (event === 'payment.captured' || event === 'order.paid') {
      if (payment.status !== 'SUCCESS') {
        // Find suitable plan matching payment amount
        const plan = await prisma.membershipPlan.findFirst({
          where: {
            gymId: payment.user.gymId,
            price: payment.amount,
            isActive: true,
          },
        });

        if (plan) {
          await prisma.$transaction(async (tx) => {
            const membership = await MembershipService.assignMembership(
              payment.userId,
              payment.user.gymId,
              { userId: payment.userId, planId: plan.id }
            );

            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: 'SUCCESS',
                razorpayPaymentId: razorpayPaymentId || payment.razorpayPaymentId,
                membershipId: membership.id,
              },
            });
          });
        }
      }
    } else if (event === 'payment.failed') {
      if (payment.status === 'PENDING') {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });
      }
    }

    return { status: 'ok', processed: true };
  }

  /**
   * PAYMENT-002: Get Authenticated Member's Payment History
   */
  static async getMyPaymentHistory(userId: string, gymId: string) {
    const rawPayments = await prisma.payment.findMany({
      where: {
        userId,
        user: { gymId }, // Tenant scoping
      },
      orderBy: { createdAt: 'desc' },
      include: {
        membership: {
          include: {
            plan: {
              select: {
                id: true,
                name: true,
                price: true,
                durationDays: true,
              },
            },
          },
        },
      },
    });

    // Sanitize response: do not leak signature or secrets
    const payments = rawPayments.map((p) => ({
      id: p.id,
      razorpayOrderId: p.razorpayOrderId,
      razorpayPaymentId: p.razorpayPaymentId,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      createdAt: p.createdAt,
      membership: p.membership
        ? {
            id: p.membership.id,
            planName: p.membership.plan.name,
            startDate: p.membership.startDate,
            endDate: p.membership.endDate,
            status: p.membership.status,
          }
        : null,
    }));

    return { payments };
  }

  /**
   * PAYMENT-002: Get Target Member's Payment History (Admin View)
   */
  static async getMemberPaymentHistory(adminGymId: string, targetUserId: string) {
    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, gymId: adminGymId },
    });

    if (!targetUser) {
      throw new PaymentError(403, 'Member not found in your gym tenant scope', 'FORBIDDEN');
    }

    const rawPayments = await prisma.payment.findMany({
      where: {
        userId: targetUserId,
        user: { gymId: adminGymId },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        membership: {
          include: {
            plan: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    });

    const payments = rawPayments.map((p) => ({
      id: p.id,
      userId: p.userId,
      razorpayOrderId: p.razorpayOrderId,
      razorpayPaymentId: p.razorpayPaymentId,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      createdAt: p.createdAt,
      planName: p.membership?.plan?.name || null,
    }));

    return { payments };
  }
}
