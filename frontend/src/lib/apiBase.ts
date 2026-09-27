/**
 * Resolves the backend API base URL.
 *
 * Resolution order:
 *  1. VITE_API_BASE_URL environment variable (set in Vercel / Render dashboard)
 *     → used in production and Capacitor Android builds
 *  2. Empty string fallback
 *     → Vite dev-server proxy forwards /api, /output, /input to 127.0.0.1:8000
 *
 * Never contains a trailing slash, so callers can always write:
 *   fetch(`${API_BASE}/api/voices`)
 */
export const API_BASE: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
