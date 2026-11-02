
import dotenv from "dotenv";

dotenv.config();

export const env = {
    PORT: Number(process.env.PORT) || 5000,
    JWT_SECRET: process.env.JWT_SECRET || "development_secret_change_later",
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || ""
};
