
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

export async function analyzeIssue(description: string) {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        throw new Error("OpenRouter API key is missing");
    }

    const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            model: "openrouter/free",
            messages: [
                {
                    role: "system",
                    content: `
You are an AI assistant for CivicFix, a civic complaint platform.

Analyze the citizen's complaint.

Choose exactly one category:
ROADS, WATER, GARBAGE, STREETLIGHT, DRAINAGE, OTHER.

Choose exactly one priority:
LOW, MEDIUM, HIGH.

Priority guidelines:
HIGH: Immediate safety risk or serious public disruption.
MEDIUM: Significant civic problem requiring attention.
LOW: Minor issue with limited impact.

Return ONLY valid JSON:
{
  "category": "ROADS",
  "priority": "HIGH",
  "reason": "Brief explanation"
}
`
                },
                {
                    role: "user",
                    content: description
                }
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

    if (typeof content !== "string") {
        throw new Error("Invalid AI response");
    }

    const cleaned = content
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    const parsed = JSON.parse(cleaned);

    return aiResponseSchema.parse(parsed);
}
