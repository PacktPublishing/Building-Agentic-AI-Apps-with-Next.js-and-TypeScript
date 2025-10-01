/**
 * User Validation Schemas
 * Zod schemas for user-related data validation
 */

import { z } from 'zod';

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1, 'Name is required'),
  avatar: z.string().url().optional(),
  preferences: z.object({
    currency: z.string().default('USD'),
    language: z.string().default('en'),
    notifications: z.boolean().default(true),
  }).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const updateUserSchema = userSchema.partial().required({ id: true });

export type User = z.infer<typeof userSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
