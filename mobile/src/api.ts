import { Platform } from "react-native";

// For a physical phone, replace localhost with your computer's LAN IPv4 address,
// e.g. http://192.168.1.8:5000. Keep the backend and phone on the same Wi-Fi.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";

export type Issue = {
  id: number | string;
  title: string;
  description: string;
  category: string;
  priority: string;
  location: string;
  status: string;
  created_at?: string;
  latitude?: number | null;
  longitude?: number | null;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data as T;
}

export async function getIssues() {
  const data = await request<{ issues: Issue[] }>("/api/issues");
  return data.issues || [];
}

export async function createIssue(payload: {
  title: string; description: string; category?: string; location: string;
  latitude?: number | null; longitude?: number | null; reporter_name?: string;
}) {
  return request<{ issue: Issue; ai_analysis?: { used: boolean; category?: string; priority?: string; reason?: string } }>(
    "/api/issues",
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export function friendlyStatus(status?: string) {
  const value = (status || "OPEN").toUpperCase();
  if (value === "RESOLVED") return "Resolved";
  if (value === "IN_PROGRESS") return "In Progress";
  return "Submitted";
}

export function issueCode(id: string | number) {
  return `CF-${String(id).padStart(4, "0")}`;
}

export function platformApiHint() {
  return Platform.OS === "android"
    ? "On a physical Android phone, localhost points to the phone. Set EXPO_PUBLIC_API_URL to your computer's Wi-Fi IPv4 address."
    : "Make sure your phone and backend are on the same Wi-Fi network.";
}