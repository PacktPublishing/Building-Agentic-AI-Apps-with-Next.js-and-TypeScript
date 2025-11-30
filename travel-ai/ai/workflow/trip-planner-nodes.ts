import {
    TripPlannerState,
    OrchestratorDecisions,
    BudgetBreakdown,
    SearchCriteria,
    BudgetCategory,
    calculateReturnDate,
    formatCityCode
} from './trip-planner-state';
import travelAssistantAgent from '../agents/agent';
import { db, trips } from '@/lib/db';

// ==================== NODE 1: ORCHESTRATOR ====================

/**
 * Analyzes the trip form and determines search criteria and budget
 * This is a synchronous node that runs first
 */
export async function orchestratorNode(state: TripPlannerState): Promise<Partial<TripPlannerState>> {
    console.log('🎯 Orchestrator: Analyzing trip request...');

    try {
        const { formInput } = state;

        if (!formInput) {
            return {
                errors: ['No form input provided'],
                nextStep: 'error'
            };
        }

        // Budget estimation logic based on user-selected category
        const budget = estimateBudget(
            formInput.budgetCategory,
            formInput.numPeople,
            formInput.stayDuration
        );

        // Determine search criteria based on budget category
        const criteria = determineSearchCriteria(
            formInput.budgetCategory,
            formInput.stayDuration
        );

        const decisions: OrchestratorDecisions = {
            budget,
            criteria,
            analysisComplete: true
        };

        console.log('✅ Orchestrator: Analysis complete', {
            totalBudget: budget.totalEstimated,
            flightClass: criteria.flightClass,
            hotelStars: criteria.hotelStars
        });

        return {
            orchestratorDecisions: decisions,
            nextStep: 'parallel_search'
        };

    } catch (error) {
        console.error('❌ Orchestrator error:', error);
        return {
            errors: [`Orchestrator error: ${error instanceof Error ? error.message : String(error)}`],
            nextStep: 'error'
        };
    }
}

/**
 * Estimate budget based on user-selected budget category
 */
function estimateBudget(
    budgetCategory: BudgetCategory,
    numPeople: number,
    stayDuration: number
): BudgetBreakdown {
    // Budget mapping based on category
    let flightBudgetPerPerson = 600; // default to standard
    let hotelBudgetPerNight = 150;
    let activityBudgetPerDay = 100;

    switch (budgetCategory) {
        case 'economy':
            flightBudgetPerPerson = 300;
            hotelBudgetPerNight = 80;
            activityBudgetPerDay = 50;
            break;
        case 'standard':
            flightBudgetPerPerson = 600;
            hotelBudgetPerNight = 150;
            activityBudgetPerDay = 100;
            break;
        case 'premium':
            flightBudgetPerPerson = 1200;
            hotelBudgetPerNight = 300;
            activityBudgetPerDay = 200;
            break;
    }

    const totalFlights = flightBudgetPerPerson * numPeople;
    const totalHotels = hotelBudgetPerNight * stayDuration;
    const totalActivities = activityBudgetPerDay * stayDuration;

    return {
        flightBudgetPerPerson,
        hotelBudgetPerNight,
        activityBudgetPerDay,
        totalEstimated: totalFlights + totalHotels + totalActivities
    };
}

/**
 * Determine search criteria based on budget category
 */
function determineSearchCriteria(
    budgetCategory: BudgetCategory,
    stayDuration: number
): SearchCriteria {
    // Map budget category to search criteria
    let flightClass: 'economy' | 'premium_economy' | 'business';
    let maxStops: number;
    let hotelStars: number;
    let activityTypes: string[];

    switch (budgetCategory) {
        case 'economy':
            flightClass = 'economy';
            maxStops = 1;
            hotelStars = 3;
            activityTypes = stayDuration > 5
                ? ['cultural', 'food', 'outdoor']
                : ['cultural', 'food'];
            break;
        case 'standard':
            flightClass = 'premium_economy';
            maxStops = 1;
            hotelStars = 4;
            activityTypes = stayDuration > 5
                ? ['cultural', 'outdoor', 'food', 'entertainment']
                : ['cultural', 'food', 'entertainment'];
            break;
        case 'premium':
            flightClass = 'business';
            maxStops = 0; // Direct flights only
            hotelStars = 5;
            activityTypes = stayDuration > 5
                ? ['cultural', 'outdoor', 'food', 'entertainment', 'luxury']
                : ['cultural', 'food', 'entertainment', 'luxury'];
            break;
        default:
            flightClass = 'economy';
            maxStops = 1;
            hotelStars = 3;
            activityTypes = ['cultural', 'food'];
    }

    return {
        flightClass,
        maxStops,
        hotelStars,
        activityTypes
    };
}

// ==================== NODE 2: FLIGHT SEARCH ====================

/**
 * Searches for flights using TravelAssistantAgent delegation
 */
