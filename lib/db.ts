import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing. Add the Replit PostgreSQL database to this project.");
}

declare global {
  // eslint-disable-next-line no-var
  var ticketingPool: Pool | undefined;
}

export const pool =
  globalThis.ticketingPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 12,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ...(process.env.NODE_ENV === "production"
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  });

if (process.env.NODE_ENV !== "production") globalThis.ticketingPool = pool;