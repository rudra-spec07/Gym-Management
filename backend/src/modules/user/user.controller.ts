import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { UserService } from './user.service';
import { UpdateProfileSchema } from './user.schema';

export class UserController {
  static async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const profile = await UserService.getProfile(req.user.userId);
      return res.status(200).json({
        success: true,
        data: { profile },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const validatedBody = UpdateProfileSchema.parse(req.body);
      const updatedProfile = await UserService.updateProfile(req.user.userId, validatedBody);

      return res.status(200).json({
        success: true,
        data: { profile: updatedProfile },
        message: 'Profile updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCommunity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      // MANDATORY TENANT SCOPING: Uses req.user.gymId from authenticated session
      const leaderboard = await UserService.getCommunityLeaderboard(req.user.gymId);

      return res.status(200).json({
        success: true,
        data: { leaderboard },
      });
    } catch (error) {
      next(error);
    }
  }
}
