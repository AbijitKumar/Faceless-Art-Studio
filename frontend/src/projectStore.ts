import { useEffect, useState } from "react";
import {
  Project,
  ProjectStatus,
  fetchUserProjects,
  createProjectRecord,
  updateProjectRecord,
  deleteProjectRecord,
  duplicateProjectRecord,
} from "./projectService";
import { supabase, isSupabaseConfigured } from "./lib/supabase";

export type { Project, ProjectStatus };

class ProjectStore {
  private currentUserId: string | null = null;
  private projects: Project[] = [];
  private isLoading: boolean = false;
  private error: string | null = null;
  private listeners: Set<() => void> = new Set();
  private realtimeChannel: any = null;

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  getProjects(): Project[] {
    return this.projects;
  }

  getProject(id: string): Project | null {
    return this.projects.find((p) => p.id === id) || null;
  }

  getIsLoading(): boolean {
    return this.isLoading;
  }

  getError(): string | null {
    return this.error;
  }

  /**
   * Called on auth change (login, logout, switch account).
   * Completely clears previous user's projects to prevent data leakage.
   */
  async setSessionUser(userId: string | null): Promise<void> {
    if (this.currentUserId === userId && this.projects.length > 0) {
      return;
    }

    // Teardown previous realtime subscription
    if (this.realtimeChannel) {
      try {
        supabase.removeChannel(this.realtimeChannel);
      } catch {}
      this.realtimeChannel = null;
    }

    this.currentUserId = userId;
    // Immediately clear state to prevent flashing another user's projects
    this.projects = [];
    this.error = null;

    if (!userId || !isSupabaseConfigured) {
      this.isLoading = false;
      this.notify();
      return;
    }

    this.isLoading = true;
    this.notify();

    try {
      const userProjects = await fetchUserProjects(userId);
      // Double check that user hasn't changed while request was in-flight
      if (this.currentUserId === userId) {
        this.projects = userProjects;
        this.isLoading = false;
        this.notify();
      }
    } catch (err: any) {
      if (this.currentUserId === userId) {
        this.error = err.message || "Failed to load projects";
        this.isLoading = false;
        this.notify();
      }
    }

    // Setup realtime subscription for this specific user
    try {
      this.realtimeChannel = supabase
        .channel(`public:projects:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "projects",
            filter: `user_id=eq.${userId}`,
          },
          async () => {
            if (this.currentUserId === userId) {
              const fresh = await fetchUserProjects(userId);
              if (this.currentUserId === userId) {
                this.projects = fresh;
                this.notify();
              }
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn("Failed to subscribe to realtime project updates:", e);
    }
  }

  async reloadProjects(): Promise<void> {
    if (!this.currentUserId) return;
    try {
      const fresh = await fetchUserProjects(this.currentUserId);
      this.projects = fresh;
      this.notify();
    } catch (err: any) {
      console.warn("reloadProjects error:", err);
    }
  }

  async createProject(data: Partial<Project> & { title?: string }): Promise<Project | null> {
    const userId = this.currentUserId;
    if (!userId) {
      console.warn("Cannot create project: user is not authenticated.");
      return null;
    }

    // Optimistic item
    const tempId = data.id || `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const optimistic: Project = {
      id: tempId,
      userId,
      title: data.title?.trim() || "Untitled Project",
      createdAt: data.createdAt || now,
      updatedAt: now,
      status: data.status || "draft",
      duration: data.duration ?? null,
      videoPath: data.videoPath ?? null,
      voiceoverPath: data.voiceoverPath ?? null,
      subtitlesPath: data.subtitlesPath ?? null,
      thumbnailPath: data.thumbnailPath ?? null,
      topic: data.topic ?? null,
      resolution: data.resolution ?? "1080p",
      aspectRatio: data.aspectRatio ?? "9:16",
      sourceVideo: data.sourceVideo ?? null,
      error: data.error ?? null,
    };

    // Prepend optimistically
    this.projects = [optimistic, ...this.projects];
    this.notify();

    // Persist to Supabase
    const saved = await createProjectRecord(userId, { ...data, id: tempId });
    if (saved) {
      this.projects = this.projects.map((p) => (p.id === tempId ? saved : p));
      this.notify();
      return saved;
    } else {
      // Revert if persistence failed
      this.projects = this.projects.filter((p) => p.id !== tempId);
      this.notify();
      return null;
    }
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    const userId = this.currentUserId;
    if (!userId) return null;

    const idx = this.projects.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    const previous = this.projects[idx];
    const optimistic: Project = {
      ...previous,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.projects[idx] = optimistic;
    this.notify();

    // Persist to Supabase
    const saved = await updateProjectRecord(userId, id, updates);
    if (saved) {
      this.projects = this.projects.map((p) => (p.id === id ? saved : p));
      this.notify();
      return saved;
    } else {
      // Revert if failed
      this.projects[idx] = previous;
      this.notify();
      return null;
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    const userId = this.currentUserId;
    if (!userId) return false;

    const existing = this.projects.find((p) => p.id === id);
    if (!existing) return false;

    // Optimistically remove
    this.projects = this.projects.filter((p) => p.id !== id);
    this.notify();

    const ok = await deleteProjectRecord(userId, id);
    if (!ok) {
      // Revert
      this.projects = [existing, ...this.projects];
      this.notify();
      return false;
    }
    return true;
  }

  async duplicateProject(id: string): Promise<Project | null> {
    const userId = this.currentUserId;
    if (!userId) return null;

    const saved = await duplicateProjectRecord(userId, id);
    if (saved) {
      this.projects = [saved, ...this.projects];
      this.notify();
      return saved;
    }
    return null;
  }

  clearAll(): void {
    this.projects = [];
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error("Error in project store listener:", err);
      }
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("project_store_updated"));
    }
  }
}

export const projectStore = new ProjectStore();

export function useProjects(): {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
} & Project[] {
  const [projects, setProjects] = useState<Project[]>(() => projectStore.getProjects());
  const [isLoading, setIsLoading] = useState<boolean>(() => projectStore.getIsLoading());
  const [error, setError] = useState<string | null>(() => projectStore.getError());

  useEffect(() => {
    const update = () => {
      setProjects([...projectStore.getProjects()]);
      setIsLoading(projectStore.getIsLoading());
      setError(projectStore.getError());
    };
    const unsub = projectStore.subscribe(update);
    window.addEventListener("project_store_updated", update);
    return () => {
      unsub();
      window.removeEventListener("project_store_updated", update);
    };
  }, []);

  // Return an array with additional properties attached for backwards compatibility!
  const result: any = projects;
  result.projects = projects;
  result.isLoading = isLoading;
  result.error = error;
  result.reload = () => projectStore.reloadProjects();
  return result;
}
