'use client';

import { Flight } from '../api/chat/types';

interface FlightCardProps {
    flight: Flight;
}

export function FlightCard({ flight }: FlightCardProps) {
    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-lg transition-shadow">
            {/* Price Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span className="font-semibold">Round Trip</span>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                        {flight.price.currency} {flight.price.amount.toFixed(0)}
                    </div>
                    <div className="text-xs text-blue-100">for 2 passengers</div>
                </div>
            </div>

            {/* Outbound Flight */}
            <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-semibold text-gray-700">Outbound • {formatDate(flight.outbound.departure.time)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                    {/* Departure */}
                    <div className="flex-1">
                        <div className="text-3xl font-bold text-gray-900">{formatTime(flight.outbound.departure.time)}</div>
                        <div className="text-sm font-medium text-gray-700 mt-1">{flight.outbound.departure.airport.code}</div>
                        <div className="text-xs text-gray-500">{flight.outbound.departure.airport.name}</div>
                    </div>

                    {/* Flight Info */}
                    <div className="flex-1 px-4">
                        <div className="relative">
                            <div className="border-t-2 border-gray-300 border-dashed"></div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                            </div>
                        </div>
                        <div className="text-center mt-2">
                            <div className="text-xs font-medium text-gray-600">{flight.outbound.duration}</div>
                            <div className="text-xs text-gray-500">
                                {flight.outbound.stops === 0 ? 'Direct' : `${flight.outbound.stops} stop${flight.outbound.stops > 1 ? 's' : ''}`}
                            </div>
                        </div>
                    </div>

                    {/* Arrival */}
                    <div className="flex-1 text-right">
                        <div className="text-3xl font-bold text-gray-900">{formatTime(flight.outbound.arrival.time)}</div>
                        <div className="text-sm font-medium text-gray-700 mt-1">{flight.outbound.arrival.airport.code}</div>
                        <div className="text-xs text-gray-500">{flight.outbound.arrival.airport.name}</div>
                    </div>
                </div>

                {/* Airline */}
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>{flight.outbound.airline.name} ({flight.outbound.airline.code})</span>
                </div>
            </div>

            {/* Inbound Flight */}
            <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-sm font-semibold text-gray-700">Return • {formatDate(flight.inbound.departure.time)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                    {/* Departure */}
                    <div className="flex-1">
                        <div className="text-3xl font-bold text-gray-900">{formatTime(flight.inbound.departure.time)}</div>
                        <div className="text-sm font-medium text-gray-700 mt-1">{flight.inbound.departure.airport.code}</div>
                        <div className="text-xs text-gray-500">{flight.inbound.departure.airport.name}</div>
                    </div>

                    {/* Flight Info */}
                    <div className="flex-1 px-4">
                        <div className="relative">
                            <div className="border-t-2 border-gray-300 border-dashed"></div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                                <svg className="w-5 h-5 text-orange-600 transform rotate-180" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                            </div>
                        </div>
                        <div className="text-center mt-2">
                            <div className="text-xs font-medium text-gray-600">{flight.inbound.duration}</div>
                            <div className="text-xs text-gray-500">
                                {flight.inbound.stops === 0 ? 'Direct' : `${flight.inbound.stops} stop${flight.inbound.stops > 1 ? 's' : ''}`}
                            </div>
                        </div>
                    </div>

                    {/* Arrival */}
                    <div className="flex-1 text-right">
                        <div className="text-3xl font-bold text-gray-900">{formatTime(flight.inbound.arrival.time)}</div>
                        <div className="text-sm font-medium text-gray-700 mt-1">{flight.inbound.arrival.airport.code}</div>
                        <div className="text-xs text-gray-500">{flight.inbound.arrival.airport.name}</div>
                    </div>
                </div>

                {/* Airline */}
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>{flight.inbound.airline.name} ({flight.inbound.airline.code})</span>
                </div>
            </div>
        </div>
    );
}
