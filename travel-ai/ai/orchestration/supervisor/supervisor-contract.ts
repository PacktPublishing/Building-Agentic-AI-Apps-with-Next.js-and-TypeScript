import { z } from 'zod';
import { BaseMessage } from '@langchain/core/messages';

export const AgentName = z.enum(['FlightAgent', 'HotelAgent', 'ActivityAgent']);
export type AgentName = z.infer<typeof AgentName>;

const base = {
  reasoning: z.string().trim().min(1),
  agents: z.array(AgentName).max(3),
};

const direct = z.object({
  ...base,
  agents: z.array(AgentName).length(0),
  directResponse: z.string().trim().min(1),
  taskForEachAgent: z.record(z.never()).optional(),
}).strict();

const delegation = z.object({
  ...base,
  agents: z.array(AgentName).min(1).max(3),
  taskForEachAgent: z.record(z.string().trim().min(1)),
  directResponse: z.never().optional(),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.agents).size !== value.agents.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate agent' });
  }
  const assigned = Object.keys(value.taskForEachAgent).sort();
  const selected = [...value.agents].sort();
  if (JSON.stringify(assigned) !== JSON.stringify(selected)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Tasks must match selected agents' });
  }
});

const decisionSchema = z.union([direct, delegation]);
export type SupervisorDecision = z.infer<typeof decisionSchema>;

export function parseSupervisorDecision(content: string): SupervisorDecision {
  const match = content.match(/^\s*```(?:json)?\s*([\s\S]*?)```\s*$/);
  try {
    return decisionSchema.parse(JSON.parse((match?.[1] ?? content).trim()));
  } catch {
    throw new Error('Invalid supervisor routing decision');
  }
}

const priceRange = z.object({ min: z.number().nonnegative(), max: z.number().nonnegative(), currency: z.string().min(1) }).refine(
  ({ min, max }) => min <= max,
);
const commonReport = { summary: z.string().trim().min(1), bestOption: z.string().trim().min(1).optional(), totalOptions: z.number().int().nonnegative() };
const reports = {
  FlightAgent: z.object({ type: z.literal('flight_report'), ...commonReport, priceRange: priceRange.optional() }),
  HotelAgent: z.object({ type: z.literal('hotel_report'), ...commonReport, priceRange: priceRange.optional(), starRatings: z.array(z.number().min(0).max(5)).optional() }),
  ActivityAgent: z.object({ type: z.literal('activity_report'), ...commonReport, priceRange: priceRange.optional(), categories: z.array(z.string().min(1)).optional() }),
};

export function extractSpecialistReport(agent: AgentName, messages: BaseMessage[]): string {
  const expectedTool = {
    FlightAgent: 'report_flight_results', HotelAgent: 'report_hotel_results', ActivityAgent: 'report_activity_results',
  }[agent];
  const report = [...messages].reverse().find((message) => message._getType() === 'tool' && message.name === expectedTool);
  if (!report || typeof report.content !== 'string') throw new Error('Missing specialist report');
  try {
    return JSON.stringify(reports[agent].parse(JSON.parse(report.content)));
  } catch {
    throw new Error('Invalid specialist report');
  }
}
