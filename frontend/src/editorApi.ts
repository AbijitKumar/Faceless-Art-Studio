export interface Voice {
  shortName: string;
  friendlyName: string;
  gender: string;
  locale: string;
  localeName: string;
}

export interface InputFile {
  name: string;
  path: string;
  relPath: string;
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
  const res = await fetch("/api/voices");
  if (!res.ok) {
    throw new Error(`Failed to load voices: ${res.statusText}`);
  }
  const data = await res.json();
  return data.voices || [];
}

export async function fetchInputFiles(): Promise<InputFile[]> {
  const res = await fetch("/api/input-files");
  if (!res.ok) {
    throw new Error(`Failed to load source files: ${res.statusText}`);
  }
  const data = await res.json();
  return data.files || [];
}

export async function fetchRandomInput(): Promise<InputFile> {
  const res = await fetch("/api/random-input");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `No source videos found: ${res.statusText}`);
  }
  const data = await res.json();
  return data.file;
}

export async function uploadVideo(file: File): Promise<InputFile> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload failed: ${res.statusText}`);
  }

  return res.json();
}

export async function startGeneration(
  req: GenerateRequest
): Promise<{ job_id: string; title: string; source_video: string; status: string }> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Generation failed to start: ${res.statusText}`);
  }

  return res.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`/api/jobs/${jobId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch job status: ${res.statusText}`);
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

