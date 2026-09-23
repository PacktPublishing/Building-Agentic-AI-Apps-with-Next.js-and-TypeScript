/** Only these audited read-only tools may run without a pre-tool approval interrupt. */
const READ_ONLY_TOOLS = new Set([
  'get_current_date', 'search_trips', 'find_similar_trips',
  'search_flights', 'analyze_flight_prices', 'search_airports', 'get_airline_info',
  'search_hotels', 'search_cities', 'get_destination_experiences', 'search_tours_activities',
]);

export function assertReadOnlyTools(tools: Array<{ name: string }>): void {
  for (const tool of tools) {
    if (!READ_ONLY_TOOLS.has(tool.name)) {
      throw new Error('An unreviewed tool cannot run without an approval workflow');
    }
  }
}
