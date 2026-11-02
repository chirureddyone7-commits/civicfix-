import axios from "axios";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const aiResponseSchema = z.object({
    category: z.enum([
        "ROADS",
        "WATER",
        "GARBAGE",
        "STREETLIGHT",
        "DRAINAGE",
        "OTHER"
    ]),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
    reason: z.string()
});

const imageResponseSchema = aiResponseSchema.extend({
    detected_objects: z.array(z.string()).default([]),
    confidence: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM")
});

function parseAiJson(content: string) {
    const cleaned = content
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("AI did not return JSON");
    return JSON.parse(cleaned.slice(start, end + 1));
}

export async function analyzeIssue(description: string) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OpenRouter API key is missing");

    const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            model: "openrouter/free",
            messages: [
                {
                    role: "system",
                    content: `You are CivicFix, an assistant for civic complaints.
Choose one category: ROADS, WATER, GARBAGE, STREETLIGHT, DRAINAGE, OTHER.
Choose one priority: LOW, MEDIUM, HIGH.
HIGH means immediate safety risk or serious public disruption.
MEDIUM means a significant problem requiring attention.
LOW means a minor issue with limited impact.
Return only JSON: {"category":"ROADS","priority":"HIGH","reason":"Brief explanation"}.`
                },
                { role: "user", content: description }
            ],
            temperature: 0.2
        },
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            timeout: 30000
        }
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("Invalid AI response");
    return aiResponseSchema.parse(parseAiJson(content));
}

export async function analyzeIssueImage(imageDataUrl: string, description?: string) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OpenRouter API key is missing");

    // Set OPENROUTER_VISION_MODEL to a vision-capable model available to your key.
    const model = process.env.OPENROUTER_VISION_MODEL || "openrouter/free";

    const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            model,
            messages: [
                {
                    role: "system",
                    content: `You are CivicFix's visual inspection assistant. Inspect the uploaded civic-issue photo.
Classify the visible issue into exactly one category: ROADS, WATER, GARBAGE, STREETLIGHT, DRAINAGE, OTHER.
Set priority: HIGH for immediate safety hazards or major disruption; MEDIUM for significant issues; LOW for minor issues.
List only objects/problems clearly visible. Do not invent details. If the image is unclear or unrelated, use OTHER and LOW and explain the uncertainty.
Confidence is your confidence in the visual classification, not proof that the issue exists.
Return only JSON: {"category":"ROADS","priority":"HIGH","reason":"Brief visual explanation","detected_objects":["pothole"],"confidence":"MEDIUM"}.`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: description
                                ? `Optional citizen description: ${description}. Use it as context, but classify what is visible in the image.`
                                : "Analyse this civic issue photo."
                        },
                        {
                            type: "image_url",
                            image_url: { url: imageDataUrl }
                        }
                    ]
                }
            ],
            temperature: 0.1
        },
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            timeout: 60000
        }
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("Vision model returned an invalid response");
    return imageResponseSchema.parse(parseAiJson(content));
}
