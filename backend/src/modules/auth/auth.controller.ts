import { Response, NextFunction } from 'express';
import { RegisterSchema, LoginSchema } from './auth.schema';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export class AuthController {
  static async register(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validatedBody = RegisterSchema.parse(req.body);
      const result = await AuthService.register(validatedBody);

      // Set HTTP-Only Session Cookie
      res.cookie('session_token', result.token, COOKIE_OPTIONS);

      return res.status(201).json({
        success: true,
        data: {
          user: result.user,
          redirectTo: result.redirectTo,
        },
        message: 'Member registered successfully. Redirecting to plan selection.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validatedBody = LoginSchema.parse(req.body);
      const result = await AuthService.login(validatedBody);

      // Set HTTP-Only Session Cookie
      res.cookie('session_token', result.token, COOKIE_OPTIONS);

      return res.status(200).json({
        success: true,
        data: {
          user: result.user,
          redirectTo: result.redirectTo,
        },
        message: 'Login successful',
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const token = req.query.token as string;
      const gymCode = req.query.gymCode as string | undefined;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Token query parameter is required' },
        });
      }

      const result = await AuthService.verifyRegistrationToken(token, gymCode);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPublicGym(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const code = req.params.code;
      const gym = await AuthService.getPublicGymByCode(code);
      return res.status(200).json({
        success: true,
        data: { gym },
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(_req: AuthenticatedRequest, res: Response) {
    const { maxAge, ...clearOptions } = COOKIE_OPTIONS;
    res.clearCookie('session_token', clearOptions);
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'No active session' },
        });
      }

      const userProfile = await AuthService.getMe(req.user.userId);
      return res.status(200).json({
        success: true,
        data: { user: userProfile },
      });
    } catch (error) {
      next(error);
    }
  }
}
