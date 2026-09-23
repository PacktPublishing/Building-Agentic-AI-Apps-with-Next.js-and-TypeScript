import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL_NON_POOLING!,
    ssl: {
      rejectUnauthorized: true,
      ...(process.env.POSTGRES_CA_CERT ? { ca: process.env.POSTGRES_CA_CERT.replace(/\\n/g, "\n") } : {})
    }
  },
});
