
export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            MCP Amadeus Server
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            MCP (Model Context Protocol) server for Amadeus API - Flight search, hotels, airports and airline information
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="text-blue-600 dark:text-blue-400 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Flight Search
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Advanced flight search with filters: class, price, stopovers, flexible dates
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="text-green-600 dark:text-green-400 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Hotel Search
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Find the best hotels by city with dates and number of guests
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="text-purple-600 dark:text-purple-400 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Airport Search
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Search airports by name, city or IATA code worldwide
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="text-red-600 dark:text-red-400 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Price Analysis
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Price analysis and predictions to optimize your bookings
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="text-yellow-600 dark:text-yellow-400 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Airline Info
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Detailed information about airlines by IATA code
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Available MCP Tools
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                🛫 search_flights
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Search flights between two airports with advanced filters
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                📊 analyze_flight_prices
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Price analysis and predictions for a specific route
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                🏢 search_airports
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Search airports by name, city or IATA code
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                ✈️ get_airline_info
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Information about airlines by IATA codes
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                🏨 search_hotels
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Search hotels in a city with dates and guests
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                🏙️ search_cities
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Search for cities by name or IATA code
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                🎯 get_destination_experiences
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Get destination experiences and hotel sentiments for a geographic area
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                🎪 search_tours_activities
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Search for tours and activities near a specific location
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
              MCP Client Configuration
            </h3>
            <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-4 text-left overflow-x-auto">
              <pre className="text-green-400 text-sm font-mono whitespace-pre">
{`{
  "serverUrl": "your_base_url/api/mcp",
  "headers": {
    "Authorization": "Bearer YOUR_TOKEN_HERE"
  }
}`}
              </pre>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Replace <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">YOUR_TOKEN_HERE</code> with your generated Bearer token
              </p>
              <p className="text-blue-600 dark:text-blue-400 text-xs">
                Generate a token using: <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">node scripts/generate-token.js</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
