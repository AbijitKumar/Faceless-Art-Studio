import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import {
  Activity, Bell, ChevronDown, FolderKanban,
  HelpCircle, Image, LayoutDashboard, LayoutTemplate, Plus,
  Search, Settings, Sparkles, Upload, Video, CheckCircle2,
  MoreVertical, X, FileVideo, Clock, ChevronRight, ArrowUpDown,
  Download, Menu
} from "lucide-react";
import logoSrc from "./assets/logo.png";
import { Project, ProjectStatus, projectStore, useProjects } from "./projectStore";
import { settingsStore, useSettings } from "./settingsStore";
import { TemplateConfig } from "./templates";
import { MediaAsset } from "./mediaApi";
import { InputFile } from "./editorApi";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";
import { SignUpPage } from "./auth/SignUpPage";
import { ForgotPasswordPage } from "./auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./auth/ResetPasswordPage";
import { ToastProvider, useToast } from "./ToastContext";
import { AppHeader, Page } from "./AppHeader";
import { CookieConsentBanner } from "./CookieConsentBanner";
import { HelpSectionId } from "./HelpPage";

// Code-split heavy routes with React.lazy
const EditorPage = lazy(() => import("./EditorPage").then((m) => ({ default: m.EditorPage })));
const TemplatesPage = lazy(() => import("./TemplatesPage").then((m) => ({ default: m.TemplatesPage })));
const MediaLibraryPage = lazy(() => import("./MediaLibraryPage").then((m) => ({ default: m.MediaLibraryPage })));
const SettingsPage = lazy(() => import("./SettingsPage").then((m) => ({ default: m.SettingsPage })));
const HelpPage = lazy(() => import("./HelpPage").then((m) => ({ default: m.HelpPage })));
const PrivacyPage = lazy(() => import("./PrivacyPage").then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import("./TermsPage").then((m) => ({ default: m.TermsPage })));

function PageSkeletonLoader() {
  return (
    <main className="content" style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 32 }}>
      <div style={{ height: 40, width: 280, background: "rgba(255,255,255,0.06)", borderRadius: 10, animation: "skeletonPulse 1.5s infinite" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: 160, background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", animation: "skeletonPulse 1.5s infinite" }} />
        ))}
      </div>
    </main>
  );
}

// Page type is imported from AppHeader (single source of truth)

const nav: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects", label: "My Projects", icon: FolderKanban },
  { id: "editor", label: "Create Video", icon: Plus },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "media", label: "Media Library", icon: Image },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function statusLabel(s: ProjectStatus) {
  switch (s) {
    case "draft": return "Draft";
    case "processing": return "Processing";
    case "completed": return "Completed";
    case "failed": return "Failed";
  }
}

