import { z } from "zod"; 
import { AmadeusClient } from "./client"; // your thin SDK initializer 
 
export const FlightSearchSchema = z.object({ 
  origin: z.string().length(3), 
  destination: z.string().length(3), 
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), 
  adults: z.number().int().min(1).max(9).default(1) 
}); 
export type FlightSearchInput = z.infer<typeof FlightSearchSchema>; 
 
export async function searchFlights(input: FlightSearchInput) { 
  const params = FlightSearchSchema.parse(input); 
  const client = AmadeusClient.get(); // lazy, cached 
  try { 
    const res = await client.searchFlights({ 
      originLocationCode: params.origin, 
      destinationLocationCode: params.destination, 
      departureDate: params.departureDate, 
      adults: params.adults 
    }); 
    return { ok: true, data: res, meta: { provider: "amadeus" } as const }; 
  } catch (e: any) { 
    return { ok: false, error: `Flight search failed: ${e?.message ?? e}` }; 
  } 
}  