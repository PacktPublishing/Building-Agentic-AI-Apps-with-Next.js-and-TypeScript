'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FlightList } from '@/app/components/FlightList';
import { HotelList } from '@/app/components/HotelList';
import { ActivityList } from '@/app/components/ActivityList';
import { AlertCircle, Plane, Hotel, MapPin, DollarSign } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { TripPlannerProgress } from '@/app/hooks/useTripPlannerStream';

interface TripPlannerResultsProps {
    progress: TripPlannerProgress;
}

export function TripPlannerResults({ progress }: TripPlannerResultsProps) {
    const hasFlights = progress.flightResults && progress.flightResults.length > 0;
    const hasHotels = progress.hotelResults && progress.hotelResults.length > 0;
    const hasActivities = progress.activityResults && progress.activityResults.length > 0;
    const hasAnyResults = hasFlights || hasHotels || hasActivities;

    return (
        <div className="space-y-6">
            {/* Budget Summary Card */}
            {progress.estimatedBudget && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            Trip Budget Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Flights</p>
                                <p className="text-2xl font-bold">
                                    ${progress.estimatedBudget.flightBudgetPerPerson}
                                </p>
                                <p className="text-xs text-muted-foreground">per person</p>
                            </div>
                            <div className="text-center p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Hotels</p>
                                <p className="text-2xl font-bold">
                                    ${progress.estimatedBudget.hotelBudgetPerNight}
                                </p>
                                <p className="text-xs text-muted-foreground">per night</p>
                            </div>
                            <div className="text-center p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Activities</p>
                                <p className="text-2xl font-bold">
                                    ${progress.estimatedBudget.activityBudgetPerDay}
                                </p>
                                <p className="text-xs text-muted-foreground">per day</p>
                            </div>
                            <div className="text-center p-4 bg-primary/10 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Total</p>
                                <p className="text-3xl font-bold text-primary">
                                    ${progress.estimatedBudget.totalEstimated}
                                </p>
                                <p className="text-xs text-muted-foreground">estimated</p>
                            </div>
                        </div>

                        {/* Search Criteria */}
                        {progress.criteria && (
                            <div className="mt-6 pt-6 border-t">
                                <h4 className="text-sm font-semibold mb-3">Your Preferences</h4>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary">
                                        {progress.criteria.flightClass.replace('_', ' ')}
                                    </Badge>
                                    <Badge variant="secondary">
                                        {progress.criteria.hotelStars} star hotels
                                    </Badge>
                                    <Badge variant="secondary">
                                        {progress.criteria.maxStops === 0 ? 'Direct flights' : `Max ${progress.criteria.maxStops} stop(s)`}
                                    </Badge>
                                    {progress.criteria.activityTypes.map(type => (
                                        <Badge key={type} variant="outline">
                                            {type}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* No results message */}
            {!hasAnyResults && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        No results were found. This might be due to limited availability for your search criteria.
                        Please try different dates or destinations.
                    </AlertDescription>
                </Alert>
            )}

            {/* Flights Section */}
            {hasFlights && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plane className="w-5 h-5" />
                            Available Flights
                            <span className="text-sm font-normal text-muted-foreground ml-auto">
                                {progress.flightResults!.length} option{progress.flightResults!.length !== 1 ? 's' : ''}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <FlightList flights={progress.flightResults!} />
                    </CardContent>
                </Card>
            )}

            {/* Hotels Section */}
            {hasHotels && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Hotel className="w-5 h-5" />
                            Recommended Hotels
                            <span className="text-sm font-normal text-muted-foreground ml-auto">
                                {progress.hotelResults!.length} option{progress.hotelResults!.length !== 1 ? 's' : ''}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <HotelList hotels={progress.hotelResults!} />
                    </CardContent>
                </Card>
            )}

            {/* Activities Section */}
            {hasActivities && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5" />
                            Things to Do
                            <span className="text-sm font-normal text-muted-foreground ml-auto">
                                {progress.activityResults!.length} suggestion{progress.activityResults!.length !== 1 ? 's' : ''}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ActivityList activities={progress.activityResults!} />
                    </CardContent>
                </Card>
            )}

            {/* Partial Results Warning */}
            {hasAnyResults && (!hasFlights || !hasHotels || !hasActivities) && (
                <Alert variant="default">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Some searches returned no results. Your trip has been saved with the available options.
                        You can still confirm this trip or search again with different criteria.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}

/**
 * Simple badge component (if not already in your UI library)
 */
function Badge({
    children,
    variant = 'default'
}: {
    children: React.ReactNode;
    variant?: 'default' | 'secondary' | 'outline';
}) {
    const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors';

    const variantClasses = {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border border-input bg-background'
    };

    return (
        <span className={`${baseClasses} ${variantClasses[variant]}`}>
            {children}
        </span>
    );
}