// ── AppContent ───────────────────────────────────────────────────────────────
function AppContent() {
  const settings = useSettings();
  const { user, profile, isAuthenticated, isPasswordRecovery, isLoading, isConfigured } = useAuth();
  const toast = useToast();

  const [page, setPage] = useState<Page>(() => {
    const landing = settingsStore.getSettings().defaultLandingPage;
    if (landing === "projects") return "projects";
    if (landing === "editor") return "editor";
    return "dashboard";
  });
  const [helpSection, setHelpSection] = useState<HelpSectionId>("about");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateConfig | null>(null);
  const [selectedSourceVideo, setSelectedSourceVideo] = useState<InputFile | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Sync session user with projectStore (clears state on logout, loads user projects on login)
  useEffect(() => {
    projectStore.setSessionUser(user?.id ?? null);
  }, [user?.id]);

  // Watch for password recovery session
  useEffect(() => {
    if (isPasswordRecovery) {
      setPage("reset-password");
    }
  }, [isPasswordRecovery]);

  // Apply theme on mount and whenever theme changes
  useEffect(() => {
    settingsStore.applyTheme(settings.theme);
  }, [settings.theme]);

  // Dynamic document title update (SEO & UX)
  useEffect(() => {
    const titles: Record<Page, string> = {
      dashboard: "Dashboard — Faceless Art Studio",
      projects: "My Projects — Faceless Art Studio",
      editor: "Create Video — Faceless Art Studio",
      templates: "Templates — Faceless Art Studio",
      media: "Media Library — Faceless Art Studio",
      settings: "Settings — Faceless Art Studio",
      help: "Help Center — Faceless Art Studio",
      privacy: "Privacy Policy — Faceless Art Studio",
      terms: "Terms of Service — Faceless Art Studio",
      login: "Sign In — Faceless Art Studio",
      signup: "Sign Up — Faceless Art Studio",
      "forgot-password": "Reset Password — Faceless Art Studio",
      "reset-password": "Set New Password — Faceless Art Studio",
    };
    document.title = titles[page] || "Faceless Art Studio";
  }, [page]);

  // Keyboard shortcut: Escape closes expanded sidebar on mobile
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sidebarExpanded) {
        setSidebarExpanded(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarExpanded]);

  const userDisplayName = isAuthenticated
    ? profile?.display_name || user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Creator"
    : settings.displayName || "Guest Studio";

  const userAvatarColor = isAuthenticated
    ? profile?.avatar_color || settings.avatarColor
    : settings.avatarColor;

  const userInitials = (userDisplayName.trim() || "A").slice(0, 2).toUpperCase();

  const go = (next: Page) => {
    if (window.innerWidth <= 768) {
      setSidebarExpanded(false);
    }
    setPage(next);
  };

  // 1. Session restoration loading splash
  if (isConfigured && isLoading) {
    return (
      <div
        className="studio-loader-splash"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#101216",
          color: "#FFF",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <img
            src={logoSrc}
            alt="Faceless Art Studio Logo"
            style={{ width: 56, height: 56, marginBottom: 16 }}
            className="skeleton-pulse"
          />
          <div style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Faceless Art Studio
          </div>
          <div style={{ color: "#8C94A0", fontSize: 13 }}>Restoring your studio workspace...</div>
        </div>
      </div>
    );
  }

  const handleUseTemplate = (template: TemplateConfig) => {
    setSelectedTemplate(template);
    setSelectedSourceVideo(null);
    toast.success(`Loaded "${template.name}" template in Editor`);
    setPage("editor");
  };

  const handleUseMediaInEditor = (asset: MediaAsset) => {
    setSelectedSourceVideo({
      name: asset.name,
      path: asset.path,
      relPath: asset.relPath,
      url: asset.url,
      size: asset.size,
    });
    setSelectedTemplate(null);
    toast.info(`Selected "${asset.name}" as source video`);
    setPage("editor");
  };

  // 2. Strict Authentication Guard for Private Routes
  let pageContent: React.ReactNode = null;

  if (isConfigured && !isAuthenticated) {
    if (page === "signup") {
      pageContent = <SignUpPage onNavigate={(p) => go(p as Page)} onSuccess={() => go("dashboard")} />;
    } else if (page === "forgot-password") {
      pageContent = <ForgotPasswordPage onNavigate={(p) => go(p as Page)} />;
    } else if (page === "reset-password") {
      pageContent = <ResetPasswordPage onNavigate={(p) => go(p as Page)} />;
    } else if (page === "privacy") {
      pageContent = (
        <Suspense fallback={<PageSkeletonLoader />}>
          <PrivacyPage onBack={() => go("login")} onNavigateTerms={() => go("terms")} />
        </Suspense>
      );
    } else if (page === "terms") {
      pageContent = (
        <Suspense fallback={<PageSkeletonLoader />}>
          <TermsPage onBack={() => go("login")} onNavigatePrivacy={() => go("privacy")} />
        </Suspense>
      );
    } else if (page === "help") {
      pageContent = (
        <div className="app">
          <AppHeader activePage={page} onNavigate={(p) => go(p)} onToggleSidebar={() => setSidebarExpanded((v) => !v)} />
          <div className="main" style={{ marginLeft: 0, width: "100%" }}>
            <Suspense fallback={<PageSkeletonLoader />}>
              <HelpPage initialSection={helpSection} />
            </Suspense>
          </div>
        </div>
      );
    } else {
      // Protected pages: dashboard, projects, editor, templates, media, settings -> render LoginPage
      pageContent = (
        <LoginPage
          onNavigate={(p) => go(p as Page)}
          onSuccess={() => go(page === "login" ? "dashboard" : page)}
        />
      );
    }
  } else if (page === "login" || page === "signup") {
    // If already authenticated, redirect to dashboard
    pageContent = <Dashboard onNavigate={go} />;
  } else if (page === "forgot-password") {
    pageContent = <ForgotPasswordPage onNavigate={(p) => go(p as Page)} />;
  } else if (page === "reset-password") {
    pageContent = <ResetPasswordPage onNavigate={(p) => go(p as Page)} />;
  } else {
    pageContent = (
      <div className="app">
        {/* ── Unified Shared Header (Logo + Brand | Search | Notifications + User) ── */}
        <AppHeader
          activePage={page}
          onNavigate={(p, targetId) => {
            if (targetId) setSelectedProjectId(targetId);
            go(p);
          }}
          onToggleSidebar={() => setSidebarExpanded((v) => !v)}
        />

      <aside ref={sidebarRef} className={`sidebar ${sidebarExpanded ? "expanded" : ""}`}>
        <div className="brand">
          <button
            className="sidebar-toggle-btn"
            onClick={() => setSidebarExpanded((v) => !v)}
            aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <Menu size={18} />
          </button>
          {sidebarExpanded && (
            <>
              <div className="brand-mark" onClick={() => setSidebarExpanded((v) => !v)} style={{ cursor: "pointer" }}>
                <img
                  src={logoSrc}
                  alt="Faceless Art Studio"
                  style={{ width: 28, height: 28, objectFit: "contain", display: "block" }}
                />
              </div>
              <div className="brand-text">
                <b>Faceless Art</b>
                <span>Studio</span>
              </div>
            </>
          )}
        </div>
        <section className="nav-section">
          {sidebarExpanded && <small>WORKSPACE</small>}
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              title={label}
              className={`nav-item ${page === id ? "active" : ""} ${id === "editor" ? "create" : ""}`}
            >
              <Icon size={19} />
              {sidebarExpanded && <span>{label}</span>}
            </button>
          ))}
        </section>
        <section className="nav-section system">
          {sidebarExpanded && <small>SYSTEM</small>}
          <button
            onClick={() => go("settings")}
            title="Settings"
            className={`nav-item ${page === "settings" ? "active" : ""}`}
          >
            <Settings size={19} />
            {sidebarExpanded && <span>Settings</span>}
          </button>
          <button
            onClick={() => go("help")}
            title="Help"
            className={`nav-item ${page === "help" ? "active" : ""}`}
          >
            <HelpCircle size={19} />
            {sidebarExpanded && <span>Help</span>}
          </button>
        </section>
        <div
          className="profile"
          onClick={() => go(isAuthenticated ? "settings" : "login")}
          title={isAuthenticated ? "Settings & Workspace Profile" : "Sign In to Faceless Studio"}
          style={{ cursor: "pointer" }}
        >
          <div className="avatar" style={{ background: userAvatarColor }}>
            {userInitials}
          </div>
          {sidebarExpanded && (
            <>
              <div>
                <b>{userDisplayName}</b>
                <span>{isAuthenticated ? "Personal workspace" : "Guest mode"}</span>
              </div>
              <ChevronDown size={16} />
            </>
          )}
        </div>
      </aside>

      {/* Mobile backdrop overlay */}
      {sidebarExpanded && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarExpanded(false)}
          aria-hidden="true"
        />
      )}

      <div className="main">
        <Suspense fallback={<PageSkeletonLoader />}>
          {page === "dashboard" ? (
            <Dashboard onNavigate={go} />
          ) : page === "projects" ? (
            <ProjectsPage onNavigate={go} initialSelectedProjectId={selectedProjectId} />
          ) : page === "templates" ? (
            <TemplatesPage onUseTemplate={handleUseTemplate} onNavigateEditor={() => go("editor")} />
          ) : page === "media" ? (
            <MediaLibraryPage
              onUseInEditor={handleUseMediaInEditor}
              onNavigateEditor={() => go("editor")}
              onNavigateProjects={() => go("projects")}
            />
          ) : page === "editor" ? (
            <EditorPage
              onBack={() => go("dashboard")}
              onNavigateProjects={(targetId) => {
                if (targetId) setSelectedProjectId(targetId);
                go("projects");
              }}
              initialTemplate={selectedTemplate}
              initialVideo={selectedSourceVideo}
            />
          ) : page === "settings" ? (
            <SettingsPage
              onNavigateHelp={(targetSec) => {
                if (targetSec) setHelpSection(targetSec);
                setPage("help");
              }}
              onNavigateAuth={(p) => go(p as Page)}
              onNavigateLegal={(target) => go(target)}
            />
          ) : page === "help" ? (
            <HelpPage initialSection={helpSection} />
          ) : page === "privacy" ? (
            <PrivacyPage onBack={() => go("dashboard")} onNavigateTerms={() => go("terms")} />
          ) : page === "terms" ? (
            <TermsPage onBack={() => go("dashboard")} onNavigatePrivacy={() => go("privacy")} />
          ) : (
            <ProgressPage page={page} onBack={() => go("dashboard")} />
          )}
        </Suspense>
      </div>

    </div>
    );
  }

  return (
    <>
      {pageContent}
      <CookieConsentBanner onNavigate={(target) => go(target)} />
    </>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const projects = useProjects();

  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 4);
  }, [projects]);

  return (
    <main className="content">
      <section className="hero">
        <div>
          <small className="eyebrow">YOUR CREATIVE STUDIO</small>
          <h1>{greeting()} 👋</h1>
          <p>Turn your ideas into polished faceless videos.</p>
        </div>
        <button className="primary" onClick={() => onNavigate("editor")}>
          <Plus size={17} />Create New Video
        </button>
      </section>

      <section className="dashboard-grid">
        <article className="panel projects">
          <PanelHead
            title="Recent Projects"
            sub="Your latest creations will appear here."
            action={projects.length > 0 ? "View all" : undefined}
            onClick={() => onNavigate("projects")}
          />
          {projectStore.getIsLoading() ? (
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 44, background: "rgba(255,255,255,0.03)", borderRadius: 8, animation: "skeletonPulse 1.5s infinite" }} />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Empty
              icon={<FolderKanban />}
              title="No projects yet"
              text="Create your first video and it will appear here."
              action="Create your first video"
              onClick={() => onNavigate("editor")}
            />
          ) : (
            <div className="prj-mini-list">
              {recentProjects.map((p) => (
                <div key={p.id} className="prj-mini-item" onClick={() => onNavigate("projects")}>
                  <div className="prj-mini-left">
                    <div className="prj-mini-icon"><FileVideo size={16} /></div>
                    <div>
                      <b>{p.title}</b>
                      <span>{new Date(p.createdAt).toLocaleDateString()} {p.duration ? `· ${p.duration}` : ""}</span>
                    </div>
                  </div>
                  <span className={`prj-badge prj-badge--${p.status}`}>{statusLabel(p.status)}</span>
                </div>
              ))}
            </div>
          )}
        </article>
        <div className="side">
          <article className="panel quick-actions-panel">
            <PanelHead title="Quick Actions" sub="Jump straight into your workflow." />
            <div className="quick">
              <button onClick={() => onNavigate("editor")}>
                <span className="qa blue"><Sparkles size={18} /></span>
                <span><b>Create Video</b><small>Start from a script</small></span>
              </button>
              <button onClick={() => onNavigate("templates")}>
                <span className="qa violet"><LayoutTemplate size={18} /></span>
                <span><b>Browse Templates</b><small>Pick a proven format</small></span>
              </button>
              <button onClick={() => onNavigate("media")}>
                <span className="qa"><Upload size={18} /></span>
                <span><b>Upload Media</b><small>Add source media</small></span>
              </button>
            </div>
          </article>
          <article className="panel activity activity-panel">
            <PanelHead title="Recent Activity" sub="Activity from your workspace." />
            {projects.length === 0 ? (
              <div className="activity-empty">
                <Activity size={18} />
                <div><b>No recent activity</b><span>Your projects and exports will appear here.</span></div>
              </div>
            ) : (
              <div className="activity-list">
                {recentProjects.map((p) => (
                  <div key={p.id} className="activity-item">
                    <span className={`activity-dot ${p.status === "completed" ? "blue" : "violet"}`} />
                    <div>
                      <b>{p.status === "completed" ? `Exported ${p.title}` : `Created ${p.title}`}</b>
                      <span>{new Date(p.updatedAt || p.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>
      </section>
    </main>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────
function PanelHead({ title, sub, action, onClick }: {
  title: string; sub: string; action?: string; onClick?: () => void;
}) {
  return (
    <div className="panel-head">
      <div><h2>{title}</h2><p>{sub}</p></div>
      {action && <button className="link" onClick={onClick}>{action} ↗</button>}
    </div>
  );
}

function Empty({ icon, title, text, action, onClick }: {
  icon: React.ReactNode; title: string; text: string; action: string; onClick: () => void;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3><p>{text}</p>
      <button className="secondary" onClick={onClick}><Plus size={16} />{action}</button>
    </div>
  );
}

// ── Projects Page ─────────────────────────────────────────────────────────────
type SortKey = "updated" | "title" | "duration" | "status";
type FilterStatus = "all" | ProjectStatus;

function ProjectsPage({
  onNavigate,
  initialSelectedProjectId,
}: {
  onNavigate: (p: Page) => void;
  initialSelectedProjectId?: string | null;
}) {
  const { isAuthenticated, session } = useAuth();
  const toast = useToast();
  const projects = useProjects();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [selected, setSelected] = useState<Project | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-select initial project if passed (e.g., from "View in My Projects" or Notification)
  useEffect(() => {
    if (initialSelectedProjectId && projects.length > 0) {
      const match = projects.find((p) => p.id === initialSelectedProjectId);
      if (match) {
        setSelected(match);
      }
    }
  }, [initialSelectedProjectId, projects]);

  // Close action menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  // Close modal on Escape
  useEffect(() => {
    if (!selected) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setSelected(null); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [selected]);

  const visible = useMemo(() => {
    return projects
      .filter((p) =>
        (filter === "all" || p.status === filter) &&
        (p.title.toLowerCase().includes(query.toLowerCase()) ||
          (p.topic && p.topic.toLowerCase().includes(query.toLowerCase())))
      )
      .sort((a, b) => {
        if (sort === "updated") return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
        if (sort === "title") return a.title.localeCompare(b.title);
        if (sort === "duration") return (a.duration || "").localeCompare(b.duration || "");
        if (sort === "status") return a.status.localeCompare(b.status);
        return 0;
      });
  }, [projects, filter, query, sort]);

  const handleRename = (id: string) => {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    setRenameVal(p.title);
    setRenaming(id);
    setMenuOpen(null);
  };

  const commitRename = (id: string) => {
    const trimmed = renameVal.trim();
    if (trimmed) {
      projectStore.updateProject(id, { title: trimmed });
      toast.success("Project renamed");
    }
    setRenaming(null);
  };

  const handleDuplicate = (id: string) => {
    projectStore.duplicateProject(id);
    toast.success("Project duplicated");
    setMenuOpen(null);
  };

  const handleDelete = async (id: string) => {
    const currentSettings = settingsStore.getSettings();
    if (currentSettings.confirmBeforeDelete) {
      const p = projects.find((x) => x.id === id);
      const title = p?.title ? `"${p.title}"` : "this project";
      const confirmed = window.confirm(`Are you sure you want to delete ${title}? This action cannot be undone.`);
      if (!confirmed) {
        setMenuOpen(null);
        return;
      }
    }
    await projectStore.deleteProject(id);
    toast.success("Project deleted");
    setMenuOpen(null);
    if (selected?.id === id) setSelected(null);
  };

  const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "processing", label: "Processing" },
    { key: "completed", label: "Completed" },
    { key: "failed", label: "Failed" },
  ];

  if (!isAuthenticated) {
    return (
      <main className="content">
        <section className="hero">
          <div>
            <small className="eyebrow">MY WORKSPACE</small>
            <h1>My Projects</h1>
            <p>Manage and continue working on your videos.</p>
          </div>
        </section>
        <div className="empty" style={{ minHeight: 350 }}>
          <div className="empty-icon"><FolderKanban /></div>
          <h3>Sign in to view your projects</h3>
          <p>Your video projects are securely associated with your account in Supabase.</p>
          <button className="primary" onClick={() => onNavigate("login")}>
            <Sparkles size={16} /> Sign In to Studio
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="content">
      {/* ── Page header ── */}
      <section className="hero">
        <div>
          <small className="eyebrow">MY WORKSPACE</small>
          <h1>My Projects</h1>
          <p>Manage and continue working on your videos.</p>
        </div>
        <button className="primary" onClick={() => onNavigate("editor")}>
          <Plus size={17} /> Create New Video
        </button>
      </section>

      {/* ── Toolbar (displayed when projects exist or search/filter is active) ── */}
      {(projects.length > 0 || query || filter !== "all") && (
        <div className="prj-toolbar">
          <label className="prj-search">
            <Search size={14} />
            <input
              placeholder="Search projects..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
            {query && (
              <button className="prj-search-clear" onClick={() => setQuery("")} aria-label="Clear">
                <X size={12} />
              </button>
            )}
          </label>

          <div className="prj-filters">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`prj-filter-btn ${filter === f.key ? "active" : ""}`}
                onClick={() => setFilter(f.key)}
              >{f.label}</button>
            ))}
          </div>

          <div className="prj-sort">
            <ArrowUpDown size={13} />
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="updated">Recently Updated</option>
              <option value="title">Name</option>
              <option value="duration">Duration</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Grid or empty state ── */}
      {projectStore.getIsLoading() ? (
        <div className="empty" style={{ minHeight: 350 }}>
          <div className="empty-icon"><FolderKanban /></div>
          <h3>Loading your projects...</h3>
          <p>Connecting to your personal workspace.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty" style={{ minHeight: 350 }}>
          <div className="empty-icon">
            {projects.length === 0 ? <FolderKanban /> : <Search />}
          </div>
          <h3>{projects.length === 0 ? "No projects yet" : "No projects found"}</h3>
          <p>
            {projects.length === 0
              ? "Create your first faceless video to see it here."
              : "Try adjusting your search or filter."}
          </p>
          {projects.length === 0 && (
            <button className="secondary" onClick={() => onNavigate("editor")}>
              <Plus size={16} />Create New Video
            </button>
          )}
        </div>
      ) : (
        <div className="prj-grid">
          {visible.map((project) => (
            <article key={project.id} className={`prj-card ${menuOpen === project.id ? "menu-active" : ""}`}>
              {/* Thumbnail */}
              <div
                className="prj-thumb"
                onClick={() => setSelected(project)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelected(project)}
                aria-label={`Open ${project.title}`}
              >
                <div className="prj-thumb-icon"><FileVideo size={26} /></div>
                <span className={`prj-badge prj-badge--${project.status}`}>
                  {statusLabel(project.status)}
                </span>
                <div className="prj-thumb-play">
                  <ChevronRight size={20} />
                </div>
              </div>

              {/* Card body */}
              <div className="prj-card-body">
                <div className="prj-card-main">
                  {renaming === project.id ? (
                    <input
                      className="prj-rename-input"
                      value={renameVal}
                      autoFocus
                      onChange={(e) => setRenameVal(e.target.value)}
                      onBlur={() => commitRename(project.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(project.id);
                        if (e.key === "Escape") setRenaming(null);
                      }}
                    />
                  ) : (
                    <h3 className="prj-title" onClick={() => setSelected(project)}>
                      {project.title}
                    </h3>
                  )}
                  <div className="prj-meta">
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    {project.duration && <span><Clock size={11} /> {project.duration}</span>}
                    {project.topic && <span>{project.topic}</span>}
                    {project.resolution && <span>{project.resolution}</span>}
                  </div>
                </div>

                {/* Action menu */}
                <div className="prj-menu-wrap" ref={menuOpen === project.id ? menuRef : undefined}>
                  <button
                    className="prj-menu-btn"
                    aria-label="Project options"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => (v === project.id ? null : project.id)); }}
                  >
                    <MoreVertical size={15} />
                  </button>
                  {menuOpen === project.id && (
                    <div className="prj-menu">
                      <button onClick={() => { setSelected(project); setMenuOpen(null); }}>Open</button>
                      <button onClick={() => handleRename(project.id)}>Rename</button>
                      <button onClick={() => handleDuplicate(project.id)}>Duplicate</button>
                      <button className="danger" onClick={() => handleDelete(project.id)}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ── Project detail modal ── */}
      {selected && (
        <div className="prj-modal-overlay" onClick={() => setSelected(null)}>
          <div className="prj-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="prj-modal-head">
              <div>
                <span className={`prj-badge prj-badge--${selected.status}`}>{statusLabel(selected.status)}</span>
                <h2>{selected.title}</h2>
              </div>
              <button className="prj-modal-close" onClick={() => setSelected(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="prj-modal-body">
              {selected.videoPath && (
                <video controls src={selected.videoPath} className="prj-modal-video" />
              )}
              <div className="prj-modal-flex">
                <div className="prj-modal-thumb">
                  <FileVideo size={32} />
                  <span>{selected.resolution || "Video"}</span>
                </div>
                <div className="prj-modal-info">
                  <div className="prj-info-row"><span>Project ID</span><b>{selected.id}</b></div>
                  <div className="prj-info-row"><span>Status</span><b>{statusLabel(selected.status)}</b></div>
                  <div className="prj-info-row"><span>Created</span><b>{new Date(selected.createdAt).toLocaleString()}</b></div>
                  <div className="prj-info-row"><span>Duration</span><b>{selected.duration || "Not rendered"}</b></div>
                  {selected.sourceVideo && <div className="prj-info-row"><span>Source Video</span><b>{selected.sourceVideo}</b></div>}
                  {selected.topic && <div className="prj-info-row"><span>Topic</span><b>{selected.topic}</b></div>}
                  {selected.error && <div className="prj-info-row"><span>Error</span><b style={{ color: "#f06a6a", fontSize: 11 }}>{selected.error}</b></div>}
                  {selected.videoPath && <div className="prj-info-row"><span>Video URL</span><b style={{ wordBreak: "break-all", fontSize: 10 }}>{selected.videoPath}</b></div>}
                </div>
              </div>
            </div>
            <div className="prj-modal-footer">
              <div className="prj-modal-actions">
                <button className="secondary" onClick={() => setSelected(null)}>Close</button>
                {selected.videoPath && selected.status === "completed" && (() => {
                  const filename = selected.videoPath.split("/").pop() || `${selected.id}.mp4`;
                  const safeTitle = (selected.title || "faceless-video").replace(/[\\/*?:"<>|]/g, "_");
                  const tokenParam = session?.access_token ? `&token=${encodeURIComponent(session.access_token)}` : "";
                  return (
                    <a
                      href={`/api/download/${filename}?title=${encodeURIComponent(safeTitle)}${tokenParam}`}
                      download={`${safeTitle}.mp4`}
                      className="primary"
                      style={{ textDecoration: "none" }}
                    >
                      <Download size={15} /> Download Video
                    </a>
                  );
                })()}
                <button className="secondary" onClick={() => { setSelected(null); onNavigate("editor"); }}>
                  <Plus size={15} /> Create New Video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Progress Page (editor, templates, media, settings, help) ──────────────────
function ProgressPage({ page, onBack }: { page: Page; onBack: () => void }) {
  const labels: Record<string, [string, React.ReactNode]> = {
    projects: ["My Projects", <FolderKanban />],
    editor: ["Video Editor", <Video />],
    templates: ["Templates", <LayoutTemplate />],
    media: ["Media Library", <Image />],
    settings: ["Settings", <Settings />],
    help: ["Help Center", <HelpCircle />],
    dashboard: ["Dashboard", <LayoutDashboard />],
  };
  const [title, icon] = labels[page] || ["Faceless Art Studio", <LayoutDashboard />];
  return (
    <main className="content">
      <div className="progress-page">
        <div className="progress-icon">{icon}</div>
        <div className="eyebrow">FACELESS ART STUDIO</div>
        <h1>{title}</h1>
        <p>Development in progress</p>
        <span>This workspace is being built and will be available in a future release.</span>
        <button className="primary" onClick={onBack}><LayoutDashboard size={17} />Back to Dashboard</button>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}