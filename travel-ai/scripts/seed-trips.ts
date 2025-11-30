/**
 * Seed Script - Generate synthetic trip data for RAG testing
 *
 * Directly creates synthetic trips and saves them to PostgreSQL + Qdrant
 * WITHOUT calling the LangGraph workflow (much faster!)
 *
 * Usage:
 *   pnpm tsx scripts/seed-trips.ts
 *
 * Options:
 *   --count=N     Number of trips to generate (default: 20)
 */

// Load environment variables from .env FIRST (before any other imports)
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Debug: verify env vars are loaded
console.log('🔧 ENV Check:');
console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`   QDRANT_URL: ${process.env.QDRANT_URL || '❌ Missing'}`);
console.log('');

// Only import Qdrant and OpenAI - skip PostgreSQL for seed script
// We only need to populate Qdrant for RAG testing
import { QdrantVectorRepository } from '../lib/infrastructure/qdrant/vector-repository';
import { OpenAIEmbeddingsService } from '../lib/infrastructure/embeddings/openai-service';
import { TripVectorPayload } from '../lib/domain/vector/repository';
import { SaveTripUseCase } from '@/lib/application/use-cases/save-trip.use-case';
import { DrizzleTripRepository } from '@/lib/infrastructure/db/trip-repository';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_COUNT = 20;
const SEED_USER_ID = 'seed-user-001';

// Parse CLI arguments
const args = process.argv.slice(2);
const countArg = args.find((a) => a.startsWith('--count='));

const TRIP_COUNT = countArg ? parseInt(countArg.split('=')[1], 10) : DEFAULT_COUNT;

// ============================================================================
// EUROPEAN DESTINATIONS (Amadeus-friendly)
// ============================================================================

interface Destination {
  code: string;
  name: string;
  themes: string[];
}

const EUROPEAN_DESTINATIONS: Destination[] = [
  // Western Europe
  { code: 'LIS', name: 'Lisbon', themes: ['beach', 'culture', 'food'] },
  { code: 'BCN', name: 'Barcelona', themes: ['beach', 'culture', 'nightlife'] },
  { code: 'MAD', name: 'Madrid', themes: ['culture', 'food', 'art'] },
  { code: 'CDG', name: 'Paris', themes: ['culture', 'romance', 'art'] },
  { code: 'FCO', name: 'Rome', themes: ['culture', 'history', 'food'] },
  { code: 'MXP', name: 'Milan', themes: ['fashion', 'culture', 'food'] },
  { code: 'VCE', name: 'Venice', themes: ['romance', 'culture', 'art'] },
  { code: 'FLR', name: 'Florence', themes: ['art', 'culture', 'food'] },
  { code: 'NAP', name: 'Naples', themes: ['food', 'history', 'beach'] },
  { code: 'AMS', name: 'Amsterdam', themes: ['culture', 'nightlife', 'art'] },
  { code: 'BRU', name: 'Brussels', themes: ['culture', 'food', 'history'] },
  { code: 'ZRH', name: 'Zurich', themes: ['nature', 'luxury', 'culture'] },
  { code: 'GVA', name: 'Geneva', themes: ['nature', 'luxury', 'culture'] },
  { code: 'VIE', name: 'Vienna', themes: ['culture', 'music', 'history'] },
  { code: 'MUC', name: 'Munich', themes: ['culture', 'beer', 'history'] },
  { code: 'FRA', name: 'Frankfurt', themes: ['business', 'culture', 'history'] },
  { code: 'BER', name: 'Berlin', themes: ['culture', 'nightlife', 'history'] },

  // Southern Europe
  { code: 'ATH', name: 'Athens', themes: ['history', 'culture', 'beach'] },
  { code: 'SKG', name: 'Thessaloniki', themes: ['culture', 'food', 'history'] },

  // Northern Europe
  { code: 'CPH', name: 'Copenhagen', themes: ['design', 'food', 'culture'] },
  { code: 'ARN', name: 'Stockholm', themes: ['design', 'nature', 'culture'] },
  { code: 'OSL', name: 'Oslo', themes: ['nature', 'culture', 'outdoor'] },
  { code: 'HEL', name: 'Helsinki', themes: ['design', 'nature', 'culture'] },

  // Eastern Europe
  { code: 'PRG', name: 'Prague', themes: ['culture', 'history', 'nightlife'] },
  { code: 'BUD', name: 'Budapest', themes: ['culture', 'spa', 'nightlife'] },
  { code: 'WAW', name: 'Warsaw', themes: ['history', 'culture', 'food'] },
  { code: 'KRK', name: 'Krakow', themes: ['history', 'culture', 'food'] },

  // UK & Ireland
  { code: 'LHR', name: 'London', themes: ['culture', 'history', 'nightlife'] },
  { code: 'EDI', name: 'Edinburgh', themes: ['culture', 'history', 'nature'] },
  { code: 'DUB', name: 'Dublin', themes: ['culture', 'nightlife', 'history'] },

  // Portugal & Spain extras
  { code: 'OPO', name: 'Porto', themes: ['wine', 'culture', 'food'] },
  { code: 'AGP', name: 'Malaga', themes: ['beach', 'culture', 'food'] },
  { code: 'SVQ', name: 'Seville', themes: ['culture', 'history', 'food'] },
  { code: 'PMI', name: 'Palma de Mallorca', themes: ['beach', 'luxury', 'nightlife'] },
];

const DEPARTURE_CITIES = ['CDG', 'LHR', 'FRA', 'AMS', 'MAD', 'FCO', 'MUC', 'ZRH'];

type BudgetCategory = 'economy' | 'standard' | 'premium';
const BUDGET_CATEGORIES: BudgetCategory[] = ['economy', 'standard', 'premium'];

// Fake airlines for synthetic data
const AIRLINES = ['Air France', 'Lufthansa', 'British Airways', 'KLM', 'Iberia', 'TAP Portugal', 'Swiss', 'Austrian'];
const HOTEL_CHAINS = ['Marriott', 'Hilton', 'Novotel', 'Ibis', 'Holiday Inn', 'Radisson', 'NH Hotels', 'Melia'];
const ACTIVITY_TYPES = ['cultural', 'outdoor', 'food', 'nightlife', 'beach', 'history', 'art', 'nature'];

// ============================================================================
// HELPERS
// ============================================================================

function generateFutureDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// SYNTHETIC DATA GENERATORS
// ============================================================================

function generateSyntheticFlights(departure: string, arrival: string, numPeople: number, budget: BudgetCategory) {
  const basePrice = budget === 'economy' ? 150 : budget === 'standard' ? 300 : 600;
  
  return Array.from({ length: randomInt(2, 4) }, () => ({
    id: generateUUID(),
    airline: randomElement(AIRLINES),
    departure: departure,
    arrival: arrival,
    departureTime: `${randomInt(6, 20)}:${randomInt(0, 5)}0`,
    arrivalTime: `${randomInt(8, 22)}:${randomInt(0, 5)}0`,
    duration: `${randomInt(1, 4)}h ${randomInt(0, 5)}0m`,
    price: basePrice + randomInt(-50, 100),
    stops: budget === 'economy' ? randomInt(0, 1) : 0,
    class: budget === 'premium' ? 'business' : 'economy',
  }));
}

function generateSyntheticHotels(destination: Destination, stayDuration: number, budget: BudgetCategory) {
  const basePrice = budget === 'economy' ? 80 : budget === 'standard' ? 150 : 300;
  const stars = budget === 'economy' ? 3 : budget === 'standard' ? 4 : 5;
  
  return Array.from({ length: randomInt(2, 4) }, () => ({
    id: generateUUID(),
    name: `${randomElement(HOTEL_CHAINS)} ${destination.name}`,
    location: destination.name,
    stars,
    pricePerNight: basePrice + randomInt(-20, 50),
    totalPrice: (basePrice + randomInt(-20, 50)) * stayDuration,
    amenities: ['WiFi', 'Breakfast', 'Pool', 'Gym'].slice(0, randomInt(2, 4)),
    rating: (3.5 + Math.random() * 1.5).toFixed(1),
  }));
}

function generateSyntheticActivities(destination: Destination) {
  const activities = destination.themes.flatMap((theme) => [
    {
      id: generateUUID(),
      name: `${theme.charAt(0).toUpperCase() + theme.slice(1)} Tour in ${destination.name}`,
      type: theme,
      duration: `${randomInt(2, 6)} hours`,
      price: randomInt(30, 150),
      rating: (4 + Math.random()).toFixed(1),
      description: `Discover the best ${theme} experiences in ${destination.name}`,
    },
  ]);
  
  return activities.slice(0, randomInt(3, 6));
}

function estimateBudget(budgetCategory: BudgetCategory, numPeople: number, stayDuration: number) {
  const budgetMap = {
    economy: { flight: 300, hotel: 80, activity: 50 },
    standard: { flight: 600, hotel: 150, activity: 100 },
    premium: { flight: 1200, hotel: 300, activity: 200 },
  };
  
  const b = budgetMap[budgetCategory];
  return {
    flightBudgetPerPerson: b.flight,
    hotelBudgetPerNight: b.hotel,
    activityBudgetPerDay: b.activity,
    totalEstimated: b.flight * numPeople + b.hotel * stayDuration + b.activity * stayDuration,
  };
}

function determineSearchCriteria(budgetCategory: BudgetCategory, themes: string[]) {
  return {
    flightClass: budgetCategory === 'premium' ? 'business' : 'economy' as const,
    maxStops: budgetCategory === 'economy' ? 1 : 0,
    hotelStars: budgetCategory === 'economy' ? 3 : budgetCategory === 'standard' ? 4 : 5,
    activityTypes: themes,
  };
}

// ============================================================================
// SUMMARY TEXT GENERATOR (same as SaveTripUseCase)
// ============================================================================

function generateSummaryText(
  destination: Destination,
  departureCode: string,
  departureDate: string,
  stayDuration: number,
  numPeople: number,
  budgetCategory: BudgetCategory,
  totalBudget: number,
  flights: any[],
  hotels: any[],
  activities: any[]
): string {
  const parts = [
    `${stayDuration}-day trip to ${destination.name}`,
    `from ${departureCode}`,
    `for ${numPeople} people`,
    `Total budget: $${totalBudget}`,
    `Budget category: ${budgetCategory}`,
  ];

  if (flights.length) {
    const airlines = flights.map((f) => f.airline).join(', ');
    parts.push(`Flight options: ${airlines}`);
  }

  if (hotels.length) {
    const hotelNames = hotels.map((h) => h.name).join(', ');
    parts.push(`Hotels: ${hotelNames}`);
  }

  if (activities.length) {
    const activityNames = activities.map((a) => a.name).join(', ');
    parts.push(`Activities: ${activityNames}`);
  }

  // Add themes for better semantic search
  parts.push(`Themes: ${destination.themes.join(', ')}`);

  return parts.join('. ') + '.';
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('🌱 Trip Seed Script (Qdrant Only)');
  console.log('==================================');
  console.log(`📊 Generating ${TRIP_COUNT} synthetic trips`);
  console.log(`👤 User ID: ${SEED_USER_ID}`);
  console.log('');

  // Initialize services (Qdrant + OpenAI only - no PostgreSQL)
  const vectorRepository = new QdrantVectorRepository();
  const embeddingsService = new OpenAIEmbeddingsService();

  const results = {
    success: 0,
    failed: 0,
    tripIds: [] as string[],
  };

  for (let i = 0; i < TRIP_COUNT; i++) {
    // Pick random destination (different from departure)
    const departureCode = randomElement(DEPARTURE_CITIES);
    let destination: Destination;
    do {
      destination = randomElement(EUROPEAN_DESTINATIONS);
    } while (destination.code === departureCode);

    const numPeople = randomInt(1, 4);
    const stayDuration = randomInt(3, 14);
    const budgetCategory = randomElement(BUDGET_CATEGORIES);
    const departureDate = generateFutureDate(randomInt(30, 180));
    const tripId = generateUUID();

    console.log(`\n[${i + 1}/${TRIP_COUNT}] 🛫 ${departureCode} → ${destination.code} (${destination.name})`);
    console.log(`   📅 ${departureDate} | ${stayDuration} days | ${numPeople} people | ${budgetCategory}`);
    console.log(`   🎯 Themes: ${destination.themes.join(', ')}`);

    try {
      // Generate synthetic data
      const flights = generateSyntheticFlights(departureCode, destination.code, numPeople, budgetCategory);
      const hotels = generateSyntheticHotels(destination, stayDuration, budgetCategory);
      const activities = generateSyntheticActivities(destination);
      const budget = estimateBudget(budgetCategory, numPeople, stayDuration);

      // Generate summary text for embedding
      const summaryText = generateSummaryText(
        destination,
        departureCode,
        departureDate,
        stayDuration,
        numPeople,
        budgetCategory,
        budget.totalEstimated,
        flights,
        hotels,
        activities
      );

      console.log('   🧠 Generating embedding...');
      const embedding = await embeddingsService.generate(summaryText);

      // Build payload for Qdrant
      const payload: TripVectorPayload = {
        trip_id: tripId,
        user_id: SEED_USER_ID,
        title: `Trip to ${destination.name}`,
        destination: destination.code,
        departure_city: departureCode,
        departure_date: departureDate,
        stay_duration: stayDuration,
        num_people: numPeople,
        budget_category: budgetCategory,
        total_budget: budget.totalEstimated,
        summary_text: summaryText,
        num_flights: flights.length,
        num_hotels: hotels.length,
        num_activities: activities.length,
        status: 'confirmed',
        created_at: new Date().toISOString(),
        thread_id: `seed-${tripId}`,
      };

      // Save directly to Qdrant
      console.log('   💾 Saving to Qdrant...');
      await vectorRepository.upsert(tripId, embedding, payload);
      console.log(`   ✅ Saved: ${tripId}`);

      results.success++;
      results.tripIds.push(tripId);

      // Small delay for embedding rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      console.log(`   ❌ Failed: ${error instanceof Error ? error.message : String(error)}`);
      results.failed++;
    }
  }

  // Summary
  console.log('\n==================================');
  console.log('📊 SUMMARY');
  console.log('==================================');
  console.log(`✅ Success: ${results.success}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📝 Total trips in Qdrant: ${results.success}`);
}

// Run
main().catch(console.error);
