import { useState, useEffect } from "react";
import {
  Moon,
  Sun,
  Monitor,
  ExternalLink,
  ShieldAlert,
  Bug,
  Check,
  Info,
  LogOut,
  UserCheck,
  Sparkles,
} from "lucide-react";
import {
  settingsStore,
  useSettings,
  AVATAR_COLORS,
  ThemeMode,
  LandingPage,
} from "./settingsStore";
import { useAuth } from "./auth/useAuth";

interface SettingsPageProps {
  onNavigateHelp: (targetSection?: "about" | "video-flow" | "bug-report") => void;
  onNavigateAuth?: (page: string) => void;
}

export function SettingsPage({ onNavigateHelp, onNavigateAuth }: SettingsPageProps) {
  const settings = useSettings();
  const { user, profile, isAuthenticated, updateProfile, signOut } = useAuth();

  const currentDisplayName = isAuthenticated
    ? profile?.display_name || user?.user_metadata?.display_name || user?.email?.split("@")[0] || ""
    : settings.displayName;

  const currentAvatarColor = isAuthenticated
    ? profile?.avatar_color || settings.avatarColor
    : settings.avatarColor;

  const [nameInput, setNameInput] = useState(currentDisplayName);
  const [savedBadge, setSavedBadge] = useState(false);

  useEffect(() => {
    setNameInput(currentDisplayName);
  }, [currentDisplayName]);

  const handleNameChange = (val: string) => {
    setNameInput(val);
    if (isAuthenticated) {
      updateProfile({ display_name: val });
    }
    settingsStore.updateSettings({ displayName: val });
    showSavedFeedback();
  };

  const handleAvatarColorChange = (color: string) => {
    if (isAuthenticated) {
      updateProfile({ avatar_color: color });
    }
    settingsStore.updateSettings({ avatarColor: color });
    showSavedFeedback();
  };

  const handleThemeChange = (theme: ThemeMode) => {
    settingsStore.updateSettings({ theme });
    showSavedFeedback();
  };

  const handleAutoSaveToggle = () => {
    settingsStore.updateSettings({ autoSaveProjects: !settings.autoSaveProjects });
    showSavedFeedback();
  };

  const handleConfirmDeleteToggle = () => {
    settingsStore.updateSettings({ confirmBeforeDelete: !settings.confirmBeforeDelete });
    showSavedFeedback();
  };

  const handleLandingPageChange = (val: LandingPage) => {
    settingsStore.updateSettings({ defaultLandingPage: val });
    showSavedFeedback();
  };

  const handleEmailNotifToggle = () => {
    settingsStore.updateSettings({ emailNotifications: !settings.emailNotifications });
    showSavedFeedback();
  };

  const showSavedFeedback = () => {
    setSavedBadge(true);
    window.setTimeout(() => setSavedBadge(false), 1800);
  };

  // Derive user initials
  const initials = (nameInput.trim() || currentDisplayName || "A")
    .slice(0, 2)
    .toUpperCase();

  // Dynamic application version from Vite / git describe or package metadata
  const appVersion = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "";

  return (
    <main className="content settings-content">
      {/* ── Header ── */}
      <section className="hero">
        <div>
          <small className="eyebrow">PREFERENCES & CONFIGURATION</small>
          <h1>Settings</h1>
          <p>Manage your account, workspace preferences, and appearance.</p>
        </div>
        {savedBadge && (
          <div className="settings-saved-pill" role="status" aria-live="polite">
            <Check size={14} /> Profile updated
          </div>
        )}
      </section>

      <div className="settings-stack">
        {/* ── 1. ACCOUNT ── */}
        <article className="panel settings-section">
          <div className="settings-sec-head">
            <h2>Account</h2>
            <p>
              {isAuthenticated
                ? "Manage your authenticated Supabase user profile."
                : "Personalize your workspace profile or sign in."}
            </p>
          </div>

          <div className="settings-grid">
            {/* Display Name */}
            <div className="settings-row">
              <div className="settings-label">
                <strong>Display Name</strong>
                <span>The name shown across your studio workspace.</span>
              </div>
              <div className="settings-control">
                <input
                  type="text"
                  className="settings-input"
                  value={nameInput}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Enter display name"
                  maxLength={40}
                  aria-label="Display Name"
                />
              </div>
            </div>

            {/* Email Address (Strictly Read-Only) */}
            <div className="settings-row">
              <div className="settings-label">
                <strong>Registered Email</strong>
                <span>Your workspace account identifier.</span>
              </div>
              <div className="settings-control">
                <input
                  type="email"
                  className="settings-input settings-input--readonly"
                  value={isAuthenticated ? user?.email || "" : "Guest (Not signed in)"}
                  readOnly
                  aria-label="Registered Email"
                />
                <small className="settings-note">
                  {isAuthenticated ? (
                    <span style={{ color: "#4ADE80", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <UserCheck size={13} />
                      Verified via Supabase Authentication. Managed by auth provider.
                    </span>
                  ) : (
                    <span style={{ color: "#94A3B8", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <Info size={13} />
                      Not signed in.
                      {onNavigateAuth && (
                        <button
                          type="button"
                          onClick={() => onNavigateAuth("login")}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#1E8CFA",
                            padding: 0,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          Sign in to your account
                        </button>
                      )}
                    </span>
                  )}
                </small>
              </div>
            </div>

            {/* Profile Avatar */}
            <div className="settings-row">
              <div className="settings-label">
                <strong>Profile Avatar</strong>
                <span>Initials badge displayed in your studio sidebar.</span>
              </div>
              <div className="settings-control">
                <div className="avatar-preview-wrap">
                  <div
                    className="avatar-preview-badge"
                    style={{ background: currentAvatarColor }}
                    aria-label="Avatar preview"
                  >
                    {initials}
                  </div>
                  <div className="avatar-color-picker">
                    <span className="avatar-picker-label">Accent Color:</span>
                    <div className="avatar-colors-row">
                      {AVATAR_COLORS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`avatar-color-btn ${currentAvatarColor === c.value ? "active" : ""}`}
                          style={{ backgroundColor: c.value }}
                          onClick={() => handleAvatarColorChange(c.value)}
                          title={c.label}
                          aria-label={c.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Actions (Sign In / Sign Out) */}
            <div className="settings-row">
              <div className="settings-label">
                <strong>Account Session</strong>
                <span>
                  {isAuthenticated
                    ? `Currently signed in as ${user?.email || "User"}`
                    : "Sign in to access video generation and save account preferences."}
                </span>
              </div>
              <div className="settings-control">
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => signOut()}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      backgroundColor: "rgba(239, 68, 68, 0.12)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: 8,
                      padding: "8px 16px",
                      color: "#FCA5A5",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <LogOut size={15} /> Sign Out
                  </button>
                ) : (
                  onNavigateAuth && (
                    <button
                      type="button"
                      onClick={() => onNavigateAuth("login")}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        backgroundColor: "#1E8CFA",
                        border: "none",
                        borderRadius: 8,
                        padding: "8px 16px",
                        color: "#FFFFFF",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <Sparkles size={15} /> Sign In / Sign Up
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </article>

        {/* ── 2. APPEARANCE ── */}
        <article className="panel settings-section">
          <div className="settings-sec-head">
            <h2>Appearance</h2>
            <p>Customize how Faceless Art Studio looks on your display.</p>
          </div>

          <div className="settings-row">
            <div className="settings-label">
              <strong>Theme</strong>
              <span>Select dark, light, or sync with your operating system.</span>
            </div>
            <div className="settings-control">
              <div className="theme-toggle-group" role="radiogroup" aria-label="Theme mode">
                <button
                  type="button"
                  className={`theme-opt-btn ${settings.theme === "dark" ? "active" : ""}`}
                  onClick={() => handleThemeChange("dark")}
                  role="radio"
                  aria-checked={settings.theme === "dark"}
                >
                  <Moon size={15} />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  className={`theme-opt-btn ${settings.theme === "light" ? "active" : ""}`}
                  onClick={() => handleThemeChange("light")}
                  role="radio"
                  aria-checked={settings.theme === "light"}
                >
                  <Sun size={15} />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  className={`theme-opt-btn ${settings.theme === "system" ? "active" : ""}`}
                  onClick={() => handleThemeChange("system")}
                  role="radio"
                  aria-checked={settings.theme === "system"}
                >
                  <Monitor size={15} />
                  <span>System</span>
                </button>
              </div>
            </div>
          </div>
        </article>

        {/* ── 3. PREFERENCES ── */}
        <article className="panel settings-section">
          <div className="settings-sec-head">
            <h2>Preferences</h2>
            <p>Configure project workflow and editing behaviors.</p>
          </div>

          <div className="settings-grid">
            {/* Auto-save Projects */}
            <div className="settings-row">
              <div className="settings-label">
                <strong>Auto-save Projects</strong>
                <span>Automatically save video editor script and title drafts locally.</span>
              </div>
              <div className="settings-control">
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.autoSaveProjects}
                  className={`switch-btn ${settings.autoSaveProjects ? "active" : ""}`}
                  onClick={handleAutoSaveToggle}
                >
                  <span className="switch-thumb" />
                  <span className="switch-text">{settings.autoSaveProjects ? "ON" : "OFF"}</span>
                </button>
              </div>
            </div>

            {/* Confirm Before Delete */}
            <div className="settings-row">
              <div className="settings-label">
                <strong>Confirm Before Delete</strong>
                <span>Ask for confirmation before permanently deleting a project from My Projects.</span>
              </div>
              <div className="settings-control">
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.confirmBeforeDelete}
                  className={`switch-btn ${settings.confirmBeforeDelete ? "active" : ""}`}
                  onClick={handleConfirmDeleteToggle}
                >
                  <span className="switch-thumb" />
                  <span className="switch-text">{settings.confirmBeforeDelete ? "ON" : "OFF"}</span>
                </button>
              </div>
            </div>

            {/* Default Landing Page */}
            <div className="settings-row">
              <div className="settings-label">
                <strong>Default Landing Page</strong>
                <span>Choose which screen opens when Faceless Art Studio loads.</span>
              </div>
              <div className="settings-control">
                <select
                  className="settings-select"
                  value={settings.defaultLandingPage}
                  onChange={(e) => handleLandingPageChange(e.target.value as LandingPage)}
                  aria-label="Default Landing Page"
                >
                  <option value="dashboard">Dashboard</option>
                  <option value="projects">My Projects</option>
                  <option value="editor">Create Video</option>
                </select>
              </div>
            </div>

            {/* Language */}
            <div className="settings-row">
              <div className="settings-label">
                <strong>Language</strong>
                <span>Interface language for your studio workspace.</span>
              </div>
              <div className="settings-control">
                <select
                  className="settings-select"
                  value={settings.language}
                  disabled
                  aria-label="Language"
                >
                  <option value="English">English</option>
                </select>
              </div>
            </div>
          </div>
        </article>

        {/* ── 4. NOTIFICATIONS ── */}
        <article className="panel settings-section">
          <div className="settings-sec-head">
            <h2>Notifications</h2>
            <p>Control communication preferences for application announcements.</p>
          </div>

          <div className="settings-row">
            <div className="settings-label">
              <strong>Email Notifications</strong>
              <span>
                Receive important application updates and announcements at{" "}
                <code>{isAuthenticated ? user?.email : settings.email}</code>.
              </span>
            </div>
            <div className="settings-control">
              <button
                type="button"
                role="switch"
                aria-checked={settings.emailNotifications}
                className={`switch-btn ${settings.emailNotifications ? "active" : ""}`}
                onClick={handleEmailNotifToggle}
              >
                <span className="switch-thumb" />
                <span className="switch-text">{settings.emailNotifications ? "ON" : "OFF"}</span>
              </button>
              <small className="settings-note">
                <ShieldAlert size={13} />
                Stored as a user preference. Notifications will be delivered when an email backend is connected.
              </small>
            </div>
          </div>
        </article>

        {/* ── 5. ABOUT ── */}
        <article className="panel settings-section">
          <div className="settings-sec-head">
            <h2>About</h2>
            <p>Application version details and resources.</p>
          </div>

          <div className="about-card">
            <div className="about-header">
              <div className="about-brand">
                <h3>Faceless Art Studio</h3>
                {appVersion && <span className="about-version-badge">{appVersion}</span>}
              </div>
              <p className="about-desc">
                AI-powered faceless short-video generation platform — from script to finished vertical video.
              </p>
            </div>

            <div className="about-actions">
              <a
                href="https://github.com/AbijitKumar/Faceless-Art-Studio"
                target="_blank"
                rel="noopener noreferrer"
                className="secondary about-link-btn"
              >
                <ExternalLink size={14} /> GitHub Repository
              </a>
              <button
                type="button"
                className="secondary about-link-btn"
                onClick={() => onNavigateHelp("bug-report")}
              >
                <Bug size={14} /> Report a Problem
              </button>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
