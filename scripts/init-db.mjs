import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured. Connect the Replit PostgreSQL database first.");
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pool = new Pool({ connectionString: databaseUrl });

try {
  const schema = await readFile(path.join(root, "db/schema.sql"), "utf8");
  const seed = await readFile(path.join(root, "db/seed.sql"), "utf8");
  await pool.query(schema);
  await pool.query(seed);
  console.log("Development database schema and sample events are ready.");
} finally {
  await pool.end();
}