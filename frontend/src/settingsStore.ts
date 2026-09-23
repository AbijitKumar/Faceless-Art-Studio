import { useEffect, useState } from "react";

export type ThemeMode = "dark" | "light" | "system";
export type LandingPage = "dashboard" | "projects" | "editor";

export interface StudioSettings {
  displayName: string;
  email: string;
  avatarColor: string;
  theme: ThemeMode;
  autoSaveProjects: boolean;
  confirmBeforeDelete: boolean;
  defaultLandingPage: LandingPage;
  language: string;
  emailNotifications: boolean;
}

const SETTINGS_STORAGE_KEY = "faceless_art_studio_settings";

export const DEFAULT_SETTINGS: StudioSettings = {
  displayName: "Creator",
  email: "abijitbuilds@gmail.com",
  avatarColor: "#1E8CFA",
  theme: "dark",
  autoSaveProjects: true,
  confirmBeforeDelete: true,
  defaultLandingPage: "dashboard",
  language: "English",
  emailNotifications: false,
};

export const AVATAR_COLORS = [
  { id: "#1E8CFA", label: "Studio Blue", value: "#1E8CFA" },
  { id: "#8E5FF0", label: "Royal Violet", value: "#8E5FF0" },
  { id: "#10B981", label: "Emerald", value: "#10B981" },
  { id: "#F59E0B", label: "Amber", value: "#F59E0B" },
  { id: "#EF4444", label: "Crimson", value: "#EF4444" },
  { id: "#06B6D4", label: "Cyan", value: "#06B6D4" },
];

class SettingsStore {
  private listeners: Set<() => void> = new Set();
  private systemMediaListener: ((e: MediaQueryListEvent) => void) | null = null;
  private mediaQuery: MediaQueryList | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      this.systemMediaListener = (e: MediaQueryListEvent) => {
        const current = this.getSettings();
        if (current.theme === "system") {
          this.applyThemeToDOM(e.matches ? "dark" : "light");
        }
      };
      if (this.mediaQuery.addEventListener) {
        this.mediaQuery.addEventListener("change", this.systemMediaListener);
      }
    }
  }

  getSettings(): StudioSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        // Always guarantee registered email is preserved
        email: DEFAULT_SETTINGS.email,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  updateSettings(partial: Partial<StudioSettings>): StudioSettings {
    const current = this.getSettings();
    const updated: StudioSettings = {
      ...current,
      ...partial,
      // Registered workspace email remains anchored
      email: DEFAULT_SETTINGS.email,
    };

    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to persist settings:", e);
    }

    if (partial.theme !== undefined) {
      this.applyTheme(updated.theme);
    }

    this.notify();
    return updated;
  }

  applyTheme(theme: ThemeMode) {
    if (typeof document === "undefined") return;

    if (theme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      this.applyThemeToDOM(isDark ? "dark" : "light");
    } else {
      this.applyThemeToDOM(theme);
    }
  }

  private applyThemeToDOM(resolved: "dark" | "light") {
    if (resolved === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
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
        console.error("Error in settings listener:", err);
      }
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("faceless_settings_updated"));
    }
  }
}

export const settingsStore = new SettingsStore();

export function useSettings(): StudioSettings {
  const [settings, setSettings] = useState<StudioSettings>(() => settingsStore.getSettings());

  useEffect(() => {
    const update = () => setSettings(settingsStore.getSettings());
    const unsub = settingsStore.subscribe(update);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SETTINGS_STORAGE_KEY) update();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("faceless_settings_updated", update);
    return () => {
      unsub();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("faceless_settings_updated", update);
    };
  }, []);

  return settings;
}
