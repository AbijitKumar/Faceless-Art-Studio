import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, Bell, ChevronDown, Clock3, FolderKanban, HardDrive,
  HelpCircle, Image, LayoutDashboard, LayoutTemplate, Plus,
  Search, Settings, Sparkles, Upload, Video, CheckCircle2,
  MoreVertical, X, FileVideo, Clock, ChevronRight, ArrowUpDown,
  Download, Menu
} from "lucide-react";
import { Project, ProjectStatus, projectStore, useProjects } from "./projectStore";
import { EditorPage } from "./EditorPage";

type Page = "dashboard" | "projects" | "editor" | "templates" | "media" | "settings" | "help";

const nav: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects",  label: "My Projects",   icon: FolderKanban },
  { id: "editor",    label: "Create Video",   icon: Plus },
  { id: "templates", label: "Templates",      icon: LayoutTemplate },
  { id: "media",     label: "Media Library",  icon: Image },
];

const SEARCH_INDEX: { label: string; description: string; page: Page }[] = [
  { label: "Dashboard",      description: "Your studio overview and stats",        page: "dashboard" },
  { label: "My Projects",    description: "View all your created projects",         page: "projects"  },
  { label: "Create Video",   description: "Start a new video from a script",        page: "editor"    },
  { label: "Templates",      description: "Browse available video templates",       page: "templates" },
  { label: "Media Library",  description: "Manage your uploaded media",             page: "media"     },
  { label: "Settings",       description: "Configure your workspace preferences",   page: "settings"  },
  { label: "Help",           description: "Help center and documentation",          page: "help"      },
  { label: "Upload Media",   description: "Add source media to your library",       page: "media"     },
  { label: "Quick Actions",  description: "Jump straight into your workflow",       page: "dashboard" },
  { label: "Recent Projects",description: "Your latest creations",                 page: "projects"  },
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

// ── Shared close-on-outside-click + Escape hook ───────────────────────────────
function useCloseOnOutsideAndEsc(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") onClose();
        return;
      }
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handle);
    };
  }, [open, ref, onClose]);
}

