'use client';

import { Activity } from '../api/chat/types';
import Image from 'next/image';

interface ActivityCardProps {
    activity: Activity;
}

export function ActivityCard({ activity }: ActivityCardProps) {
    return (
        <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white">
            {activity.pictures && activity.pictures.length > 0 && (
                <div className="relative h-48 w-full">
                    <Image
                        src={activity.pictures[0]}
                        alt={activity.name}
                        fill
                        className="object-cover"
                        unoptimized
                    />
                </div>
            )}
            <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                    {activity.name}
                </h3>
                
                <div className="flex items-center justify-between mb-3">
                    <div className="text-2xl font-bold text-blue-600">
                        {activity.price.currencyCode} {parseFloat(activity.price.amount).toFixed(0)}
                    </div>
                    {activity.minimumDuration && (
                        <div className="text-sm text-gray-600">
                            ⏱️ {activity.minimumDuration}
                        </div>
                    )}
                </div>

                <a
                    href={activity.bookingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                    Book Now
                </a>
            </div>
        </div>
    );
}
