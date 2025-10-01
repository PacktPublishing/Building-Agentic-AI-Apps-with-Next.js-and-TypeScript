/**
 * Global TypeScript Types
 * Shared types used across the application
 */

// Re-export validation types
export type { User, UpdateUserInput } from '@/lib/validations/user';
export type { Trip, CreateTripInput, UpdateTripInput } from '@/lib/validations/trip';

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Common utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (
  ...args: any
) => Promise<infer R>
  ? R
  : any;
