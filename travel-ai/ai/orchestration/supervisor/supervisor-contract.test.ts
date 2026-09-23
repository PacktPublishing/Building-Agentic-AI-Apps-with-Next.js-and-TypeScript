import { describe, expect, it } from 'vitest';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import { extractSpecialistReport, parseSupervisorDecision } from './supervisor-contract';

describe('Supervisor routing contract', () => {
  it('rejects unknown and duplicate agents', () => {
    const base = { reasoning: 'Need help', taskForEachAgent: { FlightAgent: 'Find flights' } };
    expect(() => parseSupervisorDecision(JSON.stringify({ ...base, agents: ['UnknownAgent'] }))).toThrow();
    expect(() => parseSupervisorDecision(JSON.stringify({ ...base, agents: ['FlightAgent', 'FlightAgent'] }))).toThrow();
  });

  it('requires exactly one direct-response or delegation path', () => {
    expect(() => parseSupervisorDecision(JSON.stringify({ agents: [], reasoning: 'Direct' }))).toThrow();
    expect(() => parseSupervisorDecision(JSON.stringify({
      agents: ['FlightAgent'], taskForEachAgent: { FlightAgent: 'Find flights' },
      directResponse: 'Hello', reasoning: 'Both',
    }))).toThrow();
    expect(parseSupervisorDecision(JSON.stringify({
      agents: ['FlightAgent'], taskForEachAgent: { FlightAgent: 'Find flights' }, reasoning: 'Need flights',
    })).agents).toEqual(['FlightAgent']);
  });
});

describe('Specialist report contract', () => {
  it('only accepts a matching validated report tool result', () => {
    const valid = new ToolMessage({ name: 'report_flight_results', tool_call_id: 'r1', content: JSON.stringify({ type: 'flight_report', summary: 'One flight', totalOptions: 1 }) });
    expect(extractSpecialistReport('FlightAgent', [valid])).toContain('One flight');
    expect(() => extractSpecialistReport('FlightAgent', [new AIMessage('One flight')])).toThrow('Missing specialist report');
    expect(() => extractSpecialistReport('HotelAgent', [valid])).toThrow('Missing specialist report');
    const invalid = new ToolMessage({ name: 'report_flight_results', tool_call_id: 'r2', content: JSON.stringify({ type: 'flight_report', summary: '', totalOptions: -1 }) });
    expect(() => extractSpecialistReport('FlightAgent', [invalid])).toThrow('Invalid specialist report');
  });
});
