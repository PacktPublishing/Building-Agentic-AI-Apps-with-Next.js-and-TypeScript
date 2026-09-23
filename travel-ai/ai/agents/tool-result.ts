import { z } from 'zod';

const successEnvelope = z.object({
  success: z.literal(true), data: z.array(z.record(z.unknown())),
  meta: z.object({ totalAvailable: z.number().int().nonnegative().optional() }).optional(),
});
const errorEnvelope = z.object({ success: z.literal(false), error: z.string().optional() });

export type NormalizedToolResult =
  | { kind: 'success'; data: Record<string, unknown>[]; meta?: { totalAvailable?: number } }
  | { kind: 'error' };

export function normalizeToolResult(message: { content: unknown; status?: string; additional_kwargs?: Record<string, unknown> }): NormalizedToolResult {
  if (message.status === 'error' || message.additional_kwargs?.isError === true) return { kind: 'error' };
  let raw: unknown = message.content;
  if (Array.isArray(raw)) {
    const text = raw.filter((block) => block && typeof block === 'object' && (block as any).type === 'text')
      .map((block) => (block as any).text);
    if (text.length !== 1 || typeof text[0] !== 'string') return { kind: 'error' };
    raw = text[0];
  }
  if (typeof raw === 'string') {
    if (raw.startsWith('Error:')) return { kind: 'error' };
    try { raw = JSON.parse(raw); } catch { return { kind: 'error' }; }
  }
  if (errorEnvelope.safeParse(raw).success) return { kind: 'error' };
  const parsed = successEnvelope.safeParse(raw);
  return parsed.success ? { kind: 'success', data: parsed.data.data, meta: parsed.data.meta } : { kind: 'error' };
}

const location = z.object({ iataCode: z.string().min(3), at: z.string().min(1) });
const segment = z.object({ departure: location, arrival: location, carrierCode: z.string().optional() });
const itinerary = z.object({ segments: z.array(segment).min(1), duration: z.string().optional() });
const price = z.object({ total: z.string().optional(), grandTotal: z.string().optional(), currency: z.string().min(1).optional() });
export const FlightOffer = z.object({ id: z.string().min(1), itineraries: z.array(itinerary).min(1), validatingAirlineCodes: z.array(z.string()).optional(), price: price.optional() });
export const HotelOffer = z.object({ id: z.string().optional(), hotel: z.object({ hotelId: z.string().optional(), name: z.string().optional(), cityCode: z.string().optional(), rating: z.string().optional(), address: z.object({ lines: z.array(z.string()).optional(), postalCode: z.string().optional() }).optional(), latitude: z.number().optional(), longitude: z.number().optional(), amenities: z.array(z.string()).optional() }), offers: z.array(z.object({ price: price.optional(), room: z.object({ description: z.object({ text: z.string().optional() }).optional() }).optional() })).optional() }).refine((offer) => !!(offer.hotel.hotelId || offer.id));
export const ActivityOffer = z.object({ id: z.string().min(1), name: z.string().min(1), type: z.string().optional(), bookingLink: z.string().url().optional(), pictures: z.array(z.string().url()).optional(), minimumDuration: z.string().optional(), geoCode: z.object({ latitude: z.number(), longitude: z.number() }).optional(), price: z.object({ amount: z.string().optional(), currencyCode: z.string().optional() }).optional() });

export function availablePrice(value?: { total?: string; grandTotal?: string; currency?: string }) {
  const text = value?.total ?? value?.grandTotal;
  const amount = text === undefined ? undefined : Number(text);
  return Number.isFinite(amount) && amount! >= 0 && value?.currency
    ? { amount: amount!, currency: value.currency }
    : undefined;
}
