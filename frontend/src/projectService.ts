import { supabase, isSupabaseConfigured } from "./lib/supabase";

export type ProjectStatus = "draft" | "processing" | "completed" | "failed";

export interface Project {
  id: string;
  userId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  duration?: string | null;
  videoPath?: string | null;
  voiceoverPath?: string | null;
  subtitlesPath?: string | null;
  thumbnailPath?: string | null;
  topic?: string | null;
  resolution?: string | null;
  aspectRatio?: string | null;
  sourceVideo?: string | null;
  metadata?: Record<string, any>;
  error?: string | null;
}

function mapRowToProject(row: any): Project {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || "Untitled Project",
    status: (row.status as ProjectStatus) || "draft",
    duration: row.duration ?? null,
    videoPath: row.video_path ?? null,
    voiceoverPath: row.voiceover_path ?? null,
    subtitlesPath: row.subtitles_path ?? null,
    thumbnailPath: row.thumbnail_path ?? null,
    sourceVideo: row.source_video ?? null,
    topic: row.topic ?? null,
    resolution: row.resolution ?? "1080p",
    aspectRatio: row.aspect_ratio ?? "9:16",
    metadata: row.metadata ?? {},
    error: row.error ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchUserProjects(userId: string): Promise<Project[]> {
  if (!isSupabaseConfigured || !userId) return [];
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("Could not fetch projects from Supabase:", error.message);
      return [];
    }

    return (data || []).map(mapRowToProject);
  } catch (err) {
    console.warn("fetchUserProjects error:", err);
    return [];
  }
}

export async function createProjectRecord(
  userId: string,
  data: Partial<Project> & { title?: string }
): Promise<Project | null> {
  if (!isSupabaseConfigured || !userId) return null;
  try {
    const row = {
      ...(data.id ? { id: data.id } : {}),
      user_id: userId,
      title: data.title?.trim() || "Untitled Project",
      status: data.status || "draft",
      duration: data.duration ?? null,
      video_path: data.videoPath ?? null,
      voiceover_path: data.voiceoverPath ?? null,
      subtitles_path: data.subtitlesPath ?? null,
      thumbnail_path: data.thumbnailPath ?? null,
      source_video: data.sourceVideo ?? null,
      topic: data.topic ?? null,
      resolution: data.resolution ?? "1080p",
      aspect_ratio: data.aspectRatio ?? "9:16",
      metadata: data.metadata ?? {},
      error: data.error ?? null,
    };

    const { data: inserted, error } = await supabase
      .from("projects")
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error("Failed to create project in Supabase:", error.message);
      return null;
    }

    return mapRowToProject(inserted);
  } catch (err) {
    console.error("createProjectRecord caught error:", err);
    return null;
  }
}

export async function updateProjectRecord(
  userId: string,
  id: string,
  updates: Partial<Project>
): Promise<Project | null> {
  if (!isSupabaseConfigured || !userId || !id) return null;
  try {
    const patch: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) patch.title = updates.title.trim();
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.duration !== undefined) patch.duration = updates.duration;
    if (updates.videoPath !== undefined) patch.video_path = updates.videoPath;
    if (updates.voiceoverPath !== undefined) patch.voiceover_path = updates.voiceoverPath;
    if (updates.subtitlesPath !== undefined) patch.subtitles_path = updates.subtitlesPath;
    if (updates.thumbnailPath !== undefined) patch.thumbnail_path = updates.thumbnailPath;
    if (updates.sourceVideo !== undefined) patch.source_video = updates.sourceVideo;
    if (updates.topic !== undefined) patch.topic = updates.topic;
    if (updates.resolution !== undefined) patch.resolution = updates.resolution;
    if (updates.aspectRatio !== undefined) patch.aspect_ratio = updates.aspectRatio;
    if (updates.metadata !== undefined) patch.metadata = updates.metadata;
    if (updates.error !== undefined) patch.error = updates.error;

    const { data: updated, error } = await supabase
      .from("projects")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Failed to update project in Supabase:", error.message);
      return null;
    }

    return updated ? mapRowToProject(updated) : null;
  } catch (err) {
    console.error("updateProjectRecord caught error:", err);
    return null;
  }
}

export async function deleteProjectRecord(userId: string, id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !userId || !id) return false;
  try {
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to delete project from Supabase:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("deleteProjectRecord caught error:", err);
    return false;
  }
}

export async function duplicateProjectRecord(userId: string, id: string): Promise<Project | null> {
  if (!isSupabaseConfigured || !userId || !id) return null;
  try {
    const { data: existing, error: fetchErr } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !existing) {
      console.error("Cannot duplicate non-existent project:", fetchErr?.message);
      return null;
    }

    const duplicatedRow = {
      ...existing,
      id: undefined, // Let db generate new id or random
      title: `${existing.title} (Copy)`,
      status: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    delete duplicatedRow.id;

    const { data: inserted, error: insertErr } = await supabase
      .from("projects")
      .insert(duplicatedRow)
      .select()
      .single();

    if (insertErr) {
      console.error("Failed to insert duplicated project:", insertErr.message);
      return null;
    }

    return mapRowToProject(inserted);
  } catch (err) {
    console.error("duplicateProjectRecord caught error:", err);
    return null;
  }
}
