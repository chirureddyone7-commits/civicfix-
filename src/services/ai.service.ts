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
    severity_score: z.number().int().min(0).max(100),
    department: z.enum(["ROAD_MAINTENANCE", "WATER_SUPPLY", "SANITATION", "ELECTRICAL", "DRAINAGE", "GENERAL"]),
    risk_factors: z.array(z.string()).max(6).default([]),
    reason: z.string()
});

const imageResponseSchema = z.object({
    is_civic_issue: z.boolean(),
    category: z.enum(["ROADS", "WATER", "GARBAGE", "STREETLIGHT", "DRAINAGE", "OTHER"]),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
    reason: z.string(),
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
Assign exactly one responsible department using this mapping:
ROADS=ROAD_MAINTENANCE; WATER=WATER_SUPPLY; GARBAGE=SANITATION; STREETLIGHT=ELECTRICAL; DRAINAGE=DRAINAGE; OTHER=GENERAL.
Give a severity_score from 0 to 100 based on visible/explicit urgency, safety risk, number of people affected, and disruption. Do not invent facts. List concise risk_factors supported by the complaint; use [] if none are stated.
Return only JSON: {"category":"ROADS","priority":"HIGH","severity_score":85,"department":"ROAD_MAINTENANCE","risk_factors":["Vehicles may swerve into traffic"],"reason":"Brief explanation"}.`
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
                    content: `You are CivicFix's strict image relevance gate. Decide whether the uploaded image clearly shows a real-world civic/infrastructure problem that a municipality could address.
ACCEPT only visible problems such as potholes or damaged roads/footpaths, overflowing garbage or illegal dumping, water leakage or flooding, broken/non-working streetlights or exposed electrical infrastructure, blocked/damaged drains or sewage issues, or comparable public infrastructure damage.
REJECT selfies, portraits, people/pets, food, documents, screenshots, memes, ordinary scenery, intact roads/buildings, unrelated objects, and unclear images. A road or building being present is NOT itself a civic issue. Do not infer a problem that is not visibly evident.
Return is_civic_issue=false for unrelated, unclear, or insufficient-evidence images. For rejected images use category OTHER, priority LOW, explain why, and return detected_objects only if useful.
For accepted images set is_civic_issue=true, classify category as ROADS, WATER, GARBAGE, STREETLIGHT, DRAINAGE, OTHER, and set priority HIGH for immediate safety hazards or major disruption; MEDIUM for significant issues; LOW for minor issues.
Return only JSON: {"is_civic_issue":true,"category":"ROADS","priority":"HIGH","reason":"Visible pothole on public road","detected_objects":["pothole"],"confidence":"HIGH"}.`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: description
                                ? `Optional citizen description: ${description}. Use it only as context; the image itself must visibly show the civic issue.`
                                : "Strictly check whether this image visibly shows a civic issue."
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


const combinedResponseSchema = imageResponseSchema.extend({
    text_matches_image: z.boolean(),
    mismatch_reason: z.string()
});

export async function analyzeCombinedReport(imageDataUrl: string, title: string, description: string) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OpenRouter API key is missing");
    const model = process.env.OPENROUTER_VISION_MODEL || "openrouter/free";
    const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
        model,
        messages: [
            {
                role: "system",
                content: `You are CivicFix's multimodal civic-complaint verifier. Inspect the uploaded image AND compare it with the citizen's title and description.
First decide whether the image itself clearly shows a real civic/infrastructure problem. Reject unrelated or unclear images.
Classify the visible issue using ROADS, WATER, GARBAGE, STREETLIGHT, DRAINAGE, OTHER. Assign LOW, MEDIUM, HIGH priority based on visible urgency and safety risk.
Set text_matches_image=true only when the title and description accurately describe the visible issue. If the report claims a pothole but image shows garbage, set false and explain the mismatch. Do not trust the text over the image.
Return only JSON with keys is_civic_issue, category, priority, reason, detected_objects, confidence, text_matches_image, mismatch_reason. For a rejected image use OTHER, LOW, false, and explain.`
            },
            {
                role: "user",
                content: [
                    { type: "text", text: `Citizen title: ${title}\nCitizen description: ${description}` },
                    { type: "image_url", image_url: { url: imageDataUrl } }
                ]
            }
        ],
        temperature: 0.1
    }, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        timeout: 60000
    });
    const content = response.data.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("Vision model returned an invalid response");
    return combinedResponseSchema.parse(parseAiJson(content));
}

export async function findDuplicateIssues(incoming: { title: string; description: string; location: string; category: string }, existing: Array<{ id: number; title: string; description: string; location: string; category: string }>) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OpenRouter API key is missing");
    if (existing.length === 0) return { matches: [] };

    const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
        model: "openrouter/free",
        messages: [
            { role: "system", content: 'Compare civic reports and identify only reports likely describing the SAME physical issue. Consider location, title and description. Return JSON only: {"matches":[{"issue_id":1,"similarity":"HIGH","reason":"Same issue and location"}]}. similarity must be LOW, MEDIUM or HIGH. Return an empty matches array if none are plausible.' },
            { role: "user", content: JSON.stringify({ incoming, existing }) }
        ],
        temperature: 0.1
    }, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        timeout: 30000
    });

    const content = response.data.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("Invalid AI response");
    const parsed = z.object({
        matches: z.array(z.object({
            issue_id: z.number().int().positive(),
            similarity: z.enum(["LOW", "MEDIUM", "HIGH"]),
            reason: z.string()
        })).max(10)
    }).parse(parseAiJson(content));

    const validIds = new Set(existing.map(item => item.id));
    return { matches: parsed.matches.filter(item => validIds.has(item.issue_id)) };
}
