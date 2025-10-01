/**
 * API Types
 * Types for API requests and responses
 */

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// API Error
export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: Record<string, any>;
}

// Request options
export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
}

// Trip API types
export interface GetTripsParams {
  userId: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface CreateTripRequest {
  destination: string;
  startDate: string;
  endDate: string;
  budget?: number;
  travelers?: number;
  preferences?: string[];
}

export interface UpdateTripRequest {
  id: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  status?: string;
}

// User API types
export interface UpdateUserRequest {
  id: string;
  name?: string;
  avatar?: string;
  preferences?: {
    currency?: string;
    language?: string;
    notifications?: boolean;
  };
}
