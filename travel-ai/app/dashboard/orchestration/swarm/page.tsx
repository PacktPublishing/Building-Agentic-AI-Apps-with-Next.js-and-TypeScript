/**
 * Swarm Pattern Demo Page
 *
 * Demonstrates the decentralized multi-agent system where agents
 * dynamically hand off control to each other based on context.
 */

'use client';

import { OrchestrationChat } from '@/app/components/OrchestrationChat';

const swarmAgents = [
    { name: 'ResearchAgent', role: 'Primary contact, searches', color: 'bg-cyan-500' },
    { name: 'BookingAgent', role: 'Reservations & bookings', color: 'bg-emerald-500' },
    { name: 'PlanningAgent', role: 'Itinerary creation', color: 'bg-amber-500' },
];

export default function SwarmPage() {
    return (
        <OrchestrationChat
            pattern="swarm"
            title="Swarm Pattern"
            description="Decentralized orchestration with dynamic handoffs"
            agentInfo={swarmAgents}
        />
    );
}
