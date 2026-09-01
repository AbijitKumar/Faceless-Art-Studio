import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  FileVideo,
  Film,
  FolderKanban,
  Maximize2,
  Mic,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Shuffle,
  Sparkles,
  Type,
  Upload,
  Video,
  Volume2,
  X,
  AlertCircle,
} from "lucide-react";
import {
  CaptionSettings,
  fetchInputFiles,
  fetchRandomInput,
  fetchVoices,
  getJobStatus,
  InputFile,
  startGeneration,
  triggerDownload,
  VideoSettings,
  Voice,
} from "./editorApi";
import { projectStore } from "./projectStore";

interface EditorPageProps {
  onBack: () => void;
  onNavigateProjects: () => void;
}

const PRESET_OPTIONS = [
  { id: "bold", label: "Bold Yellow", color: "#FFDC28", desc: "High contrast YouTube style" },
  { id: "neon", label: "Neon Cyan", color: "#00F0FF", desc: "Vibrant glowing style" },
  { id: "creator", label: "Studio Blue", color: "#1E8CFA", desc: "Faceless Studio signature look" },
  { id: "classic", label: "Classic White", color: "#FFFFFF", desc: "Clean subtitle style" },
  { id: "minimal", label: "Minimal Gray", color: "#E0E0E0", desc: "Subtle and modern" },
  { id: "karaoke", label: "Karaoke Blue", color: "#1E8CFA", desc: "Word-by-word active" },
] as const;

const FONT_OPTIONS = [
  "Manrope",
  "Inter",
  "Arial",
  "Roboto",
  "Trebuchet MS",
];

const DEFAULT_SCRIPT =
  "AI is dramatically simple. Turn your ideas into high-impact faceless videos in seconds.";

export function EditorPage({ onBack, onNavigateProjects }: EditorPageProps) {
  // ── Project Metadata ────────────────────────────────────────────────────────
  const [projectTitle, setProjectTitle] = useState("My Faceless Video");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // ── Script State (Primary First Screen) ─────────────────────────────────────
  const [scriptText, setScriptText] = useState(DEFAULT_SCRIPT);
  const [isDraggingTxt, setIsDraggingTxt] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Random Source Video State ───────────────────────────────────────────────
  const [availableVideos, setAvailableVideos] = useState<InputFile[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<InputFile | null>(null);
  const [sourceVideoError, setSourceVideoError] = useState<string | null>(null);
  const [isLoadingSource, setIsLoadingSource] = useState(false);

  // ── Voice State ─────────────────────────────────────────────────────────────
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("en-US-AriaNeural");
  const [voiceLocaleFilter, setVoiceLocaleFilter] = useState("en-US");
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // ── Caption & Styling Settings ──────────────────────────────────────────────
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [captionPreset, setCaptionPreset] = useState<
    "bold" | "neon" | "classic" | "minimal" | "karaoke" | "creator"
  >("bold");
  const [fontName, setFontName] = useState("Manrope");
  const [captionSizeScale, setCaptionSizeScale] = useState(100); // 50 to 200 percent
  const [primaryColor, setPrimaryColor] = useState("#FFFFFF");
  const [highlightColor, setHighlightColor] = useState("#FFDC28");
  const [outlineColor, setOutlineColor] = useState("#000000");
  const [alignment, setAlignment] = useState<2 | 5 | 8>(2); // 2: bottom, 5: center, 8: top
  const [captionPosition, setCaptionPosition] = useState<"bottom" | "center" | "top">("bottom");
  const [hasOutline, setHasOutline] = useState(true);
  const [hasShadow, setHasShadow] = useState(true);
  const [maxWordsPerCaption, setMaxWordsPerCaption] = useState(3);

  // ── Video Settings ──────────────────────────────────────────────────────────
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9" | "1:1">("9:16");
  const [resolution, setResolution] = useState<"720p" | "1080p" | "4K">("1080p");

  // ── Video Playback & Canvas State ───────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // ── Generation / Pipeline State ─────────────────────────────────────────────
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<string>("preparing");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<{
    job_id: string;
    title?: string;
    source_video?: string;
    video_url: string;
    video_path?: string;
    duration?: string;
  } | null>(null);

  // ── Load Voices & Random Source Video on Mount ──────────────────────────────
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch available Edge TTS voices
    fetchVoices()
      .then((data) => {
        if (!isMounted) return;
        setVoices(data);
        if (data.length > 0) {
          const defaultVoice = data.find((v) => v.shortName === "en-US-AriaNeural") || data[0];
          setSelectedVoice(defaultVoice.shortName);
        }
      })
      .catch((err) => {
        if (isMounted) setVoiceError("Failed to load voices. Ensure backend server is running.");
      });

    // 2. Fetch real videos from input/ and select one randomly
    setIsLoadingSource(true);
    fetchInputFiles()
      .then((files) => {
        if (!isMounted) return;
        setAvailableVideos(files);
        if (files.length === 0) {
          setSourceVideoError("No source videos are available in the input folder.");
          setSelectedVideo(null);
        } else {
          // Pick a random video
          const randomVideo = files[Math.floor(Math.random() * files.length)];
          setSelectedVideo(randomVideo);
          setSourceVideoError(null);
        }
      })
      .catch((err) => {
        if (isMounted) setSourceVideoError("Unable to connect to backend to list input videos.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingSource(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // ── Pick Another Random Source Video ────────────────────────────────────────
  const handleRollRandomVideo = () => {
    if (availableVideos.length === 0) {
      setSourceVideoError("No source videos are available in the input folder.");
      return;
    }
    const currentName = selectedVideo?.name;
    const others = availableVideos.filter((v) => v.name !== currentName);
    const pool = others.length > 0 ? others : availableVideos;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    setSelectedVideo(chosen);
    if (videoRef.current) {
      videoRef.current.src = chosen.url;
      videoRef.current.load();
    }
  };

  // ── TXT File Handler (Drag-and-Drop & Browse) ────────────────────────────────
  const processTxtFile = (file: File) => {
    setScriptError(null);
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setScriptError("Please select a .txt file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content || !content.trim()) {
        setScriptError("The selected text file is empty.");
        return;
      }
      setScriptText(content.trim());
      // Optionally use file name without extension as project title
      const rawBase = file.name.replace(/\.txt$/i, "").trim();
      if (rawBase && (!projectTitle || projectTitle === "My Faceless Video" || projectTitle === "Untitled Video")) {
        setProjectTitle(rawBase);
      }
    };
    reader.onerror = () => {
      setScriptError("Failed to read the .txt file. Please check file permissions.");
    };
    reader.readAsText(file, "utf-8");
  };

  const handleTxtDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingTxt(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processTxtFile(e.dataTransfer.files[0]);
    }
  };

  const handleTxtBrowseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processTxtFile(e.target.files[0]);
    }
    // Reset file input so re-selecting same file triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Sync Alignment with Caption Position ────────────────────────────────────
  useEffect(() => {
    if (captionPosition === "top") setAlignment(8);
    else if (captionPosition === "center") setAlignment(5);
    else setAlignment(2);
  }, [captionPosition]);

  // ── Sync Colors with Preset ─────────────────────────────────────────────────
  useEffect(() => {
    if (captionPreset === "bold") {
      setHighlightColor("#FFDC28");
      setOutlineColor("#000000");
      setPrimaryColor("#FFFFFF");
    } else if (captionPreset === "neon") {
      setHighlightColor("#00F0FF");
      setOutlineColor("#141821");
      setPrimaryColor("#FFFFFF");
    } else if (captionPreset === "creator") {
      setHighlightColor("#1E8CFA");
      setOutlineColor("#101216");
      setPrimaryColor("#FFFFFF");
    } else if (captionPreset === "karaoke") {
      setHighlightColor("#1E8CFA");
      setOutlineColor("#000000");
      setPrimaryColor("#FFFFFF");
    } else if (captionPreset === "classic") {
      setHighlightColor("#FFFFFF");
      setOutlineColor("#000000");
      setPrimaryColor("#FFFFFF");
    } else if (captionPreset === "minimal") {
      setHighlightColor("#E0E0E0");
      setOutlineColor("#101216");
      setPrimaryColor("#FFFFFF");
    }
  }, [captionPreset]);

  // ── Filter Voices by Locale ─────────────────────────────────────────────────
  const filteredVoices = useMemo(() => {
    if (!voiceLocaleFilter || voiceLocaleFilter === "ALL") return voices;
    return voices.filter((v) => v.locale.startsWith(voiceLocaleFilter));
  }, [voices, voiceLocaleFilter]);

  // ── Script Statistics ───────────────────────────────────────────────────────
  const scriptWords = useMemo(() => {
    return scriptText.trim().split(/\s+/).filter(Boolean);
  }, [scriptText]);

  const scriptPhrases = useMemo(() => {
    const chunks: string[] = [];
    for (let i = 0; i < scriptWords.length; i += maxWordsPerCaption) {
      chunks.push(scriptWords.slice(i, i + maxWordsPerCaption).join(" "));
    }
    return chunks;
  }, [scriptWords, maxWordsPerCaption]);

  // ── Live Caption for Draft Preview ─────────────────────────────────────────
  const currentLiveCaption = useMemo(() => {
    if (scriptPhrases.length === 0) {
      return { active: "AI is dramatically simple.", remaining: "Turn ideas into videos." };
    }
    const phraseDuration = 2.5;
    const idx = Math.min(Math.floor(currentTime / phraseDuration), scriptPhrases.length - 1);
    const activePhrase = scriptPhrases[idx] || "";
    const nextPhrase = scriptPhrases[idx + 1] || "";
    return { active: activePhrase, remaining: nextPhrase };
  }, [currentTime, scriptPhrases]);

  // ── Playback Handlers ───────────────────────────────────────────────────────
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || 0);
  };

  const handleSeek = (newTime: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(newTime, duration || 100));
    videoRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const stepFrame = (delta: number) => {
    if (!videoRef.current) return;
    handleSeek(videoRef.current.currentTime + delta);
  };

  const formatTimecode = (sec: number) => {
    const totalMs = Math.max(0, Math.floor(sec * 100));
    const minutes = Math.floor(totalMs / 6000);
    const seconds = Math.floor((totalMs % 6000) / 100);
    const centis = totalMs % 100;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
  };

  // ── Trigger Video Generation ────────────────────────────────────────────────
  const handleGenerate = async () => {
    setScriptError(null);
    setGenerationError(null);

    // Validation
    const cleanText = scriptText.trim();
    if (!cleanText) {
      setScriptError("Please enter or upload a script.");
      return;
    }

    if (!selectedVideo && availableVideos.length === 0) {
      setGenerationError("No source videos are available in the input folder.");
      return;
    }

    const cleanTitle = projectTitle.trim() || "Untitled Video";
    const jobId = `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const sourceVideoName = selectedVideo ? selectedVideo.name : "Random input video";

    setIsGenerating(true);
    setGenerationStage("preparing");
    setGeneratedResult(null);

    // 1. Create project in projectStore with processing status
    projectStore.createProject({
      id: jobId,
      title: cleanTitle,
      status: "processing",
      resolution,
      sourceVideo: sourceVideoName,
      topic: "Faceless Video",
    });

    try {
      const scaledFontSize = Math.round(78 * (captionSizeScale / 100));
      const captionSettings: CaptionSettings = {
        enabled: captionsEnabled,
        preset: captionPreset,
        font_name: fontName,
        font_size: scaledFontSize,
        font_size_scale: captionSizeScale / 100,
        primary_color: primaryColor,
        highlight_color: highlightColor,
        outline_color: outlineColor,
        alignment,
        outline: hasOutline ? Math.max(1, Math.round(5 * (captionSizeScale / 100))) : 0,
        shadow: hasShadow ? Math.max(1, Math.round(2 * (captionSizeScale / 100))) : 0,
        max_words: maxWordsPerCaption,
      };

      const videoSettings: VideoSettings = {
        aspect_ratio: aspectRatio,
        resolution,
      };

      // 2. Start asynchronous backend pipeline
      await startGeneration({
        job_id: jobId,
        title: cleanTitle,
        text: cleanText,
        video_path: selectedVideo ? selectedVideo.path : "random",
        voice: selectedVoice,
        caption_settings: captionSettings,
        video_settings: videoSettings,
      });

      // 3. Poll backend for progress
      const pollInterval = setInterval(async () => {
        try {
          const status = await getJobStatus(jobId);
          setGenerationStage(status.stage);

          if (status.status === "completed" && status.result) {
            clearInterval(pollInterval);
            setIsGenerating(false);

            const finalDuration =
              status.result.duration ||
              (status.result.duration_sec
                ? formatTimecode(status.result.duration_sec).slice(0, 5)
                : "0:10");

            const resultData = {
              job_id: jobId,
              title: cleanTitle,
              source_video: status.source_video || status.result.source_video || sourceVideoName,
              video_url: status.result.video_url,
              video_path: status.result.video_path,
              duration: finalDuration,
            };

            setGeneratedResult(resultData);

            // Update projectStore with completed state
            projectStore.updateProject(jobId, {
              status: "completed",
              videoPath: status.result.video_url,
              voiceoverPath: status.result.voiceover_url || null,
              subtitlesPath: status.result.subtitles_url || null,
              sourceVideo: status.source_video || status.result.source_video || sourceVideoName,
              duration: finalDuration,
            });

            // Switch editor preview to the generated MP4
            if (videoRef.current) {
              videoRef.current.src = status.result.video_url;
              videoRef.current.load();
              videoRef.current.play().catch(() => {});
            }
          } else if (status.status === "failed") {
            clearInterval(pollInterval);
            setIsGenerating(false);
            const errMsg = status.error || "Generation pipeline encountered an error.";
            setGenerationError(errMsg);
            projectStore.updateProject(jobId, {
              status: "failed",
              error: errMsg,
            });
          }
        } catch (pollErr: any) {
          console.error("Polling error:", pollErr);
        }
      }, 1500);
    } catch (err: any) {
      setIsGenerating(false);
      const errMsg = err.message || "Failed to start generation. Make sure the backend server is running.";
      setGenerationError(errMsg);
      projectStore.updateProject(jobId, {
        status: "failed",
        error: errMsg,
      });
    }
  };

  // ── Download Generated MP4 Handler ──────────────────────────────────────────
  const handleDownloadResult = () => {
    if (!generatedResult) return;
    const filename = generatedResult.video_url.split("/").pop() || `${generatedResult.job_id}.mp4`;
    const cleanTitle = (projectTitle.trim() || generatedResult.title || "faceless-video").replace(/[\\/*?:"<>|]/g, "_");
    const downloadUrl = `/api/download/${filename}?title=${encodeURIComponent(cleanTitle)}`;
    triggerDownload(downloadUrl, `${cleanTitle}.mp4`);
  };

  return (
    <div className="editor-root">
      {/* ── Hidden File Input for .txt browse ─────────────────────────────────── */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,text/plain"
        onChange={handleTxtBrowseChange}
        style={{ display: "none" }}
      />

      {/* ── 1. Editor Top Bar ─────────────────────────────────────────────────── */}
      <header className="editor-topbar">
        <div className="editor-topbar-left">
          <button className="editor-back-btn" onClick={onBack} title="Back to Dashboard">
            <ArrowLeft size={16} />
          </button>
          <div className="editor-brand">
            <div className="brand-mark">
              <Film size={17} />
            </div>
            <div>
              <b>FACELESS</b>
              <span>ART STUDIO</span>
            </div>
          </div>

          <div className="editor-title-pill">
            <span className="editor-title-label">Project:</span>
            {isEditingTitle ? (
              <input
                className="editor-title-input"
                value={projectTitle}
                autoFocus
                onChange={(e) => setProjectTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
                placeholder="Enter project name..."
              />
            ) : (
              <span
                className="editor-title-text"
                onClick={() => setIsEditingTitle(true)}
                title="Click to edit project name"
              >
                {projectTitle || "Untitled Video"}
              </span>
            )}
            <span className="editor-tag" onClick={() => setIsEditingTitle(true)}>
              Edit
            </span>
          </div>
        </div>

        <div className="editor-topbar-right">
          <button
            className="editor-secondary-btn"
            onClick={togglePlayPause}
            title="Preview canvas playback"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />} {isPlaying ? "Pause" : "Preview"}
          </button>

          <button
            className="editor-export-btn"
            onClick={handleGenerate}
            disabled={isGenerating}
            title="Start real video generation"
          >
            <Sparkles size={15} /> Generate Video
          </button>
        </div>
      </header>

      {/* ── 2. Editor Main Workspace ─────────────────────────────────────────── */}
      <div className="editor-workspace">
        {/* ── Left Column: Primary Script Input & Controls ── */}
        <aside className="editor-left-panel">
          <div className="editor-panel-section">
            <div className="panel-section-header">
              <div className="header-title">
                <FileText size={16} className="text-blue" />
                <strong>1. Script & Narration</strong>
              </div>
              <button
                className="text-link-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Browse local .txt file"
              >
                <Upload size={12} /> Choose .TXT
              </button>
            </div>

            {/* Drag and Drop Zone + Text Area */}
            <div
              className={`script-dropzone-container ${isDraggingTxt ? "drag-over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingTxt(true);
              }}
              onDragLeave={() => setIsDraggingTxt(false)}
              onDrop={handleTxtDrop}
            >
              {isDraggingTxt && (
                <div className="dropzone-drag-overlay">
                  <Upload size={28} className="animate-bounce" />
                  <strong>Drop .txt file to import script</strong>
                </div>
              )}

              <textarea
                className="script-editor-textarea"
                rows={7}
                value={scriptText}
                onChange={(e) => {
                  setScriptText(e.target.value);
                  setScriptError(null);
                }}
                placeholder="Type or paste your script here, or drop a .txt file..."
              />
            </div>

            {/* Script Stats & Browse Action */}
            <div className="script-footer-bar">
              <div className="script-metrics">
                <span>{scriptWords.length} words</span>
                <span>{scriptText.length} chars</span>
                <span>~{Math.max(5, Math.round(scriptWords.length * 0.4))}s est.</span>
              </div>
              <button
                className="script-sample-btn"
                onClick={() => setScriptText(DEFAULT_SCRIPT)}
                title="Reset to sample script"
              >
                Sample Script
              </button>
            </div>

            {scriptError && (
              <div className="editor-alert error">
                <AlertCircle size={14} />
                <span>{scriptError}</span>
              </div>
            )}
          </div>

          {/* Source Video Selection (Random from input/) */}
          <div className="editor-panel-section">
            <div className="panel-section-header">
              <div className="header-title">
                <Video size={16} className="text-blue" />
                <strong>2. Background Video</strong>
              </div>
              <button
                className="roll-random-btn"
                onClick={handleRollRandomVideo}
                disabled={isLoadingSource || availableVideos.length === 0}
                title="Roll another random video from input/"
              >
                <Shuffle size={12} /> Roll Another
              </button>
            </div>

            <div className="source-video-card">
              <div className="source-video-icon">
                <FileVideo size={20} />
              </div>
              <div className="source-video-details">
                <div className="source-video-name">
                  {selectedVideo ? selectedVideo.name : isLoadingSource ? "Loading from input/..." : "None selected"}
                </div>
                <div className="source-video-sub">
                  {selectedVideo
                    ? `Randomly selected from input/ (${(selectedVideo.size / (1024 * 1024)).toFixed(1)} MB)`
                    : "No source videos found"}
                </div>
              </div>
              {selectedVideo && <Check size={16} className="text-blue flex-none" />}
            </div>

            {sourceVideoError && (
              <div className="editor-alert error">
                <AlertCircle size={14} />
                <span>{sourceVideoError}</span>
              </div>
            )}
          </div>

          {/* Real AI Voice Selection */}
          <div className="editor-panel-section">
            <div className="panel-section-header">
              <div className="header-title">
                <Mic size={16} className="text-blue" />
                <strong>3. AI Voice (Edge TTS)</strong>
              </div>
            </div>

            <div className="voice-filter-row">
              <div className="form-group flex-1">
                <label>Language Filter</label>
                <select
                  value={voiceLocaleFilter}
                  onChange={(e) => setVoiceLocaleFilter(e.target.value)}
                  className="editor-select"
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="en-IN">English (India)</option>
                  <option value="ALL">All Languages ({voices.length})</option>
                </select>
              </div>

              <div className="form-group flex-2">
                <label>Selected Voice</label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="editor-select"
                >
                  {filteredVoices.map((v) => (
                    <option key={v.shortName} value={v.shortName}>
                      {v.friendlyName} ({v.gender})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {voiceError && (
              <div className="editor-alert error">
                <AlertCircle size={14} />
                <span>{voiceError}</span>
              </div>
            )}
          </div>
        </aside>

        {/* ── Center Stage: Video Canvas & Playback ── */}
        <section className="editor-center-stage">
          <div className="editor-canvas-container">
            <div
              className={`editor-canvas-viewport ${
                aspectRatio === "16:9" ? "ratio-16-9" : aspectRatio === "1:1" ? "ratio-1-1" : "ratio-9-16"
              }`}
            >
              {generatedResult ? (
                <video
                  ref={videoRef}
                  src={generatedResult.video_url}
                  className="editor-video-element"
                  playsInline
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={togglePlayPause}
                />
              ) : selectedVideo ? (
                <video
                  ref={videoRef}
                  src={selectedVideo.url}
                  className="editor-video-element"
                  playsInline
                  muted
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={togglePlayPause}
                />
              ) : (
                <div className="editor-canvas-empty">
                  <FileVideo size={48} />
                  <p>No video available</p>
                  <span>Check that valid MP4 videos exist inside the input/ folder</span>
                </div>
              )}

              {/* Dynamic Live Caption Overlay (only before generation when previewing draft) */}
              {captionsEnabled && !generatedResult && (
                <div className={`editor-live-caption-overlay pos-${captionPosition}`}>
                  <div
                    className={`editor-caption-box preset-${captionPreset}`}
                    style={{
                      fontFamily: fontName,
                      fontSize: `${(16 * (captionSizeScale / 100)).toFixed(1)}px`,
                      color: primaryColor,
                      textAlign: alignment === 2 ? "center" : alignment === 8 ? "left" : "center",
                      textShadow: hasShadow ? `0 2px 8px ${outlineColor}` : "none",
                      WebkitTextStroke: hasOutline ? `1.5px ${outlineColor}` : "none",
                    }}
                  >
                    <span className="caption-highlight" style={{ color: highlightColor }}>
                      {currentLiveCaption.active}
                    </span>{" "}
                    <span>{currentLiveCaption.remaining}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Canvas Transport Bar */}
            <div className="editor-transport-bar">
              <div className="editor-timecode">
                <span>{resolution}</span>
                <strong>{formatTimecode(currentTime)}</strong>
                <small>/ {formatTimecode(duration || 30)}</small>
              </div>

              <div className="editor-transport-controls">
                <button className="transport-btn" onClick={() => stepFrame(-1)} title="Step -1s">
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="transport-btn play-btn"
                  onClick={togglePlayPause}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button className="transport-btn" onClick={() => stepFrame(1)} title="Step +1s">
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="editor-transport-actions">
                <button
                  className="transport-btn"
                  onClick={() => {
                    if (videoRef.current) {
                      if (document.fullscreenElement) document.exitFullscreen();
                      else videoRef.current.requestFullscreen?.();
                    }
                  }}
                  title="Fullscreen"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Timeline View */}
          <div className="editor-timeline">
            {/* Timeline Ruler */}
            <div
              className="timeline-ruler"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                handleSeek(ratio * (duration || 30));
              }}
            >
              <div
                className="timeline-playhead-line"
                style={{
                  left: `${((currentTime / (duration || 30)) * 100).toFixed(2)}%`,
                }}
              >
                <div className="playhead-pill">{formatTimecode(currentTime)}</div>
              </div>
              <div className="ruler-marks">
                <span>00:00.00</span>
                <span>00:05.00</span>
                <span>00:10.00</span>
                <span>00:15.00</span>
                <span>00:20.00</span>
                <span>00:25.00</span>
                <span>00:30.00</span>
              </div>
            </div>

            {/* Timeline Tracks */}
            <div className="timeline-tracks">
              {/* VIDEO Track */}
              <div className="timeline-track">
                <div className="track-label">
                  <Video size={12} />
                  <span>VIDEO</span>
                </div>
                <div className="track-content">
                  <div className="track-block video-block">
                    <Film size={12} />
                    <span className="track-block-name">
                      {selectedVideo?.name || "Background Video"}
                    </span>
                    <span className="track-block-badge">
                      {duration ? `${Math.round(duration)}s` : "0:30"}
                    </span>
                  </div>
                </div>
              </div>

              {/* VOICE Track */}
              <div className="timeline-track">
                <div className="track-label">
                  <Mic size={12} />
                  <span>VOICE</span>
                </div>
                <div className="track-content">
                  <div className="track-block voice-block">
                    <Volume2 size={12} />
                    <span className="track-block-name">
                      {voices.find((v) => v.shortName === selectedVoice)?.friendlyName || selectedVoice}
                    </span>
                    <div className="waveform-mock">
                      <span /><span /><span /><span /><span /><span /><span /><span /><span /><span />
                    </div>
                  </div>
                </div>
              </div>

              {/* CAPTIONS Track */}
              {captionsEnabled && (
                <div className="timeline-track">
                  <div className="track-label">
                    <Type size={12} />
                    <span>CAPTIONS</span>
                  </div>
                  <div className="track-content captions-track-content">
                    {scriptPhrases.map((phrase, idx) => (
                      <div key={idx} className="track-block caption-block">
                        <span>{phrase}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Right Column: Captions Styling & Format Inspector ── */}
        <aside className="editor-inspector">
          {/* Export / Quick Settings Card */}
          <div className="inspector-card export-box">
            <div className="inspector-row">
              <label>Resolution</label>
              <div className="chip-group">
                {(["720p", "1080p", "4K"] as const).map((res) => (
                  <button
                    key={res}
                    className={`chip-btn ${resolution === res ? "active" : ""}`}
                    onClick={() => setResolution(res)}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>

            <div className="inspector-row">
              <label>Aspect Ratio</label>
              <div className="chip-group">
                {(["9:16", "16:9", "1:1"] as const).map((ratio) => (
                  <button
                    key={ratio}
                    className={`chip-btn ${aspectRatio === ratio ? "active" : ""}`}
                    onClick={() => setAspectRatio(ratio)}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="primary-action-btn"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              <Sparkles size={16} /> Generate Video
            </button>
          </div>

          {/* Captions Styling Settings */}
          <div className="inspector-card">
            <div className="inspector-card-header">
              <div className="header-title">
                <Type size={16} className="text-blue" />
                <strong>Caption Settings</strong>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={captionsEnabled}
                  onChange={(e) => setCaptionsEnabled(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>

            {captionsEnabled ? (
              <div className="inspector-body">
                <div className="form-group">
                  <label>Preset Style</label>
                  <div className="preset-grid">
                    {PRESET_OPTIONS.map((p) => (
                      <button
                        key={p.id}
                        className={`preset-card ${captionPreset === p.id ? "active" : ""}`}
                        onClick={() => setCaptionPreset(p.id)}
                      >
                        <span className="preset-pill" style={{ color: p.color }}>
                          {p.label}
                        </span>
                        <small>{p.desc}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Font Family</label>
                  <select
                    value={fontName}
                    onChange={(e) => setFontName(e.target.value)}
                    className="editor-select"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Caption Size Slider (50% to 200%) */}
                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label style={{ margin: 0 }}>Caption Size ({captionSizeScale}%)</label>
                    <span style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "IBM Plex Mono, monospace" }}>
                      {captionSizeScale <= 75 ? "Small" : captionSizeScale >= 130 ? "Large" : "Default"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="5"
                    value={captionSizeScale}
                    onChange={(e) => setCaptionSizeScale(parseInt(e.target.value, 10))}
                    className="inspector-range"
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "var(--dim)", paddingTop: "2px" }}>
                    <span>Small (50%)</span>
                    <span>Default (100%)</span>
                    <span>Large (200%)</span>
                  </div>
                </div>

                <div className="form-group">
                  <label>Position</label>
                  <div className="chip-group">
                    {(["bottom", "center", "top"] as const).map((pos) => (
                      <button
                        key={pos}
                        className={`chip-btn ${captionPosition === pos ? "active" : ""}`}
                        onClick={() => setCaptionPosition(pos)}
                      >
                        {pos.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Words Per Caption ({maxWordsPerCaption})</label>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    value={maxWordsPerCaption}
                    onChange={(e) => setMaxWordsPerCaption(parseInt(e.target.value))}
                    className="inspector-range"
                  />
                </div>
              </div>
            ) : (
              <p className="subtle-note">
                Captions are disabled. The video will be rendered with voiceover only.
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* ── 3. Generation Progress Modal ──────────────────────────────────────── */}
      {isGenerating && (
        <div className="editor-modal-overlay">
          <div className="generation-modal">
            <div className="generation-spinner">
              <Sparkles size={28} className="spin-icon text-blue" />
            </div>
            <h3>Generating Faceless Video</h3>
            <p className="generation-stage-text">
              {generationStage === "preparing" && "Preparing project assets & selecting random source video..."}
              {generationStage === "generating_voice" && "Generating AI narration with Edge TTS..."}
              {generationStage === "transcribing" && "Transcribing voiceover & calculating word timestamps with Whisper..."}
              {generationStage === "rendering_captions" && "Styling and rendering animated ASS captions..."}
              {generationStage === "rendering_video" && "Rendering final vertical MP4 with FFmpeg..."}
              {generationStage === "completed" && "Video generation completed successfully!"}
            </p>

            <div className="generation-progress-bar">
              <div
                className="progress-fill"
                style={{
                  width:
                    generationStage === "preparing"
                      ? "15%"
                      : generationStage === "generating_voice"
                      ? "35%"
                      : generationStage === "transcribing"
                      ? "60%"
                      : generationStage === "rendering_captions"
                      ? "80%"
                      : generationStage === "rendering_video"
                      ? "95%"
                      : "100%",
                }}
              />
            </div>
            <small className="generation-note">
              Processing locally via Python pipeline. The UI remains fully responsive.
            </small>
          </div>
        </div>
      )}

      {/* ── 4. Generation Success Modal ────────────────────────────────────────── */}
      {generatedResult && !isGenerating && (
        <div className="editor-modal-overlay">
          <div className="generation-success-modal">
            <div className="success-header">
              <div className="success-icon">
                <Check size={22} />
              </div>
              <div className="success-info">
                <h3>Video Exported Successfully!</h3>
                <p>Saved to My Projects and ready to watch or download.</p>
              </div>
              <button
                className="close-btn"
                onClick={() => setGeneratedResult(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="success-video-preview">
              <video
                controls
                autoPlay
                src={generatedResult.video_url}
                className="success-video"
              />
            </div>

            <div className="success-meta-row">
              <div>
                <span>Project Name:</span> <b>{generatedResult.title || projectTitle}</b>
              </div>
              <div>
                <span>Source Video:</span> <b>{generatedResult.source_video || "Selected Video"}</b>
              </div>
            </div>

            <div className="success-actions">
              <button
                className="editor-download-btn"
                onClick={handleDownloadResult}
              >
                <Download size={15} /> Download Video
              </button>
              <button
                className="secondary-btn"
                onClick={() => {
                  setGeneratedResult(null);
                  onNavigateProjects();
                }}
              >
                <FolderKanban size={15} /> View in My Projects
              </button>
              <button
                className="text-btn"
                onClick={() => setGeneratedResult(null)}
              >
                Continue Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Generation Error Modal ─────────────────────────────────────────── */}
      {generationError && (
        <div className="editor-modal-overlay">
          <div className="generation-error-modal">
            <div className="error-icon">
              <X size={24} />
            </div>
            <h3>Video Generation Failed</h3>
            <p className="error-message">{generationError}</p>
            <div className="error-actions">
              <button
                className="secondary-btn"
                onClick={() => setGenerationError(null)}
              >
                Close
              </button>
              <button
                className="primary-action-btn"
                onClick={() => {
                  setGenerationError(null);
                  handleGenerate();
                }}
              >
                Retry Generation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
