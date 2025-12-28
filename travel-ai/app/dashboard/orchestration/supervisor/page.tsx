/**
 * Supervisor Pattern Demo Page
 *
 * Demonstrates the hierarchical multi-agent system where a central
 * supervisor coordinates specialized agents for travel planning.
 */

'use client';

import { OrchestrationChat } from '@/app/components/OrchestrationChat';

const supervisorAgents = [
    { name: 'Supervisor', role: 'Coordinates all agents', color: 'bg-purple-500' },
    { name: 'FlightAgent', role: 'Flight searches', color: 'bg-blue-500' },
    { name: 'HotelAgent', role: 'Hotel searches', color: 'bg-green-500' },
    { name: 'ActivityAgent', role: 'Tours & activities', color: 'bg-orange-500' },
];

export default function SupervisorPage() {
    return (
        <OrchestrationChat
            pattern="supervisor"
            title="Supervisor Pattern"
            description="Hierarchical orchestration with central coordination"
            agentInfo={supervisorAgents}
        />
    );
}
