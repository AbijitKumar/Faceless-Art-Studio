import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, Bell, ChevronDown, Clock3, FolderKanban, HardDrive,
  HelpCircle, Image, LayoutDashboard, LayoutTemplate, Plus,
  Search, Settings, Sparkles, Upload, Video, CheckCircle2
} from "lucide-react";

type Page = "dashboard" | "projects" | "editor" | "templates" | "media" | "settings" | "help";

const nav: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects",  label: "My Projects",   icon: FolderKanban },
  { id: "editor",    label: "Create Video",   icon: Plus },
  { id: "templates", label: "Templates",      icon: LayoutTemplate },
  { id: "media",     label: "Media Library",  icon: Image },
];

// Search index — derived only from real pages / labels that exist in v1.2
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
  const results = SEARCH_INDEX.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q),
  );

  return (
    <div className="search-dropdown" role="listbox" aria-label="Search results">
      {results.length === 0 ? (
        <div className="search-empty">
          <Search size={18} />
          <strong>No Results Found</strong>
          <span>Try a different search term.</span>
        </div>
      ) : (
        results.map((item) => {
          const Icon = nav.find((n) => n.id === item.page)?.icon ?? LayoutDashboard;
          return (
            <button
              key={item.label}
              className="search-result"
              role="option"
              onMouseDown={(e) => {
                e.preventDefault(); // keep input focus alive until navigation
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
        })
      )}
    </div>
  );
}

// ── NotifDropdown ─────────────────────────────────────────────────────────────
function NotifDropdown() {
  // No real notifications exist in v1.2 — honest empty state
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

  // keep time reactive to clock updates
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

  // No real unread notifications exist in v1.2 — indicator hidden
  const hasUnread = false;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Video size={19}/></div>
          <div><b>Faceless Art</b><span>Studio</span></div>
        </div>
        <section className="nav-section">
          <small>WORKSPACE</small>
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => go(id)}
              className={`nav-item ${page === id ? "active" : ""} ${id === "editor" ? "create" : ""}`}>
              <Icon size={19}/><span>{label}</span>
            </button>
          ))}
        </section>
        <section className="nav-section system">
          <small>SYSTEM</small>
          <button onClick={() => go("settings")} className={`nav-item ${page === "settings" ? "active" : ""}`}>
            <Settings size={19}/><span>Settings</span>
          </button>
          <button onClick={() => go("help")} className={`nav-item ${page === "help" ? "active" : ""}`}>
            <HelpCircle size={19}/><span>Help</span>
          </button>
        </section>
        <div className="profile">
          <div className="avatar">A</div>
          <div><b>Your Studio</b><span>Personal workspace</span></div>
          <ChevronDown size={16}/>
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
          : <ProgressPage page={page} onBack={() => go("dashboard")} />}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const stats = [
    ["Projects Created", "0", FolderKanban],
    ["Videos Exported",  "0", CheckCircle2],
    ["Minutes Rendered", "0", Clock3],
    ["Storage Used",  "0 GB", HardDrive],
  ] as const;

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
          <PanelHead title="Recent Projects" sub="Your latest creations will appear here."
            action="View all" onClick={() => onNavigate("projects")}/>
          <Empty icon={<FolderKanban/>} title="No projects yet"
            text="Create your first video and it will appear here."
            action="Create your first video" onClick={() => onNavigate("editor")}/>
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
            <div className="activity-empty">
              <Activity size={18}/>
              <div><b>No recent activity</b><span>Your projects and exports will appear here.</span></div>
            </div>
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