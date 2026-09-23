import { describe, expect, it } from 'vitest';
import { evaluateRun, type BenchmarkFixture } from './orchestration-benchmark-contract';

const fixture: BenchmarkFixture = { id: 'flights', first: 'Find flights', followUp: 'Compare', requiredTerms: ['Paris'], expectedSupervisorAgents: ['FlightAgent'], expectedSwarmAgent: 'ResearchAgent' };

describe('orchestration benchmark acceptance', () => {
  it('does not equate a nonthrowing invocation with success', () => {
    expect(evaluateRun('Supervisor', fixture, { response: 'No response generated', agentOutputs: { FlightAgent: 'report' } }).success).toBe(false);
    expect(evaluateRun('Supervisor', fixture, { response: 'Flights from Paris are available today.', agentOutputs: { HotelAgent: 'report' } }).routeValid).toBe(false);
    expect(evaluateRun('Supervisor', fixture, { response: 'Flights from Paris are available today.', agentOutputs: { FlightAgent: 'Error: unavailable' } }).success).toBe(false);
  });
  it('checks answer and active swarm agent separately', () => {
    expect(evaluateRun('Swarm', fixture, { response: 'Flights from Paris are available today.', activeAgent: 'ResearchAgent' }).success).toBe(true);
    expect(evaluateRun('Swarm', fixture, { response: 'Flights from Paris are available today.', activeAgent: 'BookingAgent' }).routeValid).toBe(false);
  });
});
