import { Router } from 'express';
import { authenticateSession, requireRole } from '../../middleware/auth.middleware';
import { AttendanceController } from './attendance.controller';

export const attendanceRouter = Router();

// ATT-001: POST /api/attendance/scan (MEMBER role required)
attendanceRouter.post('/scan', authenticateSession, requireRole(['MEMBER']), AttendanceController.scan);

// ATT-002: GET /api/attendance/history (MEMBER role required)
attendanceRouter.get('/history', authenticateSession, requireRole(['MEMBER']), AttendanceController.getHistory);

// ATT-003: POST /api/attendance/manual (GYM_ADMIN & SUPER_ADMIN roles required)
attendanceRouter.post('/manual', authenticateSession, requireRole(['GYM_ADMIN', 'SUPER_ADMIN']), AttendanceController.manualOverride);
