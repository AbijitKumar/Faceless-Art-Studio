import { useEffect, useState } from "react";
export type ProjectStatus = "draft" | "processing" | "completed" | "failed";

export interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  duration?: string | null;
  videoPath?: string | null;
  voiceoverPath?: string | null;
  subtitlesPath?: string | null;
  topic?: string | null;
  resolution?: string | null;
  sourceVideo?: string | null;
  error?: string | null;
}

const STORAGE_KEY = "faceless_art_studio_projects";

class ProjectStore {
  private listeners: Set<() => void> = new Set();

  getProjects(): Project[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  getProject(id: string): Project | null {
    const projects = this.getProjects();
    return projects.find((p) => p.id === id) || null;
  }

  createProject(data: Partial<Project> & { title?: string }): Project {
    const projects = this.getProjects();
    const now = new Date().toISOString();
    const newProject: Project = {
      id: data.id || `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: data.title?.trim() || "Untitled Project",
      createdAt: data.createdAt || now,
      updatedAt: now,
      status: data.status || "draft",
      duration: data.duration ?? null,
      videoPath: data.videoPath ?? null,
      voiceoverPath: data.voiceoverPath ?? null,
      subtitlesPath: data.subtitlesPath ?? null,
      topic: data.topic ?? null,
      resolution: data.resolution ?? "1080p",
      sourceVideo: data.sourceVideo ?? null,
      error: data.error ?? null,
    };


    const updated = [newProject, ...projects];
    this.save(updated);
    this.notify();
    return newProject;
  }

  updateProject(id: string, updates: Partial<Project>): Project | null {
    const projects = this.getProjects();
    const idx = projects.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    const now = new Date().toISOString();
    const updatedProject: Project = {
      ...projects[idx],
      ...updates,
      updatedAt: now,
    };

    projects[idx] = updatedProject;
    this.save(projects);
    this.notify();
    return updatedProject;
  }

  deleteProject(id: string): boolean {
    const projects = this.getProjects();
    const filtered = projects.filter((p) => p.id !== id);
    if (filtered.length === projects.length) return false;

    this.save(filtered);
    this.notify();
    return true;
  }

  duplicateProject(id: string): Project | null {
    const project = this.getProject(id);
    if (!project) return null;

    const now = new Date().toISOString();
    const duplicated: Project = {
      ...project,
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: `${project.title} (Copy)`,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };

    const projects = [duplicated, ...this.getProjects()];
    this.save(projects);
    this.notify();
    return duplicated;
  }

  clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      this.notify();
    } catch (e) {
      console.error("Failed to clear projects from localStorage:", e);
    }
  }

  private save(projects: Project[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.error("Failed to save projects to localStorage:", e);
    }
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

export function useProjects(): Project[] {
  const [projects, setProjects] = useState<Project[]>(() => projectStore.getProjects());

  useEffect(() => {
    const update = () => setProjects(projectStore.getProjects());
    const unsub = projectStore.subscribe(update);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) update();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("project_store_updated", update);
    return () => {
      unsub();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("project_store_updated", update);
    };
  }, []);

  return projects;
}
