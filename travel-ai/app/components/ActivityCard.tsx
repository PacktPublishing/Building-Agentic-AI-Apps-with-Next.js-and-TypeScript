'use client';

import { Activity } from '../api/chat/types';
import Image from 'next/image';

interface ActivityCardProps {
    activity: Activity;
}

export function ActivityCard({ activity }: ActivityCardProps) {
    return (
        <div className="group relative border border-gray-200 rounded-xl overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 bg-white">
            {activity.pictures && activity.pictures.length > 0 && (
                <div className="relative h-56 w-full overflow-hidden">
                    <Image
                        src={activity.pictures[0]}
                        alt={activity.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
            )}
            <div className="p-5">
                <h3 className="font-bold text-lg mb-3 line-clamp-2 text-gray-900 group-hover:text-blue-600 transition-colors">
                    {activity.name}
                </h3>
                
                <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 uppercase tracking-wide mb-1">Price</span>
                        <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {activity.price.currencyCode} {parseFloat(activity.price.amount).toFixed(0)}
                        </div>
                    </div>
                    {activity.minimumDuration && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full">
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700">{activity.minimumDuration}</span>
                        </div>
                    )}
                </div>

                <a
                    href={activity.bookingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                    <span>Book Now</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </a>
            </div>
        </div>
    );
}
