import { z } from 'zod';

export const createPlanSchema = z.object({
  name: z.string().min(2, 'Plan name must be at least 2 characters').max(100, 'Plan name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  durationDays: z.number().int().min(1, 'Duration must be at least 1 day').max(3650, 'Duration too long'),
  price: z.number().positive('Price must be a positive number'),
  benefits: z.array(z.string().max(200, 'Benefit item too long')).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

export const updatePlanSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  durationDays: z.number().int().min(1).max(3650).optional(),
  price: z.number().positive().optional(),
  benefits: z.array(z.string().max(200)).optional(),
  isActive: z.boolean().optional(),
});

export const assignMembershipSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  planId: z.string().min(1, 'Plan ID is required'),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start date format' })
    .optional(),
});

export const cancelMembershipSchema = z.object({
  reason: z.string().max(250, 'Reason too long').optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type AssignMembershipInput = z.infer<typeof assignMembershipSchema>;
export type CancelMembershipInput = z.infer<typeof cancelMembershipSchema>;
