import { Request, Response, NextFunction } from 'express';
import { verifySessionToken, TokenPayload } from '../lib/jwt';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function authenticateSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Check cookie or Bearer Authorization header
  let token: string | undefined;

  if (req.cookies && req.cookies.session_token) {
    token = req.cookies.session_token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication session cookie or Bearer token is missing.',
      },
    });
  }

  const decoded = verifySessionToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_SESSION',
        message: 'Session token has expired or is invalid. Please log in again.',
      },
    });
  }

  req.user = decoded;
  next();
}

export function requireRole(allowedRoles: Array<'SUPER_ADMIN' | 'GYM_ADMIN' | 'MEMBER'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource',
        },
      });
    }

    next();
  };
}
