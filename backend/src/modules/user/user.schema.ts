import { z } from 'zod';

export const UpdateProfileSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    profilePicUrl: z.string().url('Invalid profile picture URL').optional().nullable(),
    fitnessGoal: z.string().max(200, 'Fitness goal cannot exceed 200 characters').optional().nullable(),
  })
  .strict('Unrecognized or protected fields provided');

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