// ── SearchDropdown ────────────────────────────────────────────────────────────
function SearchDropdown({
  query,
  onNavigate,
  onClose,
}: {
  query: string;
  onNavigate: (p: Page) => void;
  onClose: () => void;
}) {
  const q = query.toLowerCase();
  const pageResults = SEARCH_INDEX.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q),
  );

  const projectResults = projectStore.getProjects().filter(
    (p) => p.title.toLowerCase().includes(q) || (p.topic && p.topic.toLowerCase().includes(q))
  );

  const total = pageResults.length + projectResults.length;

  if (total === 0) {
    return (
      <div className="search-dropdown" role="listbox" aria-label="Search results">
        <div className="search-empty">
          <Search size={18} />
          <strong>No Results Found</strong>
          <span>Try a different search term.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="search-dropdown" role="listbox" aria-label="Search results">
      {pageResults.map((item) => {
        const Icon = nav.find((n) => n.id === item.page)?.icon ?? LayoutDashboard;
        return (
          <button
            key={`page-${item.label}`}
            className="search-result"
            role="option"
            onMouseDown={(e) => {
              e.preventDefault();
              onNavigate(item.page);
              onClose();
            }}
          >
            <span className="search-result-icon"><Icon size={15} /></span>
            <span className="search-result-text">
              <b>{item.label}</b>
              <small>{item.description}</small>
            </span>
          </button>
        );
      })}
      {projectResults.map((p) => (
        <button
          key={`proj-${p.id}`}
          className="search-result"
          role="option"
          onMouseDown={(e) => {
            e.preventDefault();
            onNavigate("projects");
            onClose();
          }}
        >
          <span className="search-result-icon"><FileVideo size={15} /></span>
          <span className="search-result-text">
            <b>{p.title}</b>
            <small>Project · {statusLabel(p.status)} {p.duration ? `· ${p.duration}` : ""}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

// ── NotifDropdown ─────────────────────────────────────────────────────────────
function NotifDropdown() {
  return (
    <div className="notif-dropdown" role="dialog" aria-label="Notifications">
      <div className="notif-head"><strong>Notifications</strong></div>
      <div className="notif-empty">
        <Bell size={18} />
        <b>No new notifications</b>
        <span>You&apos;re all caught up.</span>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const [now, setNow] = useState(Date.now());

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen,  setSearchOpen]  = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const notifWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const _time = useMemo(() => greeting(), [now]); void _time;

  const closeSearch = () => { setSearchOpen(false); setSearchQuery(""); };
  const closeNotif  = () => setNotifOpen(false);

  useCloseOnOutsideAndEsc(searchWrapRef, searchOpen, closeSearch);
  useCloseOnOutsideAndEsc(notifWrapRef,  notifOpen,  closeNotif);

  const go = (next: Page) => { setPage(next); closeSearch(); };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setSearchOpen(val.trim().length > 0);
  };

  const hasUnread = false;

  return (
    <div className="app">
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
          <div className="brand-mark" onClick={() => setSidebarExpanded((v) => !v)} style={{ cursor: "pointer" }}>
            <Video size={19} />
          </div>
          {sidebarExpanded && (
            <div className="brand-text">
              <b>Faceless Art</b>
              <span>Studio</span>
            </div>
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
        <div className="profile" onClick={() => setSidebarExpanded((v) => !v)} style={{ cursor: "pointer" }}>
          <div className="avatar">A</div>
          {sidebarExpanded && (
            <>
              <div><b>Your Studio</b><span>Personal workspace</span></div>
              <ChevronDown size={16} />
            </>
          )}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          {/* ── Search ── */}
          <div className="search-wrap" ref={searchWrapRef}>
            <label className="search">
              <Search size={16}/>
              <input
                placeholder="Search projects..."
                aria-label="Search projects"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => { if (searchQuery.trim().length > 0) setSearchOpen(true); }}
                autoComplete="off"
              />
              <kbd>⌘ K</kbd>
            </label>
            {searchOpen && (
              <SearchDropdown query={searchQuery} onNavigate={go} onClose={closeSearch} />
            )}
          </div>

          {/* ── Notifications ── */}
          <div className="notif-wrap" ref={notifWrapRef}>
            <button className="icon" aria-label="Notifications"
              onClick={() => setNotifOpen((v) => !v)}>
              <Bell size={18}/>
              {hasUnread && <i/>}
            </button>
            {notifOpen && <NotifDropdown />}
          </div>
        </header>

        {page === "dashboard"
          ? <Dashboard onNavigate={go} />
          : page === "projects"
          ? <ProjectsPage onNavigate={go} />
          : page === "editor"
          ? <EditorPage onBack={() => go("dashboard")} onNavigateProjects={() => go("projects")} />
          : <ProgressPage page={page} onBack={() => go("dashboard")} />}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const projects = useProjects();

  const completedProjects = useMemo(
    () => projects.filter((p) => p.status === "completed"),
    [projects]
  );

  const totalMinutes = useMemo(() => {
    let seconds = 0;
    completedProjects.forEach((p) => {
      if (p.duration) {
        const parts = p.duration.split(":").map((n) => parseInt(n, 10));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          seconds += parts[0] * 60 + parts[1];
        } else if (parts.length === 1 && !isNaN(parts[0])) {
          seconds += parts[0];
        }
      }
    });
    return Math.round(seconds / 60);
  }, [completedProjects]);

  const stats = [
    ["Projects Created", `${projects.length}`, FolderKanban],
    ["Videos Exported",  `${completedProjects.length}`, CheckCircle2],
    ["Minutes Rendered", `${totalMinutes}`, Clock3],
    ["Storage Used",  "0 GB", HardDrive],
  ] as const;

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
          <Plus size={17}/>Create New Video
        </button>
      </section>

      <section className="stats">
        {stats.map(([label, value, Icon]) => (
          <article className="stat" key={label}>
            <div className="stat-icon"><Icon size={19}/></div>
            <div><span>{label}</span><strong>{value}</strong></div>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="panel projects">
          <PanelHead
            title="Recent Projects"
            sub="Your latest creations will appear here."
            action={projects.length > 0 ? "View all" : undefined}
            onClick={() => onNavigate("projects")}
          />
          {projects.length === 0 ? (
            <Empty
              icon={<FolderKanban/>}
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
                    <div className="prj-mini-icon"><FileVideo size={16}/></div>
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
          <article className="panel">
            <PanelHead title="Quick Actions" sub="Jump straight into your workflow."/>
            <div className="quick">
              <button onClick={() => onNavigate("editor")}>
                <span className="qa blue"><Sparkles size={18}/></span>
                <span><b>Create Video</b><small>Start from a script</small></span>
              </button>
              <button onClick={() => onNavigate("media")}>
                <span className="qa violet"><Upload size={18}/></span>
                <span><b>Upload Media</b><small>Add source media</small></span>
              </button>
            </div>
          </article>
          <article className="panel activity">
            <PanelHead title="Recent Activity" sub="Activity from your workspace."/>
            {projects.length === 0 ? (
              <div className="activity-empty">
                <Activity size={18}/>
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
      <button className="secondary" onClick={onClick}><Plus size={16}/>{action}</button>
    </div>
  );
}

// ── Projects Page ─────────────────────────────────────────────────────────────
type SortKey = "updated" | "title" | "duration" | "status";
type FilterStatus = "all" | ProjectStatus;

function ProjectsPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const projects = useProjects();
  const [query,    setQuery]    = useState("");
  const [filter,   setFilter]   = useState<FilterStatus>("all");
  const [sort,     setSort]     = useState<SortKey>("updated");
  const [selected, setSelected] = useState<Project | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal,setRenameVal]= useState("");
  const menuRef = useRef<HTMLDivElement>(null);

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
        if (sort === "updated")  return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
        if (sort === "title")    return a.title.localeCompare(b.title);
        if (sort === "duration") return (a.duration || "").localeCompare(b.duration || "");
        if (sort === "status")   return a.status.localeCompare(b.status);
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
    }
    setRenaming(null);
  };

  const handleDuplicate = (id: string) => {
    projectStore.duplicateProject(id);
    setMenuOpen(null);
  };

  const handleDelete = (id: string) => {
    projectStore.deleteProject(id);
    setMenuOpen(null);
    if (selected?.id === id) setSelected(null);
  };

  const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: "all",        label: "All" },
    { key: "draft",      label: "Draft" },
    { key: "processing", label: "Processing" },
    { key: "completed",  label: "Completed" },
    { key: "failed",     label: "Failed" },
  ];

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
          <Plus size={17}/> Create New Video
        </button>
      </section>

      {/* ── Toolbar (displayed when projects exist or search/filter is active) ── */}
      {(projects.length > 0 || query || filter !== "all") && (
        <div className="prj-toolbar">
          <label className="prj-search">
            <Search size={14}/>
            <input
              placeholder="Search projects..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
            {query && (
              <button className="prj-search-clear" onClick={() => setQuery("")} aria-label="Clear">
                <X size={12}/>
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
            <ArrowUpDown size={13}/>
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
      {visible.length === 0 ? (
        <div className="empty" style={{minHeight:350}}>
          <div className="empty-icon">
            {projects.length === 0 ? <FolderKanban/> : <Search/>}
          </div>
          <h3>{projects.length === 0 ? "No projects yet" : "No projects found"}</h3>
          <p>
            {projects.length === 0
              ? "Create your first faceless video to see it here."
              : "Try adjusting your search or filter."}
          </p>
          {projects.length === 0 && (
            <button className="secondary" onClick={() => onNavigate("editor")}>
              <Plus size={16}/>Create New Video
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
                <div className="prj-thumb-icon"><FileVideo size={26}/></div>
                <span className={`prj-badge prj-badge--${project.status}`}>
                  {statusLabel(project.status)}
                </span>
                <div className="prj-thumb-play">
                  <ChevronRight size={20}/>
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
                    {project.duration && <span><Clock size={11}/> {project.duration}</span>}
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
                    <MoreVertical size={15}/>
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
                <X size={16}/>
              </button>
            </div>
            <div className="prj-modal-body">
              {selected.videoPath && (
                <video controls src={selected.videoPath} className="prj-modal-video" />
              )}
              <div className="prj-modal-flex">
                <div className="prj-modal-thumb">
                  <FileVideo size={32}/>
                  <span>{selected.resolution || "Video"}</span>
                </div>
                <div className="prj-modal-info">
                  <div className="prj-info-row"><span>Project ID</span><b>{selected.id}</b></div>
                  <div className="prj-info-row"><span>Status</span><b>{statusLabel(selected.status)}</b></div>
                  <div className="prj-info-row"><span>Created</span><b>{new Date(selected.createdAt).toLocaleString()}</b></div>
                  <div className="prj-info-row"><span>Duration</span><b>{selected.duration || "Not rendered"}</b></div>
                  {selected.sourceVideo && <div className="prj-info-row"><span>Source Video</span><b>{selected.sourceVideo}</b></div>}
                  {selected.topic && <div className="prj-info-row"><span>Topic</span><b>{selected.topic}</b></div>}
                  {selected.error && <div className="prj-info-row"><span>Error</span><b style={{color:"#f06a6a",fontSize:11}}>{selected.error}</b></div>}
                  {selected.videoPath && <div className="prj-info-row"><span>Video URL</span><b style={{wordBreak:"break-all",fontSize:10}}>{selected.videoPath}</b></div>}
                </div>
              </div>
            </div>
            <div className="prj-modal-footer">
              <div className="prj-modal-actions">
                <button className="secondary" onClick={() => setSelected(null)}>Close</button>
                {selected.videoPath && selected.status === "completed" && (() => {
                  const filename = selected.videoPath.split("/").pop() || `${selected.id}.mp4`;
                  const safeTitle = (selected.title || "faceless-video").replace(/[\\/*?:"<>|]/g, "_");
                  return (
                    <a
                      href={`/api/download/${filename}?title=${encodeURIComponent(safeTitle)}`}
                      download={`${safeTitle}.mp4`}
                      className="primary"
                      style={{ textDecoration: "none" }}
                    >
                      <Download size={15} /> Download Video
                    </a>
                  );
                })()}
                <button className="secondary" onClick={() => { setSelected(null); onNavigate("editor"); }}>
                  <Plus size={15}/> Create New Video
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
  const labels: Record<Page, [string, React.ReactNode]> = {
    projects:  ["My Projects",   <FolderKanban/>],
    editor:    ["Video Editor",  <Video/>],
    templates: ["Templates",     <LayoutTemplate/>],
    media:     ["Media Library", <Image/>],
    settings:  ["Settings",      <Settings/>],
    help:      ["Help Center",   <HelpCircle/>],
    dashboard: ["Dashboard",     <LayoutDashboard/>],
  };
  const [title, icon] = labels[page];
  return (
    <main className="content">
      <div className="progress-page">
        <div className="progress-icon">{icon}</div>
        <div className="eyebrow">FACELESS ART STUDIO</div>
        <h1>{title}</h1>
        <p>Development in progress</p>
        <span>This workspace is being built and will be available in a future release.</span>
        <button className="primary" onClick={onBack}><LayoutDashboard size={17}/>Back to Dashboard</button>
      </div>
    </main>
  );
}

export default App;