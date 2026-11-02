import { Router, Request, Response } from "express";
import { z } from "zod";
import pool from "../config/database";
import { analyzeIssue } from "../services/ai.service";

const router = Router();

const issueSchema = z.object({
    title: z.string().min(3).max(150),
    description: z.string().min(5),
    category: z.enum([
        "ROADS",
        "WATER",
        "GARBAGE",
        "STREETLIGHT",
        "DRAINAGE",
        "OTHER"
    ]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    location: z.string().min(2).max(255),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    reporter_name: z.string().max(100).optional()
}).refine(
    data => (data.latitude == null) === (data.longitude == null),
    { message: "Latitude and longitude must be provided together.", path: ["latitude"] }
);

const statusSchema = z.object({
    status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]),
    note: z.string().optional()
});

// POST /api/issues
// AI classifies the complaint when category/priority are not supplied.
router.post("/", async (req: Request, res: Response) => {
    try {
        const result = issueSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: "Invalid issue details",
                errors: result.error.flatten()
            });
        }

        const {
            title,
            description,
            category,
            priority,
            location,
            latitude,
            longitude,
            reporter_name
        } = result.data;

        let aiAnalysis: {
            category: "ROADS" | "WATER" | "GARBAGE" | "STREETLIGHT" | "DRAINAGE" | "OTHER";
            priority: "LOW" | "MEDIUM" | "HIGH";
            reason: string;
        } | null = null;

        try {
            aiAnalysis = await analyzeIssue(`Title: ${title}\nDescription: ${description}`);
        } catch (aiError) {
            // Complaint submission must still work if the AI provider is unavailable.
            console.warn("AI classification unavailable; using supplied/default values.", aiError);
        }

        const finalCategory = category || aiAnalysis?.category || "OTHER";
        const finalPriority = priority || aiAnalysis?.priority || "MEDIUM";

        const query = `
      INSERT INTO issues
      (title, description, category, priority, location, reporter_name, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

        const values = [
            title,
            description,
            finalCategory,
            finalPriority,
            location,
            reporter_name || null,
            latitude ?? null,
            longitude ?? null
        ];

        const dbResult = await pool.query(query, values);
        const issue = dbResult.rows[0];

        await pool.query(
            `INSERT INTO issue_status_history
       (issue_id, old_status, new_status, note)
       VALUES ($1, NULL, $2, $3)`,
            [issue.id, issue.status, "Issue submitted"]
        );

        return res.status(201).json({
            message: "Issue submitted successfully",
            issue,
            ai_analysis: aiAnalysis
                ? {
                    used: true,
                    category: aiAnalysis.category,
                    priority: aiAnalysis.priority,
                    reason: aiAnalysis.reason
                }
                : {
                    used: false,
                    reason: "AI unavailable; supplied/default classification was used."
                }
        });
    } catch (error) {
        console.error("Create issue error:", error);

        return res.status(500).json({
            message: "Failed to submit issue"
        });
    }
});

// GET /api/issues
// Retrieve all complaints
router.get("/", async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            "SELECT * FROM issues ORDER BY created_at DESC"
        );

        return res.status(200).json({
            count: result.rows.length,
            issues: result.rows
        });
    } catch (error) {
        console.error("Get issues error:", error);

        return res.status(500).json({
            message: "Failed to retrieve issues"
        });
    }
});

// GET /api/issues/hotspots
// Find repeated unresolved complaint locations using the location text.
router.get("/hotspots", async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT
                CASE
                    WHEN latitude IS NOT NULL AND longitude IS NOT NULL
                    THEN 'gps:' || ROUND(latitude::numeric, 3)::text || ':' || ROUND(longitude::numeric, 3)::text
                    ELSE 'text:' || LOWER(TRIM(location))
                END AS location_key,
                MIN(location) AS location,
                COUNT(*)::int AS report_count,
                COUNT(*) FILTER (WHERE priority = 'HIGH')::int AS high_priority_count,
                COUNT(*) FILTER (WHERE priority = 'MEDIUM')::int AS medium_priority_count,
                COUNT(*) FILTER (WHERE priority = 'LOW')::int AS low_priority_count,
                AVG(latitude)::double precision AS latitude,
                AVG(longitude)::double precision AS longitude,
                ARRAY_AGG(DISTINCT category ORDER BY category) AS categories
             FROM issues
             WHERE status <> 'RESOLVED'
             GROUP BY location_key
             HAVING COUNT(*) >= 2
             ORDER BY COUNT(*) DESC, high_priority_count DESC
             LIMIT 20`
        );

        return res.status(200).json({
            count: result.rows.length,
            hotspots: result.rows
        });
    } catch (error) {
        console.error("Hotspot detection failed:", error);
        return res.status(500).json({
            message: "Could not retrieve complaint hotspots."
        });
    }
});

// GET /api/issues/:id
// Retrieve one complaint
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid issue ID"
            });
        }

        const result = await pool.query(
            "SELECT * FROM issues WHERE id = $1",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Issue not found"
            });
        }

        return res.status(200).json({
            issue: result.rows[0]
        });
    } catch (error) {
        console.error("Get issue error:", error);

        return res.status(500).json({
            message: "Failed to retrieve issue"
        });
    }
});

// PATCH /api/issues/:id/status
// Update complaint status and record its history
router.patch("/:id/status", async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const validation = statusSchema.safeParse(req.body);

    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
            message: "Invalid issue ID"
        });
    }

    if (!validation.success) {
        return res.status(400).json({
            message: "Invalid status",
            errors: validation.error.flatten()
        });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const existing = await client.query(
            "SELECT * FROM issues WHERE id = $1 FOR UPDATE",
            [id]
        );

        if (existing.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Issue not found"
            });
        }

        const oldStatus = existing.rows[0].status;
        const { status, note } = validation.data;

        const updated = await client.query(
            `UPDATE issues
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
            [status, id]
        );

        await client.query(
            `INSERT INTO issue_status_history
       (issue_id, old_status, new_status, note)
       VALUES ($1, $2, $3, $4)`,
            [id, oldStatus, status, note || null]
        );

        await client.query("COMMIT");

        return res.status(200).json({
            message: "Issue status updated successfully",
            issue: updated.rows[0]
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Update status error:", error);

        return res.status(500).json({
            message: "Failed to update issue status"
        });
    } finally {
        client.release();
    }
});

export default router;
