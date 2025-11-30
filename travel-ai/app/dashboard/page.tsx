"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/auth-provider"
import { Plane, MapPin, Calendar, Plus, ArrowRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"

interface Trip {
  id: string;
  title: string;
  destination: string;
  departureCity: string;
  arrivalCity: string;
  startDate: string;
  endDate: string;
  stayDuration: number;
  budget: string;
  status: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTrips() {
      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/trips?userId=${user.id}`)
        if (response.ok) {
          const data = await response.json()
          setTrips(data.trips || [])
        }
      } catch (error) {
        console.error('Error fetching trips:', error)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchTrips()
    }
  }, [user?.id, authLoading])

  // Calculate stats
  const totalTrips = trips.length
  const uniqueDestinations = new Set(trips.map(t => t.destination)).size
  const upcomingTrips = trips.filter(t => new Date(t.startDate) > new Date())
  const nextTrip = upcomingTrips.sort((a, b) => 
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  )[0]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Hello, {user?.user_metadata?.name || user?.email?.split('@')[0]}! 👋
          </h1>
          <p className="text-muted-foreground mt-2">
            Ready to plan your next adventure?
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/trips/new">
            <Plus className="w-4 h-4 mr-2" />
            New Trip
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planned Trips</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTrips}</div>
            <p className="text-xs text-muted-foreground">
              {totalTrips === 0 ? 'No trips yet' : `${upcomingTrips.length} upcoming`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Destinations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueDestinations}</div>
            <p className="text-xs text-muted-foreground">
              {uniqueDestinations === 0 ? 'Start your first adventure' : 'Unique places'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Trip</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {nextTrip ? (
              <>
                <div className="text-2xl font-bold">{nextTrip.arrivalCity}</div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(nextTrip.startDate)}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">
                  Plan your first trip
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Trips */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Trips</CardTitle>
            <CardDescription>
              Your latest planned adventures
            </CardDescription>
          </div>
          {trips.length > 0 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/trips">
                View all
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {trips.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Plane className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Welcome to Travel AI!</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start by creating your first trip and let our AI help you plan the perfect adventure.
              </p>
              <Button asChild>
                <Link href="/dashboard/trips/new">
                  Create my first trip
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {trips.slice(0, 3).map((trip) => (
                <Link
                  key={trip.id}
                  href={`/dashboard/trips/${trip.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Plane className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{trip.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {trip.departureCity} → {trip.arrivalCity} • {trip.stayDuration} days
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(trip.startDate)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        trip.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {trip.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
