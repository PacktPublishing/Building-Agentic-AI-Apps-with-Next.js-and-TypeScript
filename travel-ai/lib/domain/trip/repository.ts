/**
 * Domain Layer - Trip Repository Interface
 *
 * Clean Architecture: Domain layer defines contracts (interfaces)
 * Infrastructure layer provides implementations
 */

import type { TripFormInput, OrchestratorDecisions } from '@/ai/workflow/trip-planner-state';

/**
 * Trip data for saving
 */
export interface SaveTripData {
  userId: string;
  title?: string;
  formInput: TripFormInput;
  orchestratorDecisions: OrchestratorDecisions;
  flightResults: { data: any[] | null };
  hotelResults: { data: any[] | null };
  activityResults: { data: any[] | null };
  threadId: string;
}

/**
 * Saved trip result
 */
export interface SavedTrip {
  id: string;
  userId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: string;
  numPeople: number;
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  stayDuration: number;
  flights: any[];
  hotels: any[];
  activities: any[];
  status: string;
  threadId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Trip Repository Interface (Port)
 * Implementation will be in Infrastructure layer
 */
export interface ITripRepository {
  /**
   * Save trip to relational database
   */
  save(data: SaveTripData): Promise<SavedTrip>;

  /**
   * Find trip by ID
   */
  findById(tripId: string, userId: string): Promise<SavedTrip | null>;

  /**
   * Find all trips for a user
   */
  findByUserId(userId: string): Promise<SavedTrip[]>;
}
