import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { PaymentService, PaymentError } from './payment.service';
import { createOrderSchema, verifyPaymentSchema } from './payment.schema';

export class PaymentController {
  /**
   * PAYMENT-001: Create Razorpay Order
   */
  static async createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parseResult = createOrderSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: parseResult.error.errors.map((e) => e.message).join(', '),
          },
        });
      }

      const orderData = await PaymentService.createOrder(
        req.user!.userId,
        req.user!.gymId,
        parseResult.data
      );

      return res.status(201).json({
        success: true,
        data: orderData,
      });
    } catch (error) {
      if (error instanceof PaymentError) {
        return res.status(error.statusCode).json({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      next(error);
    }
  }

  /**
   * PAYMENT-001: Verify Razorpay Checkout Signature & Activate Membership
   */
  static async verifyPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parseResult = verifyPaymentSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: parseResult.error.errors.map((e) => e.message).join(', '),
          },
        });
      }

      const result = await PaymentService.verifyPayment(
        req.user!.userId,
        req.user!.gymId,
        {
          ...parseResult.data,
          planId: req.body.planId,
        }
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof PaymentError) {
        return res.status(error.statusCode).json({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      next(error);
    }
  }

  /**
   * PAYMENT-001: Asynchronous Webhook Receiver
   */
  static async processWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = (req.headers['x-razorpay-signature'] as string) || '';
      const rawBody = (req as any).rawBody
        ? (req as any).rawBody.toString('utf-8')
        : JSON.stringify(req.body);

      const result = await PaymentService.processWebhook(rawBody, signature, req.body);

      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof PaymentError) {
        return res.status(error.statusCode).json({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      next(error);
    }
  }

  /**
   * PAYMENT-002: Get Authenticated Member's Own Payment History
   */
  static async getMyPaymentHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await PaymentService.getMyPaymentHistory(req.user!.userId, req.user!.gymId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof PaymentError) {
        return res.status(error.statusCode).json({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      next(error);
    }
  }

  /**
   * PAYMENT-002: Get Target Member's Payment History (Admin view)
   */
  static async getMemberPaymentHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await PaymentService.getMemberPaymentHistory(
        req.user!.gymId,
        req.params.userId
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof PaymentError) {
        return res.status(error.statusCode).json({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      next(error);
    }
  }
}
