import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { MembershipService, MembershipError } from './membership.service';
import {
  createPlanSchema,
  updatePlanSchema,
  assignMembershipSchema,
  cancelMembershipSchema,
} from './membership.schema';

export class MembershipController {
  /**
   * MEMBERSHIP-001: Create Membership Plan
   */
  static async createPlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parseResult = createPlanSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: parseResult.error.errors.map((e) => e.message).join(', '),
          },
        });
      }

      const plan = await MembershipService.createPlan(
        req.user!.userId,
        req.user!.gymId,
        parseResult.data
      );

      return res.status(201).json({
        success: true,
        data: plan,
      });
    } catch (error) {
      if (error instanceof MembershipError) {
        return res.status(error.statusCode).json({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      next(error);
    }
  }

  /**
   * MEMBERSHIP-001: Get Membership Plans for tenant gym
   */
  static async getPlans(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const plans = await MembershipService.getPlans(req.user!.gymId, includeInactive);

      return res.status(200).json({
        success: true,
        data: { plans },
      });
    } catch (error) {
      if (error instanceof MembershipError) {
        return res.status(error.statusCode).json({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      next(error);
    }
  }

  /**
   * MEMBERSHIP-001: Get Membership Plan Details
   */
  static async getPlanById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const plan = await MembershipService.getPlanById(req.user!.gymId, req.params.id);

      return res.status(200).json({
        success: true,
        data: { plan },
      });
    } catch (error) {
      if (error instanceof MembershipError) {
        return res.status(error.statusCode).json({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      next(error);
    }
  }

  /**
   * MEMBERSHIP-001: Update Membership Plan
   */
  static async updatePlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parseResult = updatePlanSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: parseResult.error.errors.map((e) => e.message).join(', '),
          },
        });
      }

      const plan = await MembershipService.updatePlan(
        req.user!.userId,
        req.user!.gymId,
        req.params.id,
        parseResult.data
      );

      return res.status(200).json({
        success: true,
        data: plan,
      });
    } catch (error) {
      if (error instanceof MembershipError) {
        return res.status(error.statusCode).json({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      next(error);
    }
  }

  /**
   * MEMBERSHIP-002: Assign Membership to Member
   */
  static async assignMembership(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parseResult = assignMembershipSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: parseResult.error.errors.map((e) => e.message).join(', '),
          },
        });
      }

      const membership = await MembershipService.assignMembership(
        req.user!.userId,
        req.user!.gymId,
        parseResult.data
      );

      return res.status(201).json({
        success: true,
        data: membership,
      });
    } catch (error) {
      if (error instanceof MembershipError) {
        return res.status(error.statusCode).json({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      next(error);
    }
  }

  /**
   * MEMBERSHIP-002: Get Authenticated Member's Memberships
   */
  static async getMyMemberships(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await MembershipService.getMyMemberships(req.user!.userId, req.user!.gymId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof MembershipError) {
        return res.status(error.statusCode).json({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      next(error);
    }
  }

  /**
   * MEMBERSHIP-002: Get Target Member's Memberships (Admin view)
   */
  static async getMemberMemberships(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const memberships = await MembershipService.getMemberMemberships(
        req.user!.gymId,
        req.params.userId
      );

      return res.status(200).json({
        success: true,
        data: { memberships },
      });
    } catch (error) {
      if (error instanceof MembershipError) {
        return res.status(error.statusCode).json({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      next(error);
    }
  }

  /**
   * MEMBERSHIP-002: Cancel Membership
   */
  static async cancelMembership(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parseResult = cancelMembershipSchema.safeParse(req.body || {});
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: parseResult.error.errors.map((e) => e.message).join(', '),
          },
        });
      }

      const membership = await MembershipService.cancelMembership(
        req.user!.userId,
        req.user!.gymId,
        req.params.id,
        parseResult.data
      );

      return res.status(200).json({
        success: true,
        data: membership,
      });
    } catch (error) {
      if (error instanceof MembershipError) {
        return res.status(error.statusCode).json({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      next(error);
    }
  }
}
