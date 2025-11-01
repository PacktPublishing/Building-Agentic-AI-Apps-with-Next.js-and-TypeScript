'use client';

import { Hotel } from '../api/chat/types';
import { HotelCard } from './HotelCard';

interface HotelListProps {
    hotels: Hotel[];
}

export function HotelList({ hotels }: HotelListProps) {
    if (!hotels || hotels.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No hotels found
            </div>
        );
    }

    return (
        <div className="my-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Available Hotels
                </h2>
                <span className="text-sm text-gray-600">
                    {hotels.length} hotel{hotels.length > 1 ? 's' : ''} found
                </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hotels.map((hotel) => (
                    <HotelCard key={hotel.id} hotel={hotel} />
                ))}
            </div>
        </div>
    );
}
