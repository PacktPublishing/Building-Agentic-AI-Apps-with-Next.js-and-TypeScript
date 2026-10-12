import { defineConfig } from "drizzle-kit";
import { verifiedPostgresConnection } from './lib/config/postgres-connection';

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Drizzle Kit's URL connection branch does not forward a sibling ssl option to pg.
    // Use explicit connection fields so certificate verification is actually applied.
    ...verifiedPostgresConnection(process.env.POSTGRES_URL_NON_POOLING, process.env.POSTGRES_CA_CERT),
  },
});
