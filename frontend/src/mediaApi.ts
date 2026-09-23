// Media Library API & Data Utilities for Faceless Art Studio

export type MediaType = "video" | "audio" | "subtitle" | "image";
export type MediaCategory = "input" | "output_video" | "voiceover" | "subtitles";

export interface MediaAsset {
  id: string;
  name: string;
  path: string;
  relPath: string;
  url: string;
  category: MediaCategory;
  type: MediaType;
  extension: string;
  size: number;
  modified: number;
  duration?: number | string;
  projectTitle?: string | null;
}

export interface MediaSummary {
  total: number;
  videos: number;
  audio: number;
  subtitles: number;
  images: number;
  totalSizeBytes: number;
}

export interface MediaResponse {
  assets: MediaAsset[];
  summary: MediaSummary;
}

export interface SubtitleCue {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
}

/**
 * Fetch all media assets and summary from backend
 */
export async function fetchMediaAssets(): Promise<MediaResponse> {
  const res = await fetch("/api/media");
  if (!res.ok) {
    throw new Error(`Failed to fetch media assets: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Upload a media file to the backend
 */
export async function uploadMediaAsset(file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Upload failed: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch raw subtitle content for previewing
 */
export async function fetchSubtitleContent(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load subtitle file: ${res.statusText}`);
  }
  return res.text();
}

/**
 * Format bytes into human-readable string
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format timestamp (ms) into formatted date
 */
export function formatDate(timestamp: number): string {
  if (!timestamp) return "Unknown";
  const d = new Date(timestamp);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format timestamp (ms) into relative time
 */
export function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return "";
  const now = Date.now();
  const diff = now - timestamp;
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;

  if (diff < min) return "Just now";
  if (diff < hour) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
  return formatDate(timestamp);
}

/**
 * Parse SRT or ASS subtitle text into structured cue list for readable preview
 */
export function parseSubtitleCues(rawText: string, extension: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const ext = extension.toLowerCase();

  if (ext === ".srt") {
    const blocks = rawText.trim().split(/\r?\n\r?\n/);
    let index = 1;
    for (const block of blocks) {
      const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length >= 2) {
        const timeLineIdx = lines[0].includes("-->") ? 0 : 1;
        const timeLine = lines[timeLineIdx] || "";
        const parts = timeLine.split("-->").map((s) => s.trim());
        if (parts.length === 2) {
          const text = lines.slice(timeLineIdx + 1).join(" ");
          cues.push({
            id: index++,
            startTime: parts[0],
            endTime: parts[1],
            text: text.replace(/<[^>]+>/g, ""), // strip basic HTML tags
          });
        }
      }
    }
  } else if (ext === ".ass" || ext === ".ssa") {
    const lines = rawText.split(/\r?\n/);
    let index = 1;
    for (const line of lines) {
      if (line.startsWith("Dialogue:")) {
        // Dialogue: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
        const commaParts = line.substring(9).split(",");
        if (commaParts.length >= 10) {
          const start = commaParts[1]?.trim() || "0:00:00.00";
          const end = commaParts[2]?.trim() || "0:00:00.00";
          const text = commaParts.slice(9).join(",").trim();
          // Remove ASS style overrides like {\k10}, {\c&H...}, \N
          const cleanText = text
            .replace(/\{[^}]+\}/g, "")
            .replace(/\\N/g, " ")
            .replace(/\\n/g, " ")
            .replace(/\\h/g, " ")
            .trim();

          if (cleanText) {
            cues.push({
              id: index++,
              startTime: start,
              endTime: end,
              text: cleanText,
            });
          }
        }
      }
    }
  } else {
    // Plain text or unsupported subtitle format: chunk lines
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    lines.forEach((l, i) => {
      cues.push({
        id: i + 1,
        startTime: `00:00`,
        endTime: `00:00`,
        text: l.trim(),
      });
    });
  }

  return cues;
}
