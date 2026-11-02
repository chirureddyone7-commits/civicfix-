import { Router, Request, Response } from "express";
import { z } from "zod";
import { analyzeIssue, analyzeIssueImage, analyzeCombinedReport, findDuplicateIssues } from "../services/ai.service";
import pool from "../config/database";

const router = Router();

const analyzeSchema = z.object({
    description: z.string().min(5).max(5000)
});

const imageAnalyzeSchema = z.object({
    image: z.string().max(7_000_000),
    description: z.string().max(2000).optional()
});


const duplicateSchema = z.object({
    title: z.string().min(3).max(150),
    description: z.string().min(5).max(5000),
    location: z.string().min(2).max(255),
    category: z.enum(["ROADS", "WATER", "GARBAGE", "STREETLIGHT", "DRAINAGE", "OTHER"])
});

// POST /api/ai/check-duplicates
router.post("/check-duplicates", async (req: Request, res: Response) => {
    const validation = duplicateSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ message: "Provide title, description, location and category." });
    }

    try {
        const { title, description, location, category } = validation.data;
        const candidates = await pool.query(
            `SELECT id, title, description, location, category
             FROM issues
             WHERE status <> 'RESOLVED'
             ORDER BY created_at DESC
             LIMIT 50`
        );

        const result = await findDuplicateIssues(
            { title, description, location, category },
            candidates.rows.map((row: any) => ({
                id: Number(row.id),
                title: row.title,
                description: row.description,
                location: row.location,
                category: row.category
            }))
        );

        return res.status(200).json({
            message: result.matches.length
                ? "Potential similar complaints found."
                : "No likely duplicates found.",
            ...result
        });
    } catch (error) {
        console.error("Duplicate analysis failed:", error);
        return res.status(503).json({ message: "AI duplicate detection is currently unavailable." });
    }
});

router.post("/analyze", async (req: Request, res: Response) => {
    const validation = analyzeSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({
            message: "Please provide a valid complaint description"
        });
    }

    try {
        const result = await analyzeIssue(validation.data.description);
        return res.status(200).json({
            message: "Complaint analyzed successfully",
            suggestion: result
        });
    } catch (error) {
        console.error("AI analysis failed:", error);
        return res.status(503).json({
            message: "AI text analysis is currently unavailable."
        });
    }
});


const combinedAnalyzeSchema = z.object({
    image: z.string().max(7_000_000),
    title: z.string().min(3).max(150),
    description: z.string().min(5).max(2000)
});

// POST /api/ai/analyze-report: verify the photo against the citizen's written report.
router.post("/analyze-report", async (req: Request, res: Response) => {
    const validation = combinedAnalyzeSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ message: "Provide a valid image, title and description." });
    }
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(validation.data.image)) {
        return res.status(400).json({ message: "Only JPEG, PNG and WebP images are supported." });
    }
    try {
        const suggestion = await analyzeCombinedReport(
            validation.data.image,
            validation.data.title,
            validation.data.description
        );
        if (!suggestion.is_civic_issue) {
            return res.status(422).json({
                rejected: true,
                message: "The uploaded photo does not clearly show a civic issue. Please upload a relevant photo."
            });
        }
        if (!suggestion.text_matches_image) {
            return res.status(422).json({
                mismatch: true,
                suggestion,
                message: suggestion.mismatch_reason || "The photo does not appear to match the complaint description. Please correct the details or upload the right photo."
            });
        }
        return res.status(200).json({
            message: "Photo and complaint description verified together.",
            suggestion
        });
    } catch (error) {
        console.error("Combined AI report verification failed:", error);
        return res.status(503).json({ message: "AI report verification is currently unavailable." });
    }
});

// POST /api/ai/analyze-image
// Accepts a base64 data URL from the citizen's image upload.
router.post("/analyze-image", async (req: Request, res: Response) => {
    const validation = imageAnalyzeSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({
            message: "Provide an image as a base64 data URL (maximum 5 MB)."
        });
    }

    const image = validation.data.image;
    const allowedImage = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
    if (!allowedImage.test(image)) {
        return res.status(400).json({
            message: "Only JPEG, PNG and WebP images are supported."
        });
    }

    try {
        const suggestion = await analyzeIssueImage(
            image,
            validation.data.description
        );

        if (!suggestion.is_civic_issue) {
            return res.status(422).json({
                rejected: true,
                message: "This image does not appear to show a civic problem. Please upload a relevant photo such as a pothole, garbage, water leakage, damaged drain or broken streetlight."
            });
        }

        return res.status(200).json({
            message: "Image analysed successfully",
            suggestion
        });
    } catch (error) {
        console.error("AI image analysis failed:", error);
        return res.status(503).json({
            message: "Image analysis is unavailable. Check the OpenRouter API key and vision model configuration."
        });
    }
});

export default router;
