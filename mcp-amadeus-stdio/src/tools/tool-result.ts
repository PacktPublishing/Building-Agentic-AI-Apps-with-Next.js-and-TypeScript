import { ZodError } from "zod";
import { AmadeusConfigurationError } from "../amadeus/client.js";

/** Keep provider diagnostics and potentially secret-bearing messages off the wire. */
export function toolFailure(error: unknown, operation: string) {
  const message = error instanceof AmadeusConfigurationError
    ? "Amadeus credentials are not configured"
    : error instanceof ZodError
      ? "Invalid tool input"
      : `${operation} is unavailable`;
  return {
    isError: true,
    content: [{ type: "text" as const, text: `Error: ${message}` }],
  };
}
