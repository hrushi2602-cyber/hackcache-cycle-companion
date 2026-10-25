/**
 * Single source of truth for API settings.
 * Strictly connects to the live FastAPI backend configured by VITE_API_URL.
 */

export function resolveApiBase(): string {
  const envUrl = (
    (typeof import.meta !== "undefined" && import.meta.env?.["VITE_API_URL"] as string | undefined) ||
    (typeof import.meta !== "undefined" && import.meta.env?.["VITE_API_BASE_URL"] as string | undefined)
  )?.trim();

  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }

  // Default fallback for local development
  return "http://localhost:8000";
}

export const API_BASE_URL = resolveApiBase();
export const USE_MOCK_API = false;

// 45s timeout accommodates free cloud hosting cold starts (e.g. Render/Railway spinning down after idle)
export const API_TIMEOUT_MS = 45000;
