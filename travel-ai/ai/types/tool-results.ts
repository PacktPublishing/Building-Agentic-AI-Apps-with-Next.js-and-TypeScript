/**
 * Strict types for tool results to avoid 'any'
 */

export interface ToolResultBase {
    success: boolean;
    error?: string;
}

export interface ToolResultWithData<T> extends ToolResultBase {
    success: true;
    data: T[];
    meta?: {
        totalAvailable?: number;
    };
}

export interface ToolResultError extends ToolResultBase {
    success: false;
    error: string;
}

export type ToolResult<T = unknown> = ToolResultWithData<T> | ToolResultError;

// Specific tool result types
export interface FlightSegment {
    departure: {
        iataCode: string;
        at: string;
    };
    arrival: {
        iataCode: string;
        at: string;
    };
    carrierCode: string;
}

export interface FlightItinerary {
    duration: string;
    segments: FlightSegment[];
}

export interface FlightOffer {
    id: string;
    price: {
        total: string;
        currency: string;
        grandTotal?: string;
    };
    itineraries: FlightItinerary[];
    validatingAirlineCodes: string[];
}

export interface HotelAddress {
    lines?: string[];
    postalCode?: string;
}

export interface HotelInfo {
    hotelId: string;
    name: string;
    cityCode: string;
    latitude?: number;
    longitude?: number;
    address?: HotelAddress;
}

export interface HotelRoomDescription {
    text?: string;
}

export interface HotelOfferDetails {
    room?: {
        description?: HotelRoomDescription;
    };
    price?: {
        total: string;
        currency: string;
    };
}

export interface HotelOffer {
    id?: string;
    hotel?: HotelInfo;
    offers?: HotelOfferDetails[];
}

export interface Activity {
    id: string;
    name: string;
    price?: {
        amount: number;
        currency: string;
    };
    rating?: number;
}

export interface City {
    iataCode: string;
    name: string;
    address?: {
        cityName?: string;
        countryName?: string;
    };
}

export interface CurrentDate {
    day: number;
    month: number;
    year: number;
    formatted: string;
    iso: string;
}

// Union type for all possible tool results
export type FlightSearchResult = ToolResult<FlightOffer>;
export type HotelSearchResult = ToolResult<HotelOffer>;
export type ActivitySearchResult = ToolResult<Activity>;
export type CitySearchResult = ToolResult<City>;
export type DateResult = CurrentDate;

export type AnyToolResult = 
    | FlightSearchResult 
    | HotelSearchResult 
    | ActivitySearchResult 
    | CitySearchResult 
    | DateResult;
