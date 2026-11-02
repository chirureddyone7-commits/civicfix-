import "dotenv/config";
import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.DB_HOST || "/var/run/postgresql",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "manojkr",
  database: process.env.DB_NAME || "civicfix_main",
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL error:", error.message);
});

export async function testDatabaseConnection() {
  const result = await pool.query(
    "SELECT current_user, current_database()"
  );

  console.log("Database connected successfully!");
  console.log(result.rows[0]);
}
