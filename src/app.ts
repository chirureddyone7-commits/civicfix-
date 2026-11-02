import express from "express";
import cors from "cors";
import pool from "./config/database";
import aiRoutes from "./routes/ai.routes";
import issueRoutes from "./routes/issue.routes";

const app = express();

app.use(cors());
// Base64 image uploads need a larger JSON body limit than Express's default.
app.use(express.json({ limit: "8mb" }));

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
        const errorMessage = error instanceof Error
            ? error.message
            : String(error);

        console.error("Database health check failed:", errorMessage);

        // TEMPORARY DEBUGGING: remove the raw error from this response before public deployment.
        return res.status(503).json({
            status: "unhealthy",
            api: "running",
            database: "disconnected",
            message: errorMessage
        });
    }
});

app.use("/api/issues", issueRoutes);
app.use("/api/ai", aiRoutes);

export default app;
