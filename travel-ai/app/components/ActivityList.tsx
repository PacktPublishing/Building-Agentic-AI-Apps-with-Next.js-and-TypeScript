'use client';

import { Activity } from '../api/chat/types';
import { ActivityCard } from './ActivityCard';

interface ActivityListProps {
    activities: Activity[];
    totalAvailable?: number;
}

export function ActivityList({ activities, totalAvailable }: ActivityListProps) {
    return (
        <div className="my-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Activities</h2>
                {totalAvailable && totalAvailable > activities.length && (
                    <span className="text-sm text-gray-600">
                        Showing {activities.length} of {totalAvailable} available
                    </span>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activities.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} />
                ))}
            </div>
        </div>
    );
}
