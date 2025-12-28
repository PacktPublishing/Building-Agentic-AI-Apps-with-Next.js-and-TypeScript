/**
 * Supervisor Pattern Exports
 *
 * Hierarchical multi-agent architecture where a central supervisor
 * coordinates specialized agents for travel planning.
 */

export { createFlightAgent, type FlightAgent } from "./flight-agent";
export { createHotelAgent, type HotelAgent } from "./hotel-agent";
export { createActivityAgent, type ActivityAgent } from "./activity-agent";
export {
    createTravelSupervisor,
    getTravelSupervisor,
    invokeSupervisor,
    streamSupervisor,
    type TravelSupervisor,
} from "./travel-supervisor";