export async function flightSearchNode(state: TripPlannerState): Promise<Partial<TripPlannerState>> {
    console.log('✈️  Flight Search: Starting...');

    try {
        const { formInput, orchestratorDecisions, threadId } = state;

        if (!formInput || !orchestratorDecisions) {
            throw new Error('Missing form input or orchestrator decisions');
        }

        // Update status to searching
        const searchingUpdate: Partial<TripPlannerState> = {
            flightResults: {
                ...state.flightResults,
                status: 'searching'
            }
        };

        // Build natural language query for TravelAssistantAgent
        const returnDate = calculateReturnDate(formInput.departureDate, formInput.stayDuration);
        const query = buildFlightQuery(
            formInput.departureCity,
            formInput.arrivalCity,
            formInput.departureDate,
            returnDate,
            formInput.numPeople,
            orchestratorDecisions.criteria.flightClass,
            orchestratorDecisions.criteria.maxStops
        );

        console.log('🔍 Flight query:', query);

        // Delegate to TravelAssistantAgent with streaming
        // Use unique thread ID for each search to avoid message history conflicts
        const flights = await searchWithAgent(query, `${threadId}-flights`, 'flights');

        console.log(`✅ Flight Search: Found ${flights.length} results`);

        return {
            flightResults: {
                searchType: 'flights',
                status: 'completed',
                data: flights,
                error: null
            }
        };

    } catch (error) {
        console.error('❌ Flight Search error:', error);
        return {
            flightResults: {
                searchType: 'flights',
                status: 'error',
                data: null,
                error: error instanceof Error ? error.message : String(error)
            },
            errors: [`Flight search failed: ${error instanceof Error ? error.message : String(error)}`]
        };
    }
}

function buildFlightQuery(
    departure: string,
    arrival: string,
    departureDate: string,
    returnDate: string,
    numAdults: number,
    flightClass: string,
    maxStops: number
): string {
    const classText = flightClass === 'economy' ? 'economy class' :
                     flightClass === 'premium_economy' ? 'premium economy' :
                     'business class';

    const stopsText = maxStops === 0 ? 'direct flights only (no stops)' :
                     `maximum ${maxStops} stop(s)`;

    return `Search for round-trip flights from ${formatCityCode(departure)} to ${formatCityCode(arrival)} for ${numAdults} adult(s). Departure on ${departureDate}, return on ${returnDate}. Prefer ${classText}, ${stopsText}. Show the best 3 options sorted by price and convenience.`;
}

// ==================== NODE 3: HOTEL SEARCH ====================

/**
 * Searches for hotels using TravelAssistantAgent delegation
 */
export async function hotelSearchNode(state: TripPlannerState): Promise<Partial<TripPlannerState>> {
    console.log('🏨 Hotel Search: Starting...');

    try {
        const { formInput, orchestratorDecisions, threadId } = state;

        if (!formInput || !orchestratorDecisions) {
            throw new Error('Missing form input or orchestrator decisions');
        }

        // Build natural language query
        const query = buildHotelQuery(
            formInput.arrivalCity,
            formInput.departureDate,
            formInput.stayDuration,
            formInput.numPeople,
            formInput.numRooms,
            orchestratorDecisions.criteria.hotelStars,
            orchestratorDecisions.budget.hotelBudgetPerNight
        );

        console.log('🔍 Hotel query:', query);

        // Delegate to TravelAssistantAgent
        // Use unique thread ID for each search to avoid message history conflicts
        const hotels = await searchWithAgent(query, `${threadId}-hotels`, 'hotels');

        console.log(`✅ Hotel Search: Found ${hotels.length} results`);

        return {
            hotelResults: {
                searchType: 'hotels',
                status: 'completed',
                data: hotels,
                error: null
            }
        };

    } catch (error) {
        console.error('❌ Hotel Search error:', error);
        return {
            hotelResults: {
                searchType: 'hotels',
                status: 'error',
                data: null,
                error: error instanceof Error ? error.message : String(error)
            },
            errors: [`Hotel search failed: ${error instanceof Error ? error.message : String(error)}`]
        };
    }
}

function buildHotelQuery(
    city: string,
    checkIn: string,
    nights: number,
    numGuests: number,
    numRooms: number,
    stars: number,
    budgetPerNight: number
): string {
    const checkOut = calculateReturnDate(checkIn, nights);

    return `Search for hotels in ${formatCityCode(city)}. Check-in ${checkIn}, check-out ${checkOut} (${nights} nights). ${numRooms} room(s) for ${numGuests} guest(s). Prefer ${stars}-star hotels with budget around $${budgetPerNight} per night. Show the best 4 options with good reviews and location.`;
}

// ==================== NODE 4: ACTIVITY SEARCH ====================

/**
 * Searches for activities using TravelAssistantAgent delegation
 */
