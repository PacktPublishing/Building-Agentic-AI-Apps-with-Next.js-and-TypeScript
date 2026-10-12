export type BenchmarkPattern = 'Supervisor' | 'Swarm';
export type BenchmarkFixture = {
  id: string;
  first: string;
  followUp: string;
  requiredTerms: string[];
  expectedSupervisorAgents: string[];
  expectedSwarmAgent?: string;
};

export function evaluateRun(pattern: BenchmarkPattern, fixture: BenchmarkFixture, result: {
  response?: string;
  agentOutputs?: Record<string, string>;
  activeAgent?: string;
}) {
  const response = result.response?.trim() || '';
  const answerValid = response.length >= 20 && !/^(no response generated|i couldn't gather|i apologize)/i.test(response);
  const termsPresent = fixture.requiredTerms.every((term) => response.toLowerCase().includes(term.toLowerCase()));
  const actual = Object.keys(result.agentOutputs || {}).sort();
  const expected = [...fixture.expectedSupervisorAgents].sort();
  const routeValid = pattern === 'Supervisor'
    ? JSON.stringify(actual) === JSON.stringify(expected) && actual.every((agent) => !result.agentOutputs![agent].startsWith('Error:'))
    : !fixture.expectedSwarmAgent || result.activeAgent === fixture.expectedSwarmAgent;
  return { answerValid, termsPresent, routeValid, success: answerValid && termsPresent && routeValid };
}
