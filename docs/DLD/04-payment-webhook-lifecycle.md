# 04. Razorpay Payment & Webhook Lifecycle Engine

This document specifies the exact code specifications for Razorpay Order creation, client checkout modal setup, server signature verification, and asynchronous webhook handling.

---

## 1. Razorpay Order Creation Route Spec

```typescript
// app/api/payments/create-order/route.ts
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const CreateOrderSchema = z.object({
  planId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { planId } = CreateOrderSchema.parse(body);

    const plan = await prisma.membershipPlan.findUniqueOrThrow({
      where: { id: planId, isActive: true },
    });

    const amountInPaise = Math.round(Number(plan.price) * 100);

    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    });

    // Save pending payment record in DB
    const payment = await prisma.payment.create({
      data: {
        userId: 'session_user_id', // Resolved from session
        amount: plan.price,
        razorpayOrderId: rzpOrder.id,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Order creation failed' }, { status: 400 });
  }
}
```

---

## 2. Server Signature Verification Logic

```typescript
// lib/payments/verify-signature.ts
import crypto from 'crypto';

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return generatedSignature === signature;
}
```

---

## 3. Asynchronous Razorpay Webhook Handler

```typescript
// app/api/webhooks/razorpay/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const bodyText = await req.text();
  const signature = req.headers.get('x-razorpay-signature');

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(bodyText)
    .digest('hex');

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid Webhook Signature' }, { status: 400 });
  }

  const payload = JSON.parse(bodyText);

  if (payload.event === 'payment.captured') {
    const paymentEntity = payload.payload.payment.entity;
    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;

    const existingPayment = await prisma.payment.findUnique({
      where: { razorpayOrderId: orderId },
    });

    if (existingPayment && existingPayment.status !== 'SUCCESS') {
      await prisma.$transaction([
        prisma.payment.update({
          where: { razorpayOrderId: orderId },
          data: { status: 'SUCCESS', razorpayPaymentId: paymentId },
        }),
        // Activate membership...
      ]);
    }
  }

  return NextResponse.json({ status: 'ok' });
}
```
