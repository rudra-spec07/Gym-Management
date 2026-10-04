import { Router } from 'express';
import { authenticateSession, requireRole } from '../../middleware/auth.middleware';
import { PaymentController } from './payment.controller';

export const paymentRouter = Router();

// PAYMENT-001: Order Creation & Checkout Verification
paymentRouter.post(
  '/order',
  authenticateSession,
  requireRole(['MEMBER']),
  PaymentController.createOrder
);

paymentRouter.post(
  '/verify',
  authenticateSession,
  requireRole(['MEMBER']),
  PaymentController.verifyPayment
);

// PAYMENT-001: Webhook Endpoint (HMAC-SHA256 Raw-body Verification)
paymentRouter.post('/webhook', PaymentController.processWebhook);

// PAYMENT-002: Member & Admin Payment History Logging
paymentRouter.get(
  '/history',
  authenticateSession,
  requireRole(['MEMBER']),
  PaymentController.getMyPaymentHistory
);

paymentRouter.get(
  '/member/:userId',
  authenticateSession,
  requireRole(['GYM_ADMIN', 'SUPER_ADMIN']),
  PaymentController.getMemberPaymentHistory
);
