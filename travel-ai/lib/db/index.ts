import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Utilise l'URL pooling pour l'application (meilleure performance)
const connectionString = process.env.POSTGRES_URL!;

// Configuration pour Supabase
const client = postgres(connectionString, { 
  prepare: false,
  ssl: 'require'
});

export const db = drizzle(client, { schema });

export * from './schema';
