'use client';

import { TripCard } from './trip-card';
import type { Trip } from '@/lib/validations/trip';

interface TripListProps {
  trips: Trip[];
  onEdit?: (trip: Trip) => void;
  onDelete?: (tripId: string) => void;
}

export function TripList({ trips, onEdit, onDelete }: TripListProps) {
  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg text-muted-foreground">No trips yet</p>
        <p className="text-sm text-muted-foreground">
          Create your first trip to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {trips.map((trip) => (
        <TripCard
          key={trip.id}
          trip={trip}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
