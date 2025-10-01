/**
 * Trip Validation Schemas
 * Zod schemas for trip-related data validation
 */

import { z } from 'zod';

export const tripSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  destination: z.string().min(1, 'Destination is required'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  budget: z.number().positive().optional(),
  status: z.enum(['draft', 'planned', 'booked', 'completed', 'cancelled']).default('draft'),
  preferences: z.array(z.string()).optional(),
  travelers: z.number().int().positive().default(1),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const createTripSchema = tripSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const updateTripSchema = tripSchema.partial().required({ id: true });

export type Trip = z.infer<typeof tripSchema>;
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
