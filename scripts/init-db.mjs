import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (process.env.NODE_ENV === "production") {
  throw new Error("db:init is for development only and must not run in production.");
}
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
  const passwordHash = await bcrypt.hash("Admin@123", 12);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, date_of_birth)
     VALUES ('Seatline Demo Admin', 'admin@demo.com', $1, 'Admin', DATE '1990-01-01')
     ON CONFLICT (email) DO UPDATE
       SET name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           date_of_birth = EXCLUDED.date_of_birth`,
    [passwordHash],
  );
  console.log("Development database schema, sample events, and demo admin are ready.");
} finally {
  await pool.end();
}