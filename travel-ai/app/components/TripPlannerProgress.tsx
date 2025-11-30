'use client';

import { CheckCircle2, Loader2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { TripPlannerProgress as ProgressType } from '@/app/hooks/useTripPlannerStream';

interface TripPlannerProgressProps {
    progress: ProgressType;
}

interface Step {
    id: string;
    label: string;
    isComplete: boolean;
    isActive: boolean;
}

export function TripPlannerProgress({ progress }: TripPlannerProgressProps) {
    // Define the 4 workflow steps (no auto-save - user saves manually)
    const steps: Step[] = [
        {
            id: 'orchestrator',
            label: 'Analyzing your trip',
            isComplete: progress.orchestratorComplete,
            isActive: !progress.orchestratorComplete
        },
        {
            id: 'flights',
            label: 'Searching flights',
            isComplete: progress.flightsComplete,
            isActive: progress.orchestratorComplete && !progress.flightsComplete
        },
        {
            id: 'hotels',
            label: 'Finding hotels',
            isComplete: progress.hotelsComplete,
            isActive: progress.orchestratorComplete && !progress.hotelsComplete
        },
        {
            id: 'activities',
            label: 'Discovering activities',
            isComplete: progress.activitiesComplete,
            isActive: progress.orchestratorComplete && !progress.activitiesComplete
        }
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Planning Your Trip</span>
                    <span className="text-sm font-normal text-muted-foreground">
                        {progress.percentComplete}%
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Progress bar */}
                <Progress value={progress.percentComplete} className="w-full" />

                {/* Current step text */}
                <p className="text-sm text-muted-foreground text-center">
                    {progress.currentStep}
                </p>

                {/* Step list */}
                <div className="space-y-4">
                    {steps.map((step) => (
                        <StepItem
                            key={step.id}
                            step={step}
                        />
                    ))}
                </div>

                {/* Budget estimate (shown after orchestrator completes) */}
                {progress.estimatedBudget && (
                    <div className="mt-6 pt-6 border-t">
                        <h4 className="text-sm font-semibold mb-3">Estimated Budget</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-muted-foreground">Flights per person</p>
                                <p className="font-medium">
                                    ${progress.estimatedBudget.flightBudgetPerPerson}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Hotel per night</p>
                                <p className="font-medium">
                                    ${progress.estimatedBudget.hotelBudgetPerNight}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Activities per day</p>
                                <p className="font-medium">
                                    ${progress.estimatedBudget.activityBudgetPerDay}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Total estimated</p>
                                <p className="font-semibold text-lg">
                                    ${progress.estimatedBudget.totalEstimated}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search criteria (shown after orchestrator completes) */}
                {progress.criteria && (
                    <div className="pt-4 border-t">
                        <h4 className="text-sm font-semibold mb-3">Search Criteria</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-muted-foreground">Flight class</p>
                                <p className="font-medium capitalize">
                                    {progress.criteria.flightClass.replace('_', ' ')}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Hotel rating</p>
                                <p className="font-medium">
                                    {progress.criteria.hotelStars} stars
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Max stops</p>
                                <p className="font-medium">
                                    {progress.criteria.maxStops === 0 ? 'Direct' : progress.criteria.maxStops}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Activities</p>
                                <p className="font-medium capitalize">
                                    {progress.criteria.activityTypes.slice(0, 2).join(', ')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Individual step item component
 */
function StepItem({ step }: { step: Step }) {
    return (
        <div className="flex items-center gap-3">
            {/* Icon */}
            <div className="flex-shrink-0">
                {step.isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : step.isActive ? (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                    <Circle className="w-5 h-5 text-gray-300" />
                )}
            </div>

            {/* Label */}
            <div className="flex-1">
                <p className={`text-sm font-medium ${
                    step.isComplete
                        ? 'text-green-600'
                        : step.isActive
                        ? 'text-blue-600'
                        : 'text-muted-foreground'
                }`}>
                    {step.label}
                </p>
            </div>
        </div>
    );
}
