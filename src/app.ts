import express from "express";
import cors from "cors";
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

// Civic issue APIs
app.use("/api/issues", issueRoutes);
app.use("/api/ai", aiRoutes);

export default app;
