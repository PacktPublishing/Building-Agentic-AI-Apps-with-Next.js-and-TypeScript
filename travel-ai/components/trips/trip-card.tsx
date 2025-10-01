'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Trip } from '@/lib/validations/trip';
import { format } from 'date-fns';

interface TripCardProps {
  trip: Trip;
  onEdit?: (trip: Trip) => void;
  onDelete?: (tripId: string) => void;
}

export function TripCard({ trip, onEdit, onDelete }: TripCardProps) {
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{trip.destination}</h3>
          <p className="text-sm text-muted-foreground">
            {format(startDate, 'MMM dd, yyyy')} - {format(endDate, 'MMM dd, yyyy')}
          </p>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              trip.status === 'completed' ? 'bg-green-100 text-green-800' :
              trip.status === 'booked' ? 'bg-blue-100 text-blue-800' :
              trip.status === 'planned' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {trip.status}
            </span>
            {trip.budget && (
              <span className="text-sm text-muted-foreground">
                Budget: ${trip.budget}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(trip)}>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => onDelete(trip.id!)}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
