import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';

const trips = [
  {
    id: 1,
    destination: 'Barcelona, Spain',
    dates: 'Nov 15-22, 2025',
    status: 'Upcoming',
    travelers: 2,
    image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&h=200&fit=crop',
  },
  {
    id: 2,
    destination: 'Paris, France',
    dates: 'Dec 20-27, 2025',
    status: 'Planning',
    travelers: 4,
    image: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400&h=200&fit=crop',
  },
  {
    id: 3,
    destination: 'Tokyo, Japan',
    dates: 'Mar 10-20, 2026',
    status: 'Wishlist',
    travelers: 2,
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=200&fit=crop',
  },
];

export default function TripsPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Trips</h1>
          <p className="text-gray-600 mt-2">Manage your travel plans and itineraries</p>
        </div>
        <Button>Plan New Trip</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trips.map((trip) => (
          <Card key={trip.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="h-48 bg-gray-200 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="text-xl font-bold">{trip.destination}</h3>
                <p className="text-sm opacity-90">{trip.dates}</p>
              </div>
              <div className="absolute top-4 right-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  trip.status === 'Upcoming' ? 'bg-green-100 text-green-800' :
                  trip.status === 'Planning' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {trip.status}
                </span>
              </div>
            </div>
            
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-1" />
                  {trip.travelers} travelers
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-1" />
                  8 days
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" className="flex-1">View Details</Button>
                <Button size="sm" variant="outline">Edit</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-gray-500">+2 this year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Countries Visited</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-gray-500">Across 3 continents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-gray-500">Days traveling</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Next Trip</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <p className="text-xs text-gray-500">Days until Barcelona</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
