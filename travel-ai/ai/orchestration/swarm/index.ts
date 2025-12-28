/**
 * Swarm Pattern Exports
 *
 * Decentralized multi-agent architecture where agents can
 * dynamically hand off control to each other.
 */

export { createResearchAgent, type ResearchAgent } from "./research-agent";
export { createBookingAgent, type BookingAgent } from "./booking-agent";
export { createPlanningAgent, type PlanningAgent } from "./planning-agent";
export {
    createTravelSwarm,
    getTravelSwarm,
    resetTravelSwarm,
    invokeSwarm,
    streamSwarm,
    getSwarmState,
    continueSwarm,
    type TravelSwarm,
} from "./travel-swarm";
