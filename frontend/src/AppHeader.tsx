import React, { useRef, useState, useEffect } from "react";
import {
  Bell,
  ChevronDown,
  FileVideo,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  Check,
  CheckCheck,
} from "lucide-react";
import logoSrc from "./assets/logo.png";
import { useAuth } from "./auth/AuthContext";
import { useNotifications } from "./useNotifications";
import { AppNotification } from "./notificationService";
import { projectStore } from "./projectStore";
import { useSettings } from "./settingsStore";

export type Page =
  | "dashboard"
  | "projects"
  | "editor"
  | "templates"
  | "media"
  | "settings"
  | "help"
  | "login"
  | "signup"
  | "forgot-password"
  | "reset-password";

interface AppHeaderProps {
  activePage: Page;
  onNavigate: (page: Page, targetProjectId?: string) => void;
  onToggleSidebar?: () => void;
}

const SEARCH_INDEX: { label: string; description: string; page: Page }[] = [
  { label: "Dashboard", description: "Your studio overview and stats", page: "dashboard" },
  { label: "My Projects", description: "View all your created projects", page: "projects" },
  { label: "Create Video", description: "Start a new video from a script", page: "editor" },
  { label: "Templates", description: "Browse available video templates", page: "templates" },
  { label: "Media Library", description: "Manage your uploaded media", page: "media" },
  { label: "Settings", description: "Configure your workspace preferences", page: "settings" },
  { label: "Help", description: "Help center and documentation", page: "help" },
  { label: "Upload Media", description: "Add source media to your library", page: "media" },
  { label: "Quick Actions", description: "Jump straight into your workflow", page: "dashboard" },
  { label: "Recent Projects", description: "Your latest creations", page: "projects" },
];

function useCloseOnOutsideAndEsc(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void
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

export function AppHeader({ activePage, onNavigate, onToggleSidebar }: AppHeaderProps) {
  const { user, profile, isAuthenticated, signOut } = useAuth();
  const settings = useSettings();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  // Notifications dropdown state
  const [notifOpen, setNotifOpen] = useState(false);
  const notifWrapRef = useRef<HTMLDivElement>(null);

  // User menu dropdown state
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };
  const closeNotif = () => setNotifOpen(false);
  const closeUserMenu = () => setUserMenuOpen(false);

  useCloseOnOutsideAndEsc(searchWrapRef, searchOpen, closeSearch);
  useCloseOnOutsideAndEsc(notifWrapRef, notifOpen, closeNotif);
  useCloseOnOutsideAndEsc(userMenuRef, userMenuOpen, closeUserMenu);

  const userDisplayName = isAuthenticated
    ? profile?.display_name || user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Creator"
    : settings.displayName || "Guest Creator";

  const userAvatarColor = isAuthenticated
    ? profile?.avatar_color || settings.avatarColor
    : settings.avatarColor;

  const userInitials = (userDisplayName.trim() || "C").slice(0, 2).toUpperCase();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setSearchOpen(val.trim().length > 0);
  };

  // Keyboard shortcut Cmd/Ctrl + K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const input = searchWrapRef.current?.querySelector("input");
        input?.focus();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const q = searchQuery.toLowerCase().trim();
  const pageResults = q
    ? SEARCH_INDEX.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      )
    : [];

  const projectResults = q
    ? projectStore
        .getProjects()
        .filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            (p.topic && p.topic.toLowerCase().includes(q))
        )
    : [];

  return (
    <header className="app-header">
      {/* ── LEFT: Logo & App Name ── */}
      <div className="app-header-left">
        {onToggleSidebar && (
          <button
            className="app-header-menu-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
            title="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
        )}
        <div
          className="app-header-brand"
          onClick={() => onNavigate("dashboard")}
          role="button"
          tabIndex={0}
          title="Faceless Art Studio Home"
        >
          <img
            src={logoSrc}
            alt="Faceless Art Studio"
            className="app-header-logo"
          />
          <span className="app-header-title">Faceless Art Studio</span>
        </div>
      </div>

      {/* ── CENTER: Search Bar ── */}
      <div className="app-header-center" ref={searchWrapRef}>
        <div className="app-search-wrap">
          <label className="app-search-box">
            <Search size={15} className="app-search-icon" />
            <input
              placeholder="Search projects & pages..."
              aria-label="Search projects and pages"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => {
                if (searchQuery.trim().length > 0) setSearchOpen(true);
              }}
              autoComplete="off"
            />
            <kbd className="app-search-kbd">⌘ K</kbd>
          </label>

          {searchOpen && (
            <div className="search-dropdown" role="listbox" aria-label="Search results">
              {pageResults.length === 0 && projectResults.length === 0 ? (
                <div className="search-empty">
                  <Search size={18} />
                  <strong>No Results Found</strong>
                  <span>Try searching for projects, templates, or settings.</span>
                </div>
              ) : (
                <>
                  {pageResults.map((item) => (
                    <button
                      key={`page-${item.label}`}
                      className="search-result"
                      role="option"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onNavigate(item.page);
                        closeSearch();
                      }}
                    >
                      <span className="search-result-icon">
                        <LayoutDashboard size={15} />
                      </span>
                      <span className="search-result-text">
                        <b>{item.label}</b>
                        <small>{item.description}</small>
                      </span>
                    </button>
                  ))}
                  {projectResults.map((p) => (
                    <button
                      key={`proj-${p.id}`}
                      className="search-result"
                      role="option"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onNavigate("projects", p.id);
                        closeSearch();
                      }}
                    >
                      <span className="search-result-icon">
                        <FileVideo size={15} />
                      </span>
                      <span className="search-result-text">
                        <b>{p.title}</b>
                        <small>
                          Project · {p.status} {p.duration ? `· ${p.duration}` : ""}
                        </small>
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Notification & Profile / Sign In ── */}
      <div className="app-header-right">
        {/* Notification Bell with Persistent Unread State */}
        <div className="notif-wrap" ref={notifWrapRef}>
          <button
            className={`app-notif-btn ${unreadCount > 0 ? "has-unread" : ""}`}
            aria-label="Notifications"
            onClick={() => setNotifOpen((v) => !v)}
            title={
              unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                : "Notifications"
            }
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="app-notif-badge">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="notif-dropdown" role="dialog" aria-label="Notifications">
              <div className="notif-head">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <strong>Notifications</strong>
                    {unreadCount > 0 && (
                      <span className="notif-unread-count-pill">{unreadCount} unread</span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      className="notif-mark-all-btn"
                      onClick={() => markAllAsRead()}
                      title="Mark all as read"
                    >
                      <CheckCheck size={13} /> Mark all read
                    </button>
                  )}
                </div>
              </div>

              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    <Bell size={20} />
                    <b>No notifications yet</b>
                    <span>When you generate videos, updates will appear here.</span>
                  </div>
                ) : (
                  notifications.map((notif: AppNotification) => (
                    <div
                      key={notif.id}
                      className={`notif-item ${notif.isRead ? "read" : "unread"}`}
                      onClick={() => {
                        if (!notif.isRead) {
                          markAsRead(notif.id);
                        }
                        if (notif.projectId) {
                          onNavigate("projects", notif.projectId);
                          setNotifOpen(false);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="notif-item-icon">
                        <FileVideo size={16} />
                      </div>
                      <div className="notif-item-body">
                        <div className="notif-item-title-row">
                          <b>{notif.title}</b>
                          {!notif.isRead && <span className="notif-unread-dot" />}
                        </div>
                        <p>{notif.message}</p>
                        <time>{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile / Avatar OR Sign In Button */}
        {isAuthenticated ? (
          <div style={{ position: "relative" }} ref={userMenuRef}>
            <button
              className="topbar-user-btn"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-label="User account menu"
            >
              <div
                className="header-avatar"
                style={{ background: userAvatarColor }}
              >
                {userInitials}
              </div>
              <span className="header-username">{userDisplayName}</span>
              <ChevronDown size={14} color="#94A3B8" />
            </button>

            {userMenuOpen && (
              <div className="header-user-dropdown" role="menu">
                <div className="user-dropdown-info">
                  <div className="header-avatar" style={{ background: userAvatarColor, width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>
                    {userInitials}
                  </div>
                  <div className="user-dropdown-info-text">
                    <div className="user-dropdown-name">{userDisplayName}</div>
                    <div className="user-dropdown-email">{user?.email || ""}</div>
                  </div>
                </div>
                <div className="user-dropdown-actions">
                  <button
                    onClick={() => {
                      onNavigate("settings");
                      closeUserMenu();
                    }}
                  >
                    <Settings size={15} /> Workspace Settings
                  </button>
                  <button
                    onClick={() => {
                      onNavigate("help");
                      closeUserMenu();
                    }}
                  >
                    <HelpCircle size={15} /> Help & Documentation
                  </button>
                </div>
                <div className="user-dropdown-footer">
                  <button
                    onClick={() => {
                      signOut();
                      closeUserMenu();
                    }}
                    className="danger-btn"
                  >
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            className="primary header-signin-action"
            onClick={() => onNavigate("login")}
            title="Sign in to your account"
          >
            <Sparkles size={14} /> Sign In
          </button>
        )}
      </div>
    </header>
  );
}
