import { z } from 'zod';

export const AttendanceScanSchema = z.object({
  qrTokenPayload: z.string().min(10, 'QR token payload must be at least 10 characters'),
  clientTimestamp: z.number().int().positive('Client timestamp must be a valid positive integer timestamp'),
});

export type AttendanceScanInput = z.infer<typeof AttendanceScanSchema>;

export const AttendanceHistoryQuerySchema = z
  .object({
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid "from" date format. Expected YYYY-MM-DD')
      .refine(
        (val) => {
          const [y, m, d] = val.split('-').map(Number);
          if (m < 1 || m > 12 || d < 1 || d > 31) return false;
          const date = new Date(Date.UTC(y, m - 1, d));
          return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
        },
        { message: 'Invalid "from" calendar date' }
      )
      .optional(),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid "to" date format. Expected YYYY-MM-DD')
      .refine(
        (val) => {
          const [y, m, d] = val.split('-').map(Number);
          if (m < 1 || m > 12 || d < 1 || d > 31) return false;
          const date = new Date(Date.UTC(y, m - 1, d));
          return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
        },
        { message: 'Invalid "to" calendar date' }
      )
      .optional(),
    limit: z.coerce
      .number()
      .int()
      .positive('Limit must be a positive integer')
      .max(100, 'Maximum limit is 100')
      .optional()
      .default(50),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return new Date(data.from) <= new Date(data.to);
      }
      return true;
    },
    {
      message: '"from" date must be less than or equal to "to" date',
      path: ['from'],
    }
  );

export type AttendanceHistoryQueryInput = z.infer<typeof AttendanceHistoryQuerySchema>;

export const AttendanceManualOverrideSchema = z.object({
  userId: z.string().min(1, 'Member user ID is required'),
  attendanceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid attendanceDate format. Expected YYYY-MM-DD')
    .refine(
      (val) => {
        const [y, m, d] = val.split('-').map(Number);
        if (m < 1 || m > 12 || d < 1 || d > 31) return false;
        const date = new Date(Date.UTC(y, m - 1, d));
        return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
      },
      { message: 'Invalid calendar date' }
    ),
  status: z.enum(['PRESENT', 'ABSENT', 'EXCUSED'], {
    errorMap: () => ({ message: 'Status must be PRESENT, ABSENT, or EXCUSED' }),
  }),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
});

export type AttendanceManualOverrideInput = z.infer<typeof AttendanceManualOverrideSchema>;
