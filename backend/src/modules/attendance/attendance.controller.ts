import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import {
  AttendanceScanSchema,
  AttendanceHistoryQuerySchema,
  AttendanceManualOverrideSchema,
} from './attendance.schema';
import { AttendanceService, AttendanceError } from './attendance.service';

export class AttendanceController {
  static async scan(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      // Validate Zod Input Schema
      const parseResult = AttendanceScanSchema.safeParse(req.body);
      if (!parseResult.success) {
        const issues = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: `Validation failed: ${issues}` },
        });
      }

      const { qrTokenPayload } = parseResult.data;

      // Authoritative identity from session (req.user.userId & req.user.gymId)
      const result = await AttendanceService.processScan(req.user.userId, req.user.gymId, qrTokenPayload);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      if (err instanceof AttendanceError) {
        return res.status(err.statusCode).json({
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        });
      }

      console.error('Unhandled Attendance Scan Error:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'An internal server error occurred' },
      });
    }
  }

  static async getHistory(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      // Validate Query Parameters
      const parseResult = AttendanceHistoryQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        const issues = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: `Validation failed: ${issues}` },
        });
      }

      // Authoritative identity from session ONLY (IDOR Protection)
      const historyData = await AttendanceService.getMemberHistory(
        req.user.userId,
        req.user.gymId,
        parseResult.data
      );

      return res.status(200).json({
        success: true,
        data: historyData,
      });
    } catch (err: any) {
      if (err instanceof AttendanceError) {
        return res.status(err.statusCode).json({
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        });
      }

      console.error('Unhandled Attendance History Error:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'An internal server error occurred' },
      });
    }
  }

  static async manualOverride(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      // Validate Body Input Schema
      const parseResult = AttendanceManualOverrideSchema.safeParse(req.body);
      if (!parseResult.success) {
        const issues = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: `Validation failed: ${issues}` },
        });
      }

      // Authoritative Admin identity from session (req.user.userId & req.user.gymId)
      const result = await AttendanceService.processManualOverride(
        req.user.userId,
        req.user.gymId,
        parseResult.data
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      if (err instanceof AttendanceError) {
        return res.status(err.statusCode).json({
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        });
      }

      console.error('Unhandled Admin Attendance Override Error:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'An internal server error occurred' },
      });
    }
  }
}
