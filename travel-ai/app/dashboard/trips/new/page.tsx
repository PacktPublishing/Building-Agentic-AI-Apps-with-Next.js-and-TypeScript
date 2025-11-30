"use client"

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plane, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from 'next/navigation';
import { useTripPlannerStream } from '@/app/hooks/useTripPlannerStream';
import { TripPlannerProgress } from '@/app/components/TripPlannerProgress';
import { TripPlannerResults } from '@/app/components/TripPlannerResults';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/components/auth/auth-provider';

export default function NewTripPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useAuth();
  const { isPlanning, progress, error, allComplete, startPlanning, resetPlanning } = useTripPlannerStream();

  // Form state
  const [formData, setFormData] = useState({
    numPeople: 2,
    departureCity: '',
    arrivalCity: '',
    departureDate: '',
    stayDuration: 7,
    budgetCategory: 'standard' as 'economy' | 'standard' | 'premium',
    numRooms: 1,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // City resolution state
  const [departureCityResolved, setDepartureCityResolved] = useState<{code: string; name: string; country: string} | null>(null);
  const [arrivalCityResolved, setArrivalCityResolved] = useState<{code: string; name: string; country: string} | null>(null);
  const [cityResolving, setCityResolving] = useState<'departure' | 'arrival' | null>(null);

  // Handle form input changes
  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setFormError(null);
  };

  // Resolve city to IATA code
  const resolveCity = async (cityName: string, type: 'departure' | 'arrival') => {
    if (!cityName || cityName.trim().length === 0) {
      return;
    }

    setCityResolving(type);

    try {
      const response = await fetch('/api/cities/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: cityName })
      });

      if (!response.ok) {
        throw new Error('Failed to resolve city');
      }

      const result = await response.json();

      const resolved = {
        code: result.iataCode,
        name: result.cityFullName,
        country: result.country
      };

      if (type === 'departure') {
        setDepartureCityResolved(resolved);
      } else {
        setArrivalCityResolved(resolved);
      }

    } catch (error) {
      console.error('Error resolving city:', error);
      // Keep the input as-is if resolution fails
    } finally {
      setCityResolving(null);
    }
  };

  // Validate and submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.departureCity || !formData.arrivalCity) {
      setFormError('Please enter both departure and arrival cities');
      return;
    }

    if (!formData.departureDate) {
      setFormError('Please select a departure date');
      return;
    }

    // Use resolved IATA codes if available, otherwise use input
    const departureCityCode = departureCityResolved?.code || formData.departureCity;
    const arrivalCityCode = arrivalCityResolved?.code || formData.arrivalCity;

    // Get authenticated user ID
    if (!user?.id) {
      setFormError('You must be logged in to plan a trip');
      return;
    }
    const userId = user.id;

    try {
      await startPlanning({
        numPeople: formData.numPeople,
        departureCity: departureCityCode,
        arrivalCity: arrivalCityCode,
        departureDate: formData.departureDate,
        stayDuration: formData.stayDuration,
        budgetCategory: formData.budgetCategory,
        numRooms: formData.numRooms,
        userId
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to start planning');
    }
  };

  // Save trip and redirect
  const handleConfirmTrip = async () => {
    // Validate required data is available
    if (!progress.formInput) {
      setFormError('Trip form data not available');
      return;
    }

    if (!progress.estimatedBudget || !progress.criteria) {
      setFormError('Trip planning not complete');
      return;
    }

    setIsConfirming(true);

    try {
      // Format data according to SaveTripData interface
      const saveTripData = {
        userId: progress.formInput.userId,
        title: `Trip to ${progress.formInput.arrivalCity}`,
        formInput: progress.formInput,
        orchestratorDecisions: {
          budget: progress.estimatedBudget,
          criteria: progress.criteria
        },
        flightResults: { data: progress.flightResults || [] },
        hotelResults: { data: progress.hotelResults || [] },
        activityResults: { data: progress.activityResults || [] },
        threadId: progress.threadId || `trip-${Date.now()}`
      };

      const response = await fetch('/api/trips/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveTripData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save trip');
      }

      const result = await response.json();

      // Redirect to trip details page
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(`/dashboard/trips/${result.tripId}` as any);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save trip');
      setIsConfirming(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create New Trip</h1>
          <p className="text-muted-foreground">
            Plan your next adventure with AI assistance
          </p>
        </div>
      </div>

      {/* Error Display */}
      {(error || formError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || formError}
          </AlertDescription>
        </Alert>
      )}

      {/* STATE 1: FORM (not planning, not complete) */}
      {!isPlanning && !allComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plane className="w-5 h-5 mr-2" />
              Trip Information
            </CardTitle>
            <CardDescription>
              Fill in the details to start planning your trip
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Number of Travelers */}
              <div className="space-y-2">
                <Label htmlFor="numPeople">Number of Travelers</Label>
                <Input
                  id="numPeople"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.numPeople}
                  onChange={(e) => {
                    const numPeople = parseInt(e.target.value);
                    handleInputChange('numPeople', numPeople);
                    // Auto-calculate numRooms (1 room per 2 people)
                    handleInputChange('numRooms', Math.ceil(numPeople / 2));
                  }}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Between 1 and 10 travelers
                </p>
              </div>

              {/* Number of Rooms */}
              <div className="space-y-2">
                <Label htmlFor="numRooms">Number of Rooms</Label>
                <Input
                  id="numRooms"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.numRooms}
                  onChange={(e) => handleInputChange('numRooms', parseInt(e.target.value))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Typically 1 room per 2 people
                </p>
              </div>

              {/* Budget Category */}
              <div className="space-y-2">
                <Label htmlFor="budgetCategory">Budget Level</Label>
                <select
                  id="budgetCategory"
                  value={formData.budgetCategory}
                  onChange={(e) => handleInputChange('budgetCategory', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="economy">💰 Economy - Budget-friendly travel</option>
                  <option value="standard">💰💰 Standard - Comfortable mid-range</option>
                  <option value="premium">💰💰💰 Premium - Luxury experience</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Determines flight class, hotel quality, and activity types
                </p>
              </div>

              {/* Departure City */}
              <div className="space-y-2">
                <Label htmlFor="departureCity">Departure City</Label>
                <Input
                  id="departureCity"
                  type="text"
                  placeholder="e.g., Paris, London, New York"
                  value={formData.departureCity}
                  onChange={(e) => {
                    handleInputChange('departureCity', e.target.value);
                    setDepartureCityResolved(null); // Clear previous resolution
                  }}
                  onBlur={(e) => resolveCity(e.target.value, 'departure')}
                  required
                />
                {cityResolving === 'departure' && (
                  <p className="text-xs text-blue-600">🔍 Resolving city...</p>
                )}
                {!cityResolving && departureCityResolved && (
                  <p className="text-xs text-green-600">
                    ✓ Found: {departureCityResolved.name}, {departureCityResolved.country} ({departureCityResolved.code})
                  </p>
                )}
                {!cityResolving && !departureCityResolved && formData.departureCity && (
                  <p className="text-xs text-muted-foreground">
                    Enter a city name or IATA code
                  </p>
                )}
              </div>

              {/* Destination City */}
              <div className="space-y-2">
                <Label htmlFor="arrivalCity">Destination City</Label>
                <Input
                  id="arrivalCity"
                  type="text"
                  placeholder="e.g., Paris, London, New York"
                  value={formData.arrivalCity}
                  onChange={(e) => {
                    handleInputChange('arrivalCity', e.target.value);
                    setArrivalCityResolved(null); // Clear previous resolution
                  }}
                  onBlur={(e) => resolveCity(e.target.value, 'arrival')}
                  required
                />
                {cityResolving === 'arrival' && (
                  <p className="text-xs text-blue-600">🔍 Resolving city...</p>
                )}
                {!cityResolving && arrivalCityResolved && (
                  <p className="text-xs text-green-600">
                    ✓ Found: {arrivalCityResolved.name}, {arrivalCityResolved.country} ({arrivalCityResolved.code})
                  </p>
                )}
                {!cityResolving && !arrivalCityResolved && formData.arrivalCity && (
                  <p className="text-xs text-muted-foreground">
                    Enter a city name or IATA code
                  </p>
                )}
              </div>

              {/* Departure Date */}
              <div className="space-y-2">
                <Label htmlFor="departureDate">Departure Date</Label>
                <Input
                  id="departureDate"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.departureDate}
                  onChange={(e) => handleInputChange('departureDate', e.target.value)}
                  required
                />
              </div>

              {/* Stay Duration */}
              <div className="space-y-2">
                <Label htmlFor="stayDuration">Stay Duration (days)</Label>
                <Input
                  id="stayDuration"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.stayDuration}
                  onChange={(e) => handleInputChange('stayDuration', parseInt(e.target.value))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Between 1 and 30 days
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" size="lg">
                <Plane className="w-4 h-4 mr-2" />
                Start Planning
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* STATE 2: PLANNING (in progress) */}
      {isPlanning && !allComplete && (
        <TripPlannerProgress progress={progress} />
      )}

      {/* STATE 3: RESULTS (complete) */}
      {allComplete && (
        <>
          <TripPlannerResults progress={progress} />

          {/* Action Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="text-center sm:text-left">
                  <p className="font-medium">Your trip has been saved as a draft</p>
                  <p className="text-sm text-muted-foreground">
                    Review the details above and confirm when ready
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={resetPlanning}
                    disabled={isConfirming}
                  >
                    Start Over
                  </Button>
                  <Button
                    onClick={handleConfirmTrip}
                    disabled={isConfirming}
                  >
                    {isConfirming ? 'Confirming...' : 'Confirm Trip'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
