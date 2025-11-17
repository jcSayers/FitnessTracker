import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

// Create PostgreSQL connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Please configure your Supabase connection string."
  );
}

// Create the postgres client
const client = postgres(connectionString, {
  prepare: false, // Disable prepared statements for Supabase pooling compatibility
});

// Initialize Drizzle ORM with the schema
export const db = drizzle(client, { schema });

export type Database = typeof db;

// Export for use in other modules
export default db;
