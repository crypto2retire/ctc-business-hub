import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL not set, skipping migrations");
    return;
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
  const db = drizzle(pool);
  try {
    await migrate(db, { migrationsFolder: "./migrations" });
    console.log("Database migrations completed");
  } catch (err) {
    console.error("Migration error:", err);
    // Don't crash — Railway might not have migrations folder on first push
    // Use db:push instead
  } finally {
    await pool.end();
  }
}
