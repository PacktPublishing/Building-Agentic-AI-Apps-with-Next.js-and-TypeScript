'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Hotel, MapPin, Loader2 } from 'lucide-react';

export function ApiDemo() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);

  const testFlightSearch = async () => {
    setLoading('flights');
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setResults({
        type: 'flights',
        data: [
          { airline: 'Air France', price: '€299', route: 'CDG → BCN', duration: '1h 40m' },
          { airline: 'Vueling', price: '€189', route: 'CDG → BCN', duration: '1h 45m' },
          { airline: 'Iberia', price: '€245', route: 'CDG → BCN', duration: '1h 50m' }
        ]
      });
    } catch (error) {
      console.error('Flight search failed:', error);
    } finally {
      setLoading(null);
    }
  };

  const testHotelSearch = async () => {
    setLoading('hotels');
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setResults({
        type: 'hotels',
        data: [
          { name: 'Hotel Barcelona Center', price: '€120/night', rating: '4.5★', location: 'City Center' },
          { name: 'Boutique Hotel Sagrada', price: '€95/night', rating: '4.2★', location: 'Eixample' },
          { name: 'Luxury Resort Costa Brava', price: '€280/night', rating: '4.8★', location: 'Beachfront' }
        ]
      });
    } catch (error) {
      console.error('Hotel search failed:', error);
    } finally {
      setLoading(null);
    }
  };

  const testActivitySearch = async () => {
    setLoading('activities');
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setResults({
        type: 'activities',
        data: [
          { name: 'Sagrada Familia Tour', price: '€25', duration: '2 hours', rating: '4.7★' },
          { name: 'Park Güell Visit', price: '€15', duration: '1.5 hours', rating: '4.5★' },
          { name: 'Barcelona Food Tour', price: '€65', duration: '3 hours', rating: '4.9★' }
        ]
      });
    } catch (error) {
      console.error('Activity search failed:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          onClick={testFlightSearch}
          disabled={loading !== null}
          className="h-20 flex flex-col items-center justify-center space-y-2"
        >
          {loading === 'flights' ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Plane className="h-6 w-6" />
          )}
          <span>Test Flight Search</span>
        </Button>

        <Button
          onClick={testHotelSearch}
          disabled={loading !== null}
          variant="outline"
          className="h-20 flex flex-col items-center justify-center space-y-2"
        >
          {loading === 'hotels' ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Hotel className="h-6 w-6" />
          )}
          <span>Test Hotel Search</span>
        </Button>

        <Button
          onClick={testActivitySearch}
          disabled={loading !== null}
          variant="outline"
          className="h-20 flex flex-col items-center justify-center space-y-2"
        >
          {loading === 'activities' ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <MapPin className="h-6 w-6" />
          )}
          <span>Test Activities</span>
        </Button>
      </div>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="capitalize">{results.type} Results</CardTitle>
            <CardDescription>Sample data from API integration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.data.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">
                      {item.name || item.airline || 'Item'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {item.location || item.route || item.duration || 'Details'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600">{item.price}</div>
                    {item.rating && (
                      <div className="text-sm text-gray-600">{item.rating}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
