'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FlightList } from '@/app/components/FlightList';
import { HotelList } from '@/app/components/HotelList';
import { ActivityList } from '@/app/components/ActivityList';
import {
  ArrowLeft,
  Plane,
  Hotel,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface TripDetails {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: string;
  numPeople: number;
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  stayDuration: number;
  flights: any[];
  hotels: any[];
  activities: any[];
  status: string;
  createdAt: string;
}

export default function TripDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrip() {
      try {
        const response = await fetch(`/api/trips/${tripId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Trip not found');
          } else {
            setError('Failed to load trip');
          }
          return;
        }

        const data = await response.json();
        setTrip(data.trip);
      } catch (err) {
        setError('Failed to load trip');
        console.error('Error fetching trip:', err);
      } finally {
        setLoading(false);
      }
    }

    if (tripId) {
      fetchTrip();
    }
  }, [tripId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/trips">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Trips
            </Link>
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Trip not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/trips">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{trip.title}</h1>
            <p className="text-muted-foreground">
              {trip.departureCity} → {trip.arrivalCity}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
              trip.status === 'confirmed'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Trip Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Trip Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dates</p>
                <p className="font-medium">
                  {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium">{trip.stayDuration} days</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Travelers</p>
                <p className="font-medium">{trip.numPeople} person(s)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="font-medium">${trip.budget}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flights */}
      {trip.flights && trip.flights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5" />
              Flights
              <span className="text-sm font-normal text-muted-foreground ml-auto">
                {trip.flights.length} option(s)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FlightList flights={trip.flights} />
          </CardContent>
        </Card>
      )}

      {/* Hotels */}
      {trip.hotels && trip.hotels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hotel className="w-5 h-5" />
              Hotels
              <span className="text-sm font-normal text-muted-foreground ml-auto">
                {trip.hotels.length} option(s)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HotelList hotels={trip.hotels} />
          </CardContent>
        </Card>
      )}

      {/* Activities */}
      {trip.activities && trip.activities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Activities
              <span className="text-sm font-normal text-muted-foreground ml-auto">
                {trip.activities.length} suggestion(s)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityList activities={trip.activities} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
