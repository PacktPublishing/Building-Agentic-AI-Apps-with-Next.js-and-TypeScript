import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApiDemo } from '@/components/dashboard/api-demo';
import { Plane, Hotel, MapPin, TrendingUp, Calendar, Users } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Travel Dashboard</h1>
        <p className="text-gray-600 mt-2">Plan your next adventure with AI-powered insights</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Trips</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">+1 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Destinations Visited</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 this year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Money Saved</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€1,234</div>
            <p className="text-xs text-muted-foreground">+15% from AI recommendations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Travel Companions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Friends & family</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <Plane className="h-8 w-8 text-blue-600 mb-2" />
            <CardTitle>Search Flights</CardTitle>
            <CardDescription>Find the best flight deals with AI-powered recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">Search Flights</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <Hotel className="h-8 w-8 text-green-600 mb-2" />
            <CardTitle>Find Hotels</CardTitle>
            <CardDescription>Discover perfect accommodations for your stay</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">Find Hotels</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <MapPin className="h-8 w-8 text-purple-600 mb-2" />
            <CardTitle>Plan Activities</CardTitle>
            <CardDescription>Get personalized activity recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">Plan Activities</Button>
          </CardContent>
        </Card>
      </div>

      {/* API Demo Section */}
      <Card>
        <CardHeader>
          <CardTitle>API Integration Demo</CardTitle>
          <CardDescription>Test the Amadeus MCP integration</CardDescription>
        </CardHeader>
        <CardContent>
          <ApiDemo />
        </CardContent>
      </Card>
    </div>
  );
}
