import { API_BASE } from "./lib/apiBase";

export interface Voice {
  shortName: string;
  friendlyName: string;
  gender: string;
  locale: string;
  localeName: string;
}

export interface InputFile {
  id?: string;
  name: string;
  original_name?: string;
  path: string;
  relPath?: string;
  storage_path?: string;
  url: string;
  size: number;
}


export interface CaptionSettings {
  enabled?: boolean;
  preset: "bold" | "neon" | "classic" | "minimal" | "karaoke" | "creator";
  font_name: string;
  font_size: number;
  font_size_scale?: number;
  primary_color: string;
  highlight_color: string;
  outline_color: string;
  alignment: number;
  outline: number;
  shadow: number;
  max_words: number;
}

export interface VideoSettings {
  aspect_ratio: "9:16" | "16:9" | "1:1";
  resolution: "720p" | "1080p" | "4K";
}

export interface GenerateRequest {
  job_id: string;
  title: string;
  text: string;
  video_path?: string;
  storage_path?: string;
  asset_id?: string;
  voice: string;
  whisper_model?: string;
  language?: string;
  caption_settings?: CaptionSettings;
  video_settings?: VideoSettings;
}

export interface JobResult {
  job_id: string;
  title?: string;
  source_video?: string;
  video_path: string;
  video_url: string;
  voiceover_url?: string | null;
  subtitles_url?: string | null;
  duration?: string;
  duration_sec?: number;
  resolution?: string;
  aspect_ratio?: string;
}

export interface JobStatus {
  job_id: string;
  title?: string;
  source_video?: string;
  status: "processing" | "completed" | "failed";
  stage:
    | "preparing"
    | "generating_voice"
    | "transcribing"
    | "rendering_captions"
    | "rendering_video"
    | "completed"
    | "failed";
  result?: JobResult | null;
  error?: string | null;
}

export async function fetchVoices(): Promise<Voice[]> {
  const res = await fetch(`${API_BASE}/api/voices`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to load voices: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.voices)) return data.voices;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export async function fetchInputFiles(token?: string): Promise<InputFile[]> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}/api/input-files`, { headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to load source files: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.files)) return data.files;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export async function fetchRandomInput(token?: string): Promise<InputFile> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}/api/random-input`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `No source videos found: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data?.file || data;
}

export async function uploadVideo(file: File, token?: string): Promise<InputFile> {
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload failed: ${res.statusText}`);
  }

  return res.json();
}

export async function startGeneration(
  req: GenerateRequest,
  token?: string
): Promise<{ job_id: string; title: string; source_video: string; status: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Generation failed to start: ${res.statusText}`);
  }

  return res.json();
}

export async function getJobStatus(jobId: string, token?: string): Promise<JobStatus> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
    headers,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch job status: ${res.statusText}`);
  }
  return res.json();
}

export function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

