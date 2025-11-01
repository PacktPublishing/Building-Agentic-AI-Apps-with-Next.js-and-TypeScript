'use client';

import { Flight } from '../api/chat/types';
import { FlightCard } from './FlightCard';

interface FlightListProps {
    flights: Flight[];
}

export function FlightList({ flights }: FlightListProps) {
    if (!flights || flights.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No flights found
            </div>
        );
    }

    return (
        <div className="my-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Available Flights
                </h2>
                <span className="text-sm text-gray-600">
                    {flights.length} option{flights.length > 1 ? 's' : ''} found
                </span>
            </div>
            
            <div className="space-y-4">
                {flights.map((flight) => (
                    <FlightCard key={flight.id} flight={flight} />
                ))}
            </div>
        </div>
    );
}