export async function activitySearchNode(state: TripPlannerState): Promise<Partial<TripPlannerState>> {
    console.log('🎭 Activity Search: Starting...');

    try {
        const { formInput, orchestratorDecisions, threadId } = state;

        if (!formInput || !orchestratorDecisions) {
            throw new Error('Missing form input or orchestrator decisions');
        }

        // Build natural language query
        const query = buildActivityQuery(
            formInput.arrivalCity,
            formInput.stayDuration,
            orchestratorDecisions.criteria.activityTypes,
            orchestratorDecisions.budget.activityBudgetPerDay
        );

        console.log('🔍 Activity query:', query);

        // Delegate to TravelAssistantAgent
        // Use unique thread ID for each search to avoid message history conflicts
        const activities = await searchWithAgent(query, `${threadId}-activities`, 'activities');

        console.log(`✅ Activity Search: Found ${activities.length} results`);

        return {
            activityResults: {
                searchType: 'activities',
                status: 'completed',
                data: activities,
                error: null
            }
        };

    } catch (error) {
        console.error('❌ Activity Search error:', error);
        return {
            activityResults: {
                searchType: 'activities',
                status: 'error',
                data: null,
                error: error instanceof Error ? error.message : String(error)
            },
            errors: [`Activity search failed: ${error instanceof Error ? error.message : String(error)}`]
        };
    }
}

function buildActivityQuery(
    city: string,
    duration: number,
    activityTypes: string[],
    budgetPerDay: number
): string {
    const typesText = activityTypes.join(', ');

    return `Search for activities and things to do in ${formatCityCode(city)}. Trip duration: ${duration} days. Interested in: ${typesText}. Budget around $${budgetPerDay} per day. Show the best 6 diverse activities with mix of popular attractions and hidden gems.`;
}

// ==================== NODE 5: AUTO-SAVE DRAFT ====================

/**
 * Saves the trip as a draft in the database using Drizzle ORM
 * This node runs after all 3 searches complete (convergence point)
 */
export async function autoSaveDraftNode(state: TripPlannerState): Promise<Partial<TripPlannerState>> {
    console.log('💾 Auto-Save: Saving draft trip...');

    try {
        const { formInput, orchestratorDecisions, flightResults, hotelResults, activityResults, threadId } = state;

        if (!formInput || !orchestratorDecisions) {
            throw new Error('Missing required data for save');
        }

        const returnDate = calculateReturnDate(formInput.departureDate, formInput.stayDuration);

        console.log('📝 Inserting trip into database with Drizzle...');

        // Direct Drizzle insert - Type-safe, no LLM needed
        const [newTrip] = await db.insert(trips).values({
            userId: formInput.userId,
            title: `Trip to ${formInput.arrivalCity}`,
            destination: formInput.arrivalCity,
            startDate: formInput.departureDate,
            endDate: returnDate,
            budget: orchestratorDecisions.budget.totalEstimated.toString(),
            // Trip planner fields
            numPeople: formInput.numPeople,
            departureCity: formInput.departureCity,
            arrivalCity: formInput.arrivalCity,
            departureDate: formInput.departureDate,
            stayDuration: formInput.stayDuration,
            flights: flightResults.data || [],        // JSONB
            hotels: hotelResults.data || [],          // JSONB
            activities: activityResults.data || [],   // JSONB
            status: 'completed',
            threadId: threadId,
        }).returning();

        console.log(`✅ Auto-Save: Trip saved with ID: ${newTrip.id}`);

        return {
            tripId: newTrip.id,
            nextStep: 'complete'
        };

    } catch (error) {
        console.error('❌ Auto-Save error:', error);
        return {
            errors: [`Auto-save failed: ${error instanceof Error ? error.message : String(error)}`],
            tripId: null,
            nextStep: 'error'
        };
    }
}

// ==================== HELPER: AGENT DELEGATION ====================

/**
 * Generic function to search using TravelAssistantAgent and extract results
 * Consumes the stream and extracts relevant component data
 */
async function searchWithAgent(
    query: string,
    threadId: string,
    searchType: 'flights' | 'hotels' | 'activities'
): Promise<any[]> {
    const results: any[] = [];

    try {
        // Ensure agent is initialized before use
        await travelAssistantAgent.initialize();

        // Use streamStructured to get events
        const stream = await travelAssistantAgent.streamStructured(query, threadId);

        // Consume the stream and extract data from ui_component events
        for await (const event of stream) {
            if (event.type === 'ui_component') {
                // Extract data based on component type
                const componentName = event.data?.component;

                if (
                    (searchType === 'flights' && componentName === 'FlightList') ||
                    (searchType === 'hotels' && componentName === 'HotelList') ||
                    (searchType === 'activities' && componentName === 'ActivityList')
                ) {
                    const props = event.data?.props;
                    if (props) {
                        // Extract the array from props
                        const items = props.flights || props.hotels || props.activities || [];
                        results.push(...items);
                    }
                }
            }
        }

        // Limit results based on search type
        const maxResults = searchType === 'flights' ? 3 :
                          searchType === 'hotels' ? 4 :
                          6;  // activities

        return results.slice(0, maxResults);

    } catch (error) {
        console.error(`Error searching with agent (${searchType}):`, error);
        throw error;
    }
}
