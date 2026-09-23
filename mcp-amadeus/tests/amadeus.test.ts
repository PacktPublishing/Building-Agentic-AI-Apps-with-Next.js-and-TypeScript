import assert from "node:assert/strict";
import { test } from "node:test";
import { AmadeusClient, getAmadeusConfig } from "../lib/tools/amadeus";
import { HotelRatingsSchema } from '../lib/types/amadeus';

test('Hotel Ratings sends only hotel IDs and rejects geographic bounds', async () => {
  const calls: unknown[] = [];
  const sdk = { ereputation: { hotelSentiments: { get: async (params: unknown) => {
    calls.push(params);
    return { data: [], meta: {} };
  } } } };
  const client = new AmadeusClient({ clientId: 'synthetic-id', clientSecret: 'synthetic-secret', hostname: 'test' }, sdk as never);
  const input = HotelRatingsSchema.parse({ hotelIds: 'H1,H2' });
  const result = await client.getHotelRatings(input);
  assert.deepEqual(calls, [{ hotelIds: 'H1,H2' }]);
  assert.deepEqual(result.data, []);
  assert.throws(() => HotelRatingsSchema.parse({ hotelIds: '' }));
  assert.throws(() => HotelRatingsSchema.parse({ north: 1, south: 0, east: 1, west: 0 }));
});

test("Amadeus configuration rejects missing and blank credentials and unknown environments", () => {
  const previous = {
    id: process.env.AMADEUS_CLIENT_ID,
    secret: process.env.AMADEUS_CLIENT_SECRET,
    host: process.env.AMADEUS_HOSTNAME,
  };
  try {
    delete process.env.AMADEUS_CLIENT_ID;
    delete process.env.AMADEUS_CLIENT_SECRET;
    assert.throws(() => getAmadeusConfig());
    process.env.AMADEUS_CLIENT_ID = "  ";
    process.env.AMADEUS_CLIENT_SECRET = "synthetic-secret";
    assert.throws(() => getAmadeusConfig());
    process.env.AMADEUS_CLIENT_ID = "synthetic-id";
    process.env.AMADEUS_HOSTNAME = "prodution";
    assert.throws(() => getAmadeusConfig());
  } finally {
    if (previous.id === undefined) delete process.env.AMADEUS_CLIENT_ID;
    else process.env.AMADEUS_CLIENT_ID = previous.id;
    if (previous.secret === undefined) delete process.env.AMADEUS_CLIENT_SECRET;
    else process.env.AMADEUS_CLIENT_SECRET = previous.secret;
    if (previous.host === undefined) delete process.env.AMADEUS_HOSTNAME;
    else process.env.AMADEUS_HOSTNAME = previous.host;
  }
});

test("provider errors cannot leak synthetic credentials through logs or messages", async () => {
  const sdk = { shopping: { flightOffersSearch: { get: async () => {
    throw new Error("synthetic-secret-123456 provider rejection");
  } } } };
  const client = new AmadeusClient({ clientId: "synthetic-id", clientSecret: "synthetic-secret-123456", hostname: "test" }, sdk as never);
  const originalError = console.error;
  const logs: string[] = [];
  console.error = (...args) => { logs.push(JSON.stringify(args)); };
  try {
    await assert.rejects(client.searchFlights({
      origin: "CDG", destination: "LHR", departureDate: "2026-10-10", adults: 1,
      children: 0, infants: 0, travelClass: "ECONOMY", nonStop: false, currency: "EUR",
    }), (error: unknown) => {
      assert.doesNotMatch(String(error), /synthetic-secret-123456/);
      return true;
    });
    assert.doesNotMatch(logs.join("\n"), /synthetic-secret-123456|synt/);
  } finally {
    console.error = originalError;
  }
});

test("valid Amadeus settings do not log credentials or their prefixes", () => {
  const previous = {
    id: process.env.AMADEUS_CLIENT_ID,
    secret: process.env.AMADEUS_CLIENT_SECRET,
    host: process.env.AMADEUS_HOSTNAME,
  };
  const originalLog = console.log;
  const originalWarn = console.warn;
  const logs: string[] = [];
  console.log = (...args) => { logs.push(JSON.stringify(args)); };
  console.warn = (...args) => { logs.push(JSON.stringify(args)); };
  try {
    process.env.AMADEUS_CLIENT_ID = "synthetic-id-123456";
    process.env.AMADEUS_CLIENT_SECRET = "synthetic-secret-123456";
    process.env.AMADEUS_HOSTNAME = "test.api.amadeus.com";
    assert.equal(getAmadeusConfig().hostname, "test");
    assert.doesNotMatch(logs.join("\n"), /synthetic|synt/);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    if (previous.id === undefined) delete process.env.AMADEUS_CLIENT_ID;
    else process.env.AMADEUS_CLIENT_ID = previous.id;
    if (previous.secret === undefined) delete process.env.AMADEUS_CLIENT_SECRET;
    else process.env.AMADEUS_CLIENT_SECRET = previous.secret;
    if (previous.host === undefined) delete process.env.AMADEUS_HOSTNAME;
    else process.env.AMADEUS_HOSTNAME = previous.host;
  }
});
