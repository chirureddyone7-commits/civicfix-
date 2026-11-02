import express from "express";
import cors from "cors";
import pool from "./config/database";
import aiRoutes from "./routes/ai.routes";
import issueRoutes from "./routes/issue.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
    res.json({
        message: "Welcome to CivicFix API",
        status: "Running"
    });
});

// Checks both the API server and PostgreSQL connection.
app.get("/api/health", async (_req, res) => {
    try {
        await pool.query("SELECT 1");
        return res.status(200).json({
            status: "healthy",
            api: "running",
            database: "connected"
        });
    } catch (error) {
        console.error("Database health check failed:", error);
        return res.status(503).json({
            status: "unhealthy",
            api: "running",
            database: "disconnected",
            message: "Check PostgreSQL is running and the DB_* values in .env are correct."
        });
    }
});

// Civic issue APIs
app.use("/api/issues", issueRoutes);
app.use("/api/ai", aiRoutes);

export default app;
