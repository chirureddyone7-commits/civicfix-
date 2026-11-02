import { Router, Request, Response } from "express";
import { z } from "zod";
import { analyzeIssue, analyzeIssueImage } from "../services/ai.service";

const router = Router();

const analyzeSchema = z.object({
    description: z.string().min(5).max(5000)
});

const imageAnalyzeSchema = z.object({
    image: z.string().max(7_000_000),
    description: z.string().max(2000).optional()
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
