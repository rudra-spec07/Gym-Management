import { z } from 'zod';

export const RegisterSchema = z.object({
  token: z.string().min(1, 'Registration onboarding token is required'),
  gymCode: z.string().min(1, 'Gym code is required'),
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address format'),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number'
    ),
  fitnessGoal: z.string().optional(),
});

export const LoginSchema = z.object({
  gymCode: z.string().optional(),
  identifier: z.string().min(1, 'Email or 10-digit Mobile number is required'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
