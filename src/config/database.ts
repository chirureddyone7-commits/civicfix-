import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

const pool = new Pool(
    connectionString
        ? {
            connectionString,
            // Hosted PostgreSQL providers commonly require TLS.
            ssl: process.env.DB_SSL === "false"
                ? false
                : { rejectUnauthorized: false }
        }
        : {
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT) || 5432,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        }
);

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL error:", error);
});

export default pool;
