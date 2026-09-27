import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowUpDown,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileCode,
  FileText,
  FileVideo,
  Film,
  HardDrive,
  Headphones,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  List,
  MoreVertical,
  Music,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Video,
  Volume2,
  X,
} from "lucide-react";
import {
  fetchMediaAssets,
  fetchSubtitleContent,
  formatBytes,
  formatDate,
  formatRelativeTime,
  MediaAsset,
  MediaCategory,
  MediaSummary,
  MediaType,
  parseSubtitleCues,
  SubtitleCue,
  uploadMediaAsset,
} from "./mediaApi";
import { useProjects } from "./projectStore";
import { useAuth } from "./auth/AuthContext";
import { useToast } from "./ToastContext";

export interface MediaLibraryPageProps {
  onUseInEditor: (asset: MediaAsset) => void;
  onNavigateEditor: () => void;
  onNavigateProjects: () => void;
}

type FilterType = "all" | "video" | "audio" | "subtitle" | "image" | "input" | "output";
type SortOption = "recent" | "name_asc" | "name_desc" | "size_desc" | "size_asc" | "type";
type ViewMode = "grid" | "list";

export function MediaLibraryPage({
  onUseInEditor,
  onNavigateEditor,
  onNavigateProjects,
}: MediaLibraryPageProps) {
  const projects = useProjects();

  // ── State ───────────────────────────────────────────────────────────────────
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [summary, setSummary] = useState<MediaSummary>({
    total: 0,
    videos: 0,
    audio: 0,
    subtitles: 0,
    images: 0,
    totalSizeBytes: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("video");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return (localStorage.getItem("faceless_media_view") as ViewMode) || "grid";
    } catch {
      return "grid";
    }
  });

  // Action Menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Audio Playback Coordination (only one audio playing at a time)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Preview Modal
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [rawSubtitleText, setRawSubtitleText] = useState<string>("");
  const [isLoadingSubtitle, setIsLoadingSubtitle] = useState(false);
  const [subtitleViewMode, setSubtitleViewMode] = useState<"cues" | "raw">("cues");
  const [subtitleSearch, setSubtitleSearch] = useState("");

  // Upload Modal / State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessName, setUploadSuccessName] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const filePickerRef = useRef<HTMLInputElement>(null);

  // Toast / Copy Notification
  const toast = useToast();

  const { session } = useAuth();

  // ── Load Media Assets ───────────────────────────────────────────────────────
  const loadMedia = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const data = await fetchMediaAssets(session?.access_token);
      setAssets(data.assets);
      setSummary(data.summary);
    } catch (err: any) {
      console.error("Failed to load media:", err);
      setError(err.message || "Couldn't load your media library from the server.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, [session?.access_token]);

  // ── Persist View Mode ───────────────────────────────────────────────────────
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("faceless_media_view", mode);
    } catch {
      // ignore localStorage errors
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
    setOpenMenuId(null);
  };

  // ── Close Menus and Modals on Outside Click / Escape ─────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuId(null);
        if (previewAsset) setPreviewAsset(null);
        if (isUploadOpen) setIsUploadOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [previewAsset, isUploadOpen]);

  // ── Subtitle Loading for Preview Modal ──────────────────────────────────────
  useEffect(() => {
    if (!previewAsset || previewAsset.type !== "subtitle") {
      setSubtitleCues([]);
      setRawSubtitleText("");
      return;
    }

    setIsLoadingSubtitle(true);
    fetchSubtitleContent(previewAsset.url)
      .then((content) => {
        setRawSubtitleText(content);
        const cues = parseSubtitleCues(content, previewAsset.extension);
        setSubtitleCues(cues);
      })
      .catch((err) => {
        console.error("Failed to load subtitle:", err);
        setRawSubtitleText("Failed to load subtitle content.");
      })
      .finally(() => {
        setIsLoadingSubtitle(false);
      });
  }, [previewAsset]);

  // ── Audio Playback Management ───────────────────────────────────────────────
  const handleToggleAudio = (asset: MediaAsset) => {
    if (playingAudioId === asset.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(asset.url);
      audioPlayerRef.current = audio;

      audio.onloadedmetadata = () => {
        setAudioDuration(audio.duration || 0);
      };

      audio.ontimeupdate = () => {
        setAudioProgress(audio.currentTime);
      };

      audio.onended = () => {
        setPlayingAudioId(null);
        setAudioProgress(0);
      };

      audio.play().catch((err) => console.error("Audio playback error:", err));
      setPlayingAudioId(asset.id);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  // ── Project Association Lookup ──────────────────────────────────────────────
  const assetProjectMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) {
      if (p.videoPath) {
        const name = p.videoPath.split("/").pop();
        if (name) map.set(name, p.title);
      }
      if (p.voiceoverPath) {
        const name = p.voiceoverPath.split("/").pop();
        if (name) map.set(name, p.title);
      }
      if (p.subtitlesPath) {
        const name = p.subtitlesPath.split("/").pop();
        if (name) map.set(name, p.title);
      }
    }
    return map;
  }, [projects]);

  // ── Filter & Sort Assets ────────────────────────────────────────────────────
  const filteredAssets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return assets
      .filter((asset) => {
        // Category / Type filter
        if (activeFilter === "video" && asset.type !== "video") return false;
        if (activeFilter === "audio" && asset.type !== "audio") return false;
        if (activeFilter === "subtitle" && asset.type !== "subtitle") return false;
        if (activeFilter === "image" && asset.type !== "image") return false;
        if (activeFilter === "input" && asset.category !== "input") return false;
        if (activeFilter === "output" && asset.category === "input") return false;

        // Search Query
        if (query) {
          const nameMatch = asset.name.toLowerCase().includes(query);
          const extMatch = asset.extension.toLowerCase().includes(query);
          const catMatch = asset.category.toLowerCase().includes(query);
          const projectTitle = assetProjectMap.get(asset.name) || "";
          const projMatch = projectTitle.toLowerCase().includes(query);

          if (!nameMatch && !extMatch && !catMatch && !projMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "recent") return b.modified - a.modified;
        if (sortBy === "name_asc") return a.name.localeCompare(b.name);
        if (sortBy === "name_desc") return b.name.localeCompare(a.name);
        if (sortBy === "size_desc") return b.size - a.size;
        if (sortBy === "size_asc") return a.size - b.size;
        if (sortBy === "type") return a.type.localeCompare(b.type);
        return 0;
      });
  }, [assets, searchQuery, activeFilter, sortBy, assetProjectMap]);

  // ── Subtitle Cues Filter ────────────────────────────────────────────────────
  const filteredSubtitleCues = useMemo(() => {
    if (!subtitleSearch.trim()) return subtitleCues;
    const q = subtitleSearch.toLowerCase();
    return subtitleCues.filter((c) => c.text.toLowerCase().includes(q));
  }, [subtitleCues, subtitleSearch]);

  // ── Upload Handler ──────────────────────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setUploadSuccessName(null);
    setIsUploading(true);

    try {
      const res = await uploadMediaAsset(file, session?.access_token);
      setUploadSuccessName(res.name || file.name);
      toast.success(`Uploaded ${res.name || file.name} successfully!`);
      // Reload media library
      await loadMedia(true);
      setTimeout(() => {
        setIsUploadOpen(false);
        setUploadSuccessName(null);
      }, 1200);
    } catch (err: any) {
      setUploadError(err.message || "Upload failed. Please check file format.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // ── Filter Counts ───────────────────────────────────────────────────────────
  const inputCount = useMemo(() => assets.filter((a) => a.category === "input").length, [assets]);
  const outputCount = useMemo(() => assets.filter((a) => a.category !== "input").length, [assets]);

  return (
    <main className="content media-page-root">

      {/* ── 1. Page Header ────────────────────────────────────────────────────── */}
      <section className="media-hero">
        <div className="media-hero-content">
          <small className="eyebrow">MEDIA LIBRARY</small>
          <h1 className="media-hero-title">Your creative assets.</h1>
          <p className="media-hero-desc">
            Everything you use to create, edit and publish your faceless videos — in one place.
          </p>
        </div>

        <div className="media-hero-actions">
          <button
            className="secondary media-refresh-btn"
            onClick={() => loadMedia(true)}
            disabled={isRefreshing}
            title="Refresh library assets"
          >
            <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          <button
            className="primary media-import-btn"
            onClick={() => setIsUploadOpen(true)}
            title="Import media into library"
          >
            <Upload size={16} />
            <span>Import Media</span>
          </button>
        </div>
      </section>

      {/* ── 2. Storage / Library Summary Cards ─────────────────────────────────── */}
      <section className="media-summary-grid">
        <article className="media-stat-card" onClick={() => setActiveFilter("all")}>
          <div className="media-stat-icon blue">
            <Layers size={20} />
          </div>
          <div className="media-stat-details">
            <span className="media-stat-label">All Assets</span>
            <strong className="media-stat-value">{summary.total}</strong>
            <small className="media-stat-sub">Discovered in workspace</small>
          </div>
        </article>

        <article className="media-stat-card" onClick={() => setActiveFilter("video")}>
          <div className="media-stat-icon violet">
            <Film size={20} />
          </div>
          <div className="media-stat-details">
            <span className="media-stat-label">Videos</span>
            <strong className="media-stat-value">{summary.videos}</strong>
            <small className="media-stat-sub">Source clips & rendered MP4s</small>
          </div>
        </article>

        <article className="media-stat-card" onClick={() => setActiveFilter("audio")}>
          <div className="media-stat-icon cyan">
            <Headphones size={20} />
          </div>
          <div className="media-stat-details">
            <span className="media-stat-label">Audio</span>
            <strong className="media-stat-value">{summary.audio}</strong>
            <small className="media-stat-sub">Generated AI voiceovers</small>
          </div>
        </article>

        <article className="media-stat-card" onClick={() => setActiveFilter("subtitle")}>
          <div className="media-stat-icon amber">
            <FileText size={20} />
          </div>
          <div className="media-stat-details">
            <span className="media-stat-label">Subtitles</span>
            <strong className="media-stat-value">{summary.subtitles}</strong>
            <small className="media-stat-sub">SRT & ASS caption files</small>
          </div>
        </article>

        <article className="media-stat-card">
          <div className="media-stat-icon green">
            <HardDrive size={20} />
          </div>
          <div className="media-stat-details">
            <span className="media-stat-label">Storage Used</span>
            <strong className="media-stat-value">{formatBytes(summary.totalSizeBytes)}</strong>
            <small className="media-stat-sub">Local disk footprint</small>
          </div>
        </article>
      </section>

      {/* ── 3. Search, Filter & View Controls Toolbar ─────────────────────────── */}
      <section className="media-toolbar-wrapper">
        <div className="media-toolbar-top">
          {/* Search bar */}
          <div className="media-search-bar">
            <Search size={16} className="media-search-icon" />
            <input
              className="media-search-input"
              placeholder="Search your media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
            {searchQuery && (
              <button
                className="media-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Controls: View Mode & Sort */}
          <div className="media-toolbar-controls">
            <div className="media-view-toggle">
              <button
                className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                onClick={() => handleViewModeChange("grid")}
                title="Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                onClick={() => handleViewModeChange("list")}
                title="List View"
                aria-label="List View"
              >
                <List size={15} />
              </button>
            </div>

            <div className="media-sort-box">
              <ArrowUpDown size={13} className="media-sort-icon" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="media-sort-select"
              >
                <option value="recent">Recently Added</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
                <option value="size_desc">Size (Largest)</option>
                <option value="size_asc">Size (Smallest)</option>
                <option value="type">File Type</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="media-filter-pills-row">
          <button
            className={`media-filter-pill ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            <span>All Assets</span>
            <span className="pill-count">{assets.length}</span>
          </button>
          <button
            className={`media-filter-pill ${activeFilter === "video" ? "active" : ""}`}
            onClick={() => setActiveFilter("video")}
          >
            <Video size={13} />
            <span>Videos</span>
            <span className="pill-count">{summary.videos}</span>
          </button>
          <button
            className={`media-filter-pill ${activeFilter === "audio" ? "active" : ""}`}
            onClick={() => setActiveFilter("audio")}
          >
            <Music size={13} />
            <span>Audio</span>
            <span className="pill-count">{summary.audio}</span>
          </button>
          <button
            className={`media-filter-pill ${activeFilter === "subtitle" ? "active" : ""}`}
            onClick={() => setActiveFilter("subtitle")}
          >
            <FileCode size={13} />
            <span>Subtitles</span>
            <span className="pill-count">{summary.subtitles}</span>
          </button>
          {summary.images > 0 && (
            <button
              className={`media-filter-pill ${activeFilter === "image" ? "active" : ""}`}
              onClick={() => setActiveFilter("image")}
            >
              <ImageIcon size={13} />
              <span>Images</span>
              <span className="pill-count">{summary.images}</span>
            </button>
          )}
          <div className="media-filter-divider" />
          <button
            className={`media-filter-pill ${activeFilter === "input" ? "active" : ""}`}
            onClick={() => setActiveFilter("input")}
          >
            <span>Source (input/)</span>
            <span className="pill-count">{inputCount}</span>
          </button>
          <button
            className={`media-filter-pill ${activeFilter === "output" ? "active" : ""}`}
            onClick={() => setActiveFilter("output")}
          >
            <span>Generated (output/)</span>
            <span className="pill-count">{outputCount}</span>
          </button>
        </div>
      </section>

      {/* ── 4. Main Media Assets Display ───────────────────────────────────────── */}
      {isLoading ? (
        <div className="media-loading-skeleton">
          <div className="media-spinner">
            <RefreshCw size={28} className="animate-spin text-blue" />
          </div>
          <p>Scanning workspace media assets...</p>
        </div>
      ) : error ? (
        <div className="media-error-state">
          <AlertCircle size={36} className="text-red" />
          <h3>Couldn&apos;t load your media.</h3>
          <p>{error}</p>
          <button className="primary" onClick={() => loadMedia(false)}>
            <RefreshCw size={15} /> Try Again
          </button>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="media-empty-state">
          <div className="empty-icon-box">
            {searchQuery ? <Search size={24} /> : <Layers size={24} />}
          </div>
          <h3>{searchQuery ? "No assets match your search" : "Your library is empty."}</h3>
          <p>
            {searchQuery
              ? `No media files matching "${searchQuery}". Try searching for another name or extension.`
              : activeFilter === "audio"
              ? "No audio voiceovers yet. Generated voiceovers will appear here after your first video."
              : activeFilter === "subtitle"
              ? "No subtitle files yet. Generated subtitles will appear here automatically."
              : "Assets you add to the input folder or render with the Video Generator will appear here."}
          </p>
          {searchQuery ? (
            <button className="secondary" onClick={() => setSearchQuery("")}>
              Clear Search Query
            </button>
          ) : (
            <button className="primary" onClick={() => setIsUploadOpen(true)}>
              <Upload size={15} /> Import First Asset
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* ── GRID VIEW ── */
        <div className="media-grid-container">
          {filteredAssets.map((asset) => {
            const projectTitle = assetProjectMap.get(asset.name);
            const isPlayingThisAudio = playingAudioId === asset.id;

            return (
              <article
                key={asset.id}
                className={`media-card ${asset.type}-card ${
                  openMenuId === asset.id ? "menu-open" : ""
                }`}
              >
                {/* Visual Preview Header */}
                <div
                  className="media-card-preview"
                  onClick={() => {
                    if (asset.type === "audio") {
                      handleToggleAudio(asset);
                    } else {
                      setPreviewAsset(asset);
                    }
                  }}
                >
                  {asset.type === "video" ? (
                    <div className="video-thumb-container">
                      <video
                        src={asset.url}
                        className="video-thumb-video"
                        preload="metadata"
                        muted
                        playsInline
                      />
                      <div className="video-play-overlay">
                        <div className="play-circle-btn">
                          <Play size={18} />
                        </div>
                      </div>
                    </div>
                  ) : asset.type === "audio" ? (
                    <div className={`audio-thumb-container ${isPlayingThisAudio ? "playing" : ""}`}>
                      <div className="audio-center-symbol">
                        <Headphones size={28} />
                      </div>
                      <div className="audio-waveform-bars">
                        <span style={{ animationDelay: "0.1s" }} />
                        <span style={{ animationDelay: "0.3s" }} />
                        <span style={{ animationDelay: "0.15s" }} />
                        <span style={{ animationDelay: "0.45s" }} />
                        <span style={{ animationDelay: "0.2s" }} />
                        <span style={{ animationDelay: "0.35s" }} />
                        <span style={{ animationDelay: "0.1s" }} />
                        <span style={{ animationDelay: "0.5s" }} />
                        <span style={{ animationDelay: "0.25s" }} />
                      </div>
                      <button
                        className="audio-inline-play-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAudio(asset);
                        }}
                        aria-label={isPlayingThisAudio ? "Pause Audio" : "Play Audio"}
                      >
                        {isPlayingThisAudio ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                    </div>
                  ) : asset.type === "subtitle" ? (
                    <div className="subtitle-thumb-container">
                      <div className="sub-format-badge">
                        {asset.extension.toUpperCase().replace(".", "")}
                      </div>
                      <div className="sub-mock-lines">
                        <div className="mock-line full" />
                        <div className="mock-line mid" />
                        <div className="mock-line short" />
                      </div>
                      <span className="sub-inspect-hint">Click to Preview</span>
                    </div>
                  ) : (
                    <div className="image-thumb-container">
                      <img src={asset.url} alt={asset.name} className="image-thumb-img" />
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="media-card-top-badges">
                    <span className={`media-type-badge badge-${asset.type}`}>
                      {asset.extension.toUpperCase().replace(".", "")}
                    </span>
                    <span
                      className={`media-cat-badge ${
                        asset.category === "input" ? "cat-source" : "cat-generated"
                      }`}
                    >
                      {asset.category === "input" ? "SOURCE" : "OUTPUT"}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="media-card-body">
                  <div className="media-card-main-info">
                    <h3
                      className="media-card-filename"
                      title={asset.name}
                      onClick={() => setPreviewAsset(asset)}
                    >
                      {asset.name}
                    </h3>

                    {projectTitle && (
                      <div
                        className="media-project-pill"
                        title={`Project: ${projectTitle}`}
                        onClick={onNavigateProjects}
                      >
                        <Sparkles size={11} />
                        <span>Project · {projectTitle}</span>
                      </div>
                    )}

                    <div className="media-card-meta-row">
                      <span>{formatBytes(asset.size)}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(asset.modified)}</span>
                    </div>
                  </div>

                  {/* 3-Dot Action Menu */}
                  <div
                    className="media-card-menu-wrap"
                    ref={openMenuId === asset.id ? menuRef : undefined}
                  >
                    <button
                      className="media-menu-trigger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId((cur) => (cur === asset.id ? null : asset.id));
                      }}
                      aria-label="Asset actions"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {openMenuId === asset.id && (
                      <div className="media-dropdown-menu">
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            setPreviewAsset(asset);
                          }}
                        >
                          <ExternalLink size={13} /> Preview
                        </button>

                        {asset.type === "video" && (
                          <button
                            className="text-blue-btn"
                            onClick={() => {
                              setOpenMenuId(null);
                              onUseInEditor(asset);
                            }}
                          >
                            <Sparkles size={13} /> Use in Editor
                          </button>
                        )}

                        <a
                          href={`/api/download/${asset.name}?title=${encodeURIComponent(
                            projectTitle || asset.name.replace(/\.[^/.]+$/, "")
                          )}`}
                          download={asset.name}
                          className="media-menu-link"
                          onClick={() => setOpenMenuId(null)}
                        >
                          <Download size={13} /> Download
                        </a>

                        <button onClick={() => copyToClipboard(asset.name, "filename")}>
                          <Copy size={13} /> Copy Filename
                        </button>

                        <button onClick={() => copyToClipboard(asset.relPath, "path")}>
                          <FileCode size={13} /> Copy Path
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* ── LIST VIEW ── */
        <div className="media-list-table-wrapper">
          <table className="media-list-table">
            <thead>
              <tr>
                <th>Asset Name</th>
                <th>Type</th>
                <th>Origin</th>
                <th>File Size</th>
                <th>Date Added</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => {
                const projectTitle = assetProjectMap.get(asset.name);
                const isPlayingThisAudio = playingAudioId === asset.id;

                return (
                  <tr key={asset.id} className="media-table-row">
                    <td>
                      <div className="table-asset-info">
                        <div
                          className="table-asset-icon-box"
                          onClick={() => {
                            if (asset.type === "audio") handleToggleAudio(asset);
                            else setPreviewAsset(asset);
                          }}
                        >
                          {asset.type === "video" ? (
                            <Film size={16} className="text-blue" />
                          ) : asset.type === "audio" ? (
                            isPlayingThisAudio ? (
                              <Pause size={16} className="text-cyan" />
                            ) : (
                              <Play size={16} className="text-cyan" />
                            )
                          ) : asset.type === "subtitle" ? (
                            <FileCode size={16} className="text-amber" />
                          ) : (
                            <ImageIcon size={16} />
                          )}
                        </div>
                        <div className="table-name-group">
                          <span
                            className="table-filename"
                            onClick={() => setPreviewAsset(asset)}
                          >
                            {asset.name}
                          </span>
                          {projectTitle && (
                            <small className="table-project-tag">
                              Project · {projectTitle}
                            </small>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`media-type-badge badge-${asset.type}`}>
                        {asset.extension.toUpperCase().replace(".", "")}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`media-cat-badge ${
                          asset.category === "input" ? "cat-source" : "cat-generated"
                        }`}
                      >
                        {asset.category === "input" ? "input/" : "output/"}
                      </span>
                    </td>
                    <td>
                      <span className="table-filesize">{formatBytes(asset.size)}</span>
                    </td>
                    <td>
                      <span className="table-date">{formatDate(asset.modified)}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="table-actions-cell">
                        {asset.type === "video" && (
                          <button
                            className="table-quick-btn blue"
                            onClick={() => onUseInEditor(asset)}
                            title="Use in Video Editor"
                          >
                            <Sparkles size={13} />
                            <span>Use</span>
                          </button>
                        )}
                        <button
                          className="table-quick-btn"
                          onClick={() => setPreviewAsset(asset)}
                          title="Preview Asset"
                        >
                          <ExternalLink size={13} />
                        </button>
                        <a
                          href={`/api/download/${asset.name}?title=${encodeURIComponent(
                            projectTitle || asset.name.replace(/\.[^/.]+$/, "")
                          )}`}
                          download={asset.name}
                          className="table-quick-btn"
                          title="Download"
                        >
                          <Download size={13} />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 5. MEDIA PREVIEW MODAL ─────────────────────────────────────────────── */}
      {previewAsset && (
        <div className="media-modal-overlay" onClick={() => setPreviewAsset(null)}>
          <div
            className={`media-preview-dialog ${previewAsset.type}-dialog`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="media-dialog-header">
              <div className="dialog-title-group">
                <span className={`media-type-badge badge-${previewAsset.type}`}>
                  {previewAsset.extension.toUpperCase().replace(".", "")}
                </span>
                <h2>{previewAsset.name}</h2>
              </div>
              <button
                className="media-dialog-close"
                onClick={() => setPreviewAsset(null)}
                aria-label="Close modal"
              >
                <X size={17} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="media-dialog-body">
              {/* VIDEO PLAYER */}
              {previewAsset.type === "video" && (
                <div className="dialog-video-layout">
                  <div className="dialog-player-wrapper">
                    <video
                      controls
                      autoPlay
                      src={previewAsset.url}
                      className="dialog-video-player"
                    />
                  </div>
                  <div className="dialog-meta-sidebar">
                    <h4>Asset Details</h4>
                    <div className="meta-spec-row">
                      <span>Filename:</span>
                      <b>{previewAsset.name}</b>
                    </div>
                    <div className="meta-spec-row">
                      <span>Folder Origin:</span>
                      <b>{previewAsset.relPath}</b>
                    </div>
                    <div className="meta-spec-row">
                      <span>File Size:</span>
                      <b>{formatBytes(previewAsset.size)}</b>
                    </div>
                    <div className="meta-spec-row">
                      <span>Last Modified:</span>
                      <b>{formatDate(previewAsset.modified)}</b>
                    </div>
                    {assetProjectMap.get(previewAsset.name) && (
                      <div className="meta-spec-row">
                        <span>Project:</span>
                        <b className="text-blue">{assetProjectMap.get(previewAsset.name)}</b>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AUDIO PLAYER */}
              {previewAsset.type === "audio" && (
                <div className="dialog-audio-layout">
                  <div className="dialog-audio-visual">
                    <div className="audio-big-icon">
                      <Headphones size={44} />
                    </div>
                    <div className="dialog-waveform-visual">
                      <span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span />
                    </div>
                  </div>
                  <audio controls autoPlay src={previewAsset.url} className="dialog-audio-player" />
                  <div className="dialog-meta-specs-box">
                    <div className="meta-spec-row">
                      <span>Filename:</span>
                      <b>{previewAsset.name}</b>
                    </div>
                    <div className="meta-spec-row">
                      <span>Format:</span>
                      <b>{previewAsset.extension.toUpperCase().replace(".", "")} Audio</b>
                    </div>
                    <div className="meta-spec-row">
                      <span>File Size:</span>
                      <b>{formatBytes(previewAsset.size)}</b>
                    </div>
                    <div className="meta-spec-row">
                      <span>Location:</span>
                      <b>{previewAsset.relPath}</b>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTITLE VIEWER */}
              {previewAsset.type === "subtitle" && (
                <div className="dialog-subtitle-layout">
                  <div className="subtitle-toolbar-row">
                    <div className="sub-view-toggle">
                      <button
                        className={subtitleViewMode === "cues" ? "active" : ""}
                        onClick={() => setSubtitleViewMode("cues")}
                      >
                        Cues View ({subtitleCues.length})
                      </button>
                      <button
                        className={subtitleViewMode === "raw" ? "active" : ""}
                        onClick={() => setSubtitleViewMode("raw")}
                      >
                        Raw File Text
                      </button>
                    </div>

                    {subtitleViewMode === "cues" && (
                      <div className="sub-search-box">
                        <Search size={13} />
                        <input
                          placeholder="Search dialogue text..."
                          value={subtitleSearch}
                          onChange={(e) => setSubtitleSearch(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {isLoadingSubtitle ? (
                    <div className="sub-loading-state">
                      <RefreshCw size={20} className="animate-spin text-blue" />
                      <span>Parsing subtitle transcripts...</span>
                    </div>
                  ) : subtitleViewMode === "cues" ? (
                    <div className="subtitle-cues-list">
                      {filteredSubtitleCues.length === 0 ? (
                        <div className="sub-empty-cue">No transcript cues found.</div>
                      ) : (
                        filteredSubtitleCues.map((cue) => (
                          <div key={cue.id} className="subtitle-cue-item">
                            <div className="cue-timestamp-box">
                              <Clock size={11} />
                              <span>
                                {cue.startTime} → {cue.endTime}
                              </span>
                            </div>
                            <p className="cue-text">{cue.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <pre className="subtitle-raw-editor">{rawSubtitleText}</pre>
                  )}
                </div>
              )}

              {/* IMAGE VIEWER */}
              {previewAsset.type === "image" && (
                <div className="dialog-image-layout">
                  <img
                    src={previewAsset.url}
                    alt={previewAsset.name}
                    className="dialog-full-image"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="media-dialog-footer">
              <div className="footer-left-meta">
                <span>{previewAsset.relPath}</span>
              </div>
              <div className="footer-right-actions">
                <button className="secondary" onClick={() => setPreviewAsset(null)}>
                  Close
                </button>

                {previewAsset.type === "video" && (
                  <button
                    className="primary"
                    onClick={() => {
                      const asset = previewAsset;
                      setPreviewAsset(null);
                      onUseInEditor(asset);
                    }}
                  >
                    <Sparkles size={15} /> Use in Video Editor
                  </button>
                )}

                <a
                  href={`/api/download/${previewAsset.name}?title=${encodeURIComponent(
                    assetProjectMap.get(previewAsset.name) ||
                      previewAsset.name.replace(/\.[^/.]+$/, "")
                  )}`}
                  download={previewAsset.name}
                  className="secondary"
                  style={{ textDecoration: "none" }}
                >
                  <Download size={15} /> Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. IMPORT MEDIA MODAL ─────────────────────────────────────────────── */}
      {isUploadOpen && (
        <div className="media-modal-overlay" onClick={() => setIsUploadOpen(false)}>
          <div
            className="media-upload-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="media-dialog-header">
              <div className="dialog-title-group">
                <h2>Import Media Assets</h2>
                <small>Add source videos, audio, or graphics to your studio library.</small>
              </div>
              <button
                className="media-dialog-close"
                onClick={() => setIsUploadOpen(false)}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <div className="media-upload-body">
              <input
                ref={filePickerRef}
                type="file"
                accept="video/*,audio/*,image/*,.srt,.ass"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />

              <div
                className={`upload-dropzone ${isDraggingFile ? "dragover" : ""} ${
                  isUploading ? "uploading" : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleFileDrop}
                onClick={() => !isUploading && filePickerRef.current?.click()}
              >
                {isUploading ? (
                  <div className="upload-state-loading">
                    <RefreshCw size={32} className="animate-spin text-blue" />
                    <strong>Uploading to input/ folder...</strong>
                    <span>Processing file on local studio backend</span>
                  </div>
                ) : uploadSuccessName ? (
                  <div className="upload-state-success">
                    <Check size={32} className="text-blue" />
                    <strong>{uploadSuccessName} imported!</strong>
                    <span>Adding to your workspace media library...</span>
                  </div>
                ) : (
                  <div className="upload-state-idle">
                    <div className="upload-icon-circle">
                      <Upload size={24} />
                    </div>
                    <strong>Drop files here or click to browse</strong>
                    <span>Supports MP4, WebM, MOV, WAV, MP3, PNG, JPG, SRT</span>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="media-upload-error">
                  <AlertCircle size={14} />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>

            <div className="media-dialog-footer">
              <button className="secondary" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </button>
              <button
                className="primary"
                onClick={() => filePickerRef.current?.click()}
                disabled={isUploading}
              >
                <Upload size={15} /> Select File
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
