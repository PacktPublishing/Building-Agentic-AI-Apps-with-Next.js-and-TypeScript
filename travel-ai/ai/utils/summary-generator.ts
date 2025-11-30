/**
 * Utility - Trip Summary Generator
 *
 * Generates a natural language summary of a trip for embedding
 */

import type { SavedTrip } from '@/lib/domain/trip/repository';

/**
 * Generate a comprehensive summary text for a trip
 * This text will be embedded for semantic search
 */
export function generateTripSummary(trip: SavedTrip): string {
  const {
    title,
    destination,
    departureCity,
    departureDate,
    stayDuration,
    numPeople,
    budget,
    flights,
    hotels,
    activities,
  } = trip;

  // Build summary parts
  const parts: string[] = [];

  // Basic trip info
  parts.push(
    `${stayDuration}-day trip to ${destination} from ${departureCity} for ${numPeople} ${
      numPeople === 1 ? 'person' : 'people'
    }.`
  );

  // Budget info
  parts.push(`Total budget: $${budget}.`);

  // Flights summary
  if (flights && flights.length > 0) {
    const flightSummary = flights
      .map((f: any) => {
        const airline = f.airline || f.carrier || 'Unknown airline';
        return `${airline} flight`;
      })
      .slice(0, 3)
      .join(', ');

    parts.push(`Includes ${flights.length} flight option(s): ${flightSummary}.`);
  }

  // Hotels summary
  if (hotels && hotels.length > 0) {
    const hotelSummary = hotels
      .map((h: any) => {
        const name = h.name || h.hotelName || 'hotel';
        const stars = h.stars || h.rating || '';
        return stars ? `${stars}-star ${name}` : name;
      })
      .slice(0, 2)
      .join(', ');

    parts.push(`${hotels.length} hotel option(s) including ${hotelSummary}.`);
  }

  // Activities summary
  if (activities && activities.length > 0) {
    const activitySummary = activities
      .map((a: any) => {
        const title = a.title || a.name || 'activity';
        const category = a.category || a.type || '';
        return category ? `${title} (${category})` : title;
      })
      .slice(0, 5)
      .join(', ');

    parts.push(`${activities.length} activities like ${activitySummary}.`);
  }

  return parts.join(' ');
}

/**
 * Example output:
 * "7-day trip to New York from Paris for 2 people. Total budget: $5000.
 *  Includes 3 flight options: Air France flight, Delta flight, United flight.
 *  2 hotel options including 4-star Marriott Times Square, 5-star Plaza Hotel.
 *  6 activities like Statue of Liberty Tour (sightseeing), Central Park Walk (outdoor),
 *  Broadway Show (cultural), Empire State Building (landmark), Brooklyn Bridge (sightseeing)."
 */
