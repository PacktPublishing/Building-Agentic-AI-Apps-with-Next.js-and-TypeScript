/**
 * Trip Validation Schemas
 * Zod schemas for trip-related data validation
 */

import { z } from 'zod';

export const tripSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  destination: z.string().min(1, 'Destination is required'),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budget: z.union([z.string(), z.number()]).optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const createTripSchema = tripSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const updateTripSchema = tripSchema.partial().required({ id: true, userId: true });

export type Trip = z.infer<typeof tripSchema>;
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
