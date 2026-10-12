import assert from "node:assert/strict";
import { test } from "node:test";
import { AmadeusClient } from "./client.js";

test("Hotel Ratings sends only a comma-separated hotelIds request", async () => {
  let request: unknown;
  const sdk = {
    ereputation: { hotelSentiments: { get: async (params: unknown) => {
      request = params;
      return { data: [{ hotelId: "XKPARC12", overallRating: 80 }] };
    } } },
  };
  const client = new AmadeusClient({ clientId: "synthetic-id", clientSecret: "synthetic-secret", hostname: "test" }, sdk as never);
  const result = await client.getHotelRatings({ hotelIds: ["XKPARC12"] });
  assert.deepEqual(request, { hotelIds: "XKPARC12" });
  assert.equal(result.success, true);
});

test("missing Hotel Ratings are reported as unavailable", async () => {
  const sdk = { ereputation: { hotelSentiments: { get: async () => ({ data: [] }) } } };
  const client = new AmadeusClient({ clientId: "synthetic-id", clientSecret: "synthetic-secret", hostname: "test" }, sdk as never);
  const result = await client.getHotelRatings({ hotelIds: ["XKPARC12"] });
  assert.deepEqual({ status: result.status, data: result.data }, { status: "unavailable", data: [] });
});
