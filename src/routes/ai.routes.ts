
import { Router, Request, Response } from "express";
import { z } from "zod";
import { analyzeIssue } from "../services/ai.service";

const router = Router();

const analyzeSchema = z.object({
    description: z.string().min(5).max(5000)
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

        return res.status(200).json({
            message: "AI analysis unavailable. Using default suggestions.",
            suggestion: {
                category: "OTHER",
                priority: "MEDIUM",
                reason: "Automatic classification was unavailable."
            }
        });
    }
});

export default router;
