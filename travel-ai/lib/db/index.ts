import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from "pg";
import * as schema from './schema';

// Disable SSL certificate validation for development
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL_NON_POOLING,
  ssl: false
});

export const db = drizzle(pool, { schema });