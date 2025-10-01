/**
 * Domain Models
 * Core business domain types
 */

// Trip status
export type TripStatus = 'draft' | 'planned' | 'booked' | 'completed' | 'cancelled';

// Booking types
export interface Booking {
  id: string;
  tripId: string;
  type: 'flight' | 'hotel' | 'activity';
  status: 'pending' | 'confirmed' | 'cancelled';
  details: FlightBooking | HotelBooking | ActivityBooking;
  price: {
    amount: number;
    currency: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface FlightBooking {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  airline?: string;
  flightNumber?: string;
}

export interface HotelBooking {
  name: string;
  location: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  roomType?: string;
}

export interface ActivityBooking {
  name: string;
  location: string;
  date: string;
  duration?: string;
  participants: number;
}

// Itinerary
export interface Itinerary {
  id: string;
  tripId: string;
  days: ItineraryDay[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ItineraryDay {
  day: number;
  date: string;
  activities: Activity[];
  accommodation?: string;
  transportation?: string;
  notes?: string;
}

export interface Activity {
  id: string;
  name: string;
  description?: string;
  location: string;
  startTime?: string;
  endTime?: string;
  cost?: number;
  bookingRequired?: boolean;
}

// User preferences
export interface UserPreferences {
  currency: string;
  language: string;
  notifications: boolean;
  travelStyle?: 'budget' | 'comfort' | 'luxury';
  interests?: string[];
}
