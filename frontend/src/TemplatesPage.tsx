import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Sparkles,
  ArrowRight,
  Eye,
  Heart,
  X,
  Play,
  Clock,
  Flame,
  Zap,
  SlidersHorizontal,
  Bookmark,
  Layers,
  Volume2,
  Type,
  LayoutTemplate,
  Check,
} from "lucide-react";
import {
  TemplateConfig,
  TEMPLATES_DATA,
  TEMPLATE_CATEGORIES,
  TemplateCategory,
  getFavoriteTemplateIds,
  toggleFavoriteTemplateId,
} from "./templates";

interface TemplatesPageProps {
  onUseTemplate: (template: TemplateConfig) => void;
  onNavigateEditor: () => void;
}

type SortOption = "recommended" | "trending" | "newest" | "duration";

export function TemplatesPage({ onUseTemplate, onNavigateEditor }: TemplatesPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | "Favorites">("All");
  const [sortOption, setSortOption] = useState<SortOption>("recommended");
  const [previewTemplate, setPreviewTemplate] = useState<TemplateConfig | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Load Favorites from LocalStorage on mount ─────────────────────────────
  useEffect(() => {
    setFavoriteIds(getFavoriteTemplateIds());
  }, []);

  // ── Keyboard shortcut (Cmd/Ctrl + K to focus search, Esc to close modal) ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape" && previewTemplate) {
        setPreviewTemplate(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewTemplate]);

  const handleToggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = toggleFavoriteTemplateId(id);
    setFavoriteIds(next);
  };

  // ── Featured Template ─────────────────────────────────────────────────────
  const featuredTemplate = useMemo(() => {
    return TEMPLATES_DATA.find((t) => t.badge === "FEATURED") || TEMPLATES_DATA[0];
  }, []);

  // ── Filtered & Sorted Templates ───────────────────────────────────────────
  const filteredTemplates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return TEMPLATES_DATA.filter((t) => {
      // 1. Search filter
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // 2. Category filter
      if (selectedCategory === "All") return true;
      if (selectedCategory === "Favorites") return favoriteIds.includes(t.id);
      if (selectedCategory === "Trending") return t.badge === "TRENDING" || t.badge === "POPULAR";
      return t.category.toLowerCase() === selectedCategory.toLowerCase();
    }).sort((a, b) => {
      if (sortOption === "trending") {
        const order = { FEATURED: 4, TRENDING: 3, POPULAR: 2, NEW: 1 };
        return (order[b.badge || "NEW"] || 0) - (order[a.badge || "NEW"] || 0);
      }
      if (sortOption === "newest") {
        return a.badge === "NEW" ? -1 : 1;
      }
      if (sortOption === "duration") {
        return a.duration.localeCompare(b.duration);
      }
      return 0; // recommended order
    });
  }, [searchQuery, selectedCategory, sortOption, favoriteIds]);

  return (
    <main className="content templates-page-root">
      {/* ── 1. Page Hero / Header ─────────────────────────────────────────── */}
      <section className="templates-hero">
        <div className="templates-hero-content">
          <span className="eyebrow">TEMPLATE LIBRARY</span>
          <h1 className="templates-hero-title">Start with a style.</h1>
          <p className="templates-hero-desc">
            Skip the blank canvas. Pick a proven format and turn your script into a polished faceless video.
          </p>
        </div>

        {/* Global Search */}
        <div className="templates-search-wrapper">
          <div className="templates-search-bar">
            <Search size={16} className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search templates, styles, topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="templates-search-input"
            />
            {searchQuery ? (
              <button
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            ) : (
              <kbd className="search-kbd-shortcut">⌘ K</kbd>
            )}
          </div>
        </div>
      </section>

      {/* ── 2. Featured Template Banner (Visible on 'All' category & no active search) ── */}
      {selectedCategory === "All" && !searchQuery && featuredTemplate && (
        <section className="featured-template-banner">
          <div className="featured-banner-left">
            <div className="featured-badge-pill">
              <Sparkles size={13} />
              <span>FEATURED TEMPLATE</span>
            </div>
            <h2 className="featured-title">{featuredTemplate.name}</h2>
            <div className="featured-meta-chips">
              <span className="featured-category">{featuredTemplate.category.toUpperCase()}</span>
              <span>•</span>
              <span className="featured-spec">{featuredTemplate.aspectRatio}</span>
              <span>•</span>
              <span className="featured-spec">{featuredTemplate.duration}</span>
            </div>
            <p className="featured-description">{featuredTemplate.description}</p>
            <div className="featured-tags-row">
              {featuredTemplate.tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="featured-actions">
              <button
                className="primary featured-cta-btn"
                onClick={() => onUseTemplate(featuredTemplate)}
              >
                <Sparkles size={16} /> Use Template
              </button>
              <button
                className="secondary featured-preview-btn"
                onClick={() => setPreviewTemplate(featuredTemplate)}
              >
                <Eye size={15} /> Preview Style
              </button>
            </div>
          </div>

          <div className="featured-banner-right" onClick={() => setPreviewTemplate(featuredTemplate)}>
            <div className="featured-preview-card">
              <div
                className="featured-preview-inner"
                style={{ background: featuredTemplate.previewTheme.bgGradient }}
              >
                <div className="featured-visual-tag">
                  {featuredTemplate.previewTheme.previewTag}
                </div>
                <div className="featured-visual-center">
                  <span className="featured-headline">
                    {featuredTemplate.previewTheme.previewHeadline}
                  </span>
                  <small className="featured-sub">
                    {featuredTemplate.previewTheme.previewSub}
                  </small>
                </div>
                <div className="featured-caption-box">
                  <span
                    className="caption-glow"
                    style={{ color: featuredTemplate.previewTheme.accentColor }}
                  >
                    {featuredTemplate.previewTheme.previewCaptionActive}
                  </span>{" "}
                  <span>{featuredTemplate.previewTheme.previewCaptionRemaining}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 3. Category Filter & Toolbar ──────────────────────────────────── */}
      <section className="templates-toolbar-section">
        {/* Category Scroll Bar */}
        <div className="templates-category-scroll">
          {TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`category-pill-btn ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === "Trending" && <Flame size={13} className="cat-icon" />}
              {cat}
            </button>
          ))}
          <button
            className={`category-pill-btn ${selectedCategory === "Favorites" ? "active" : ""}`}
            onClick={() => setSelectedCategory("Favorites")}
          >
            <Heart size={13} className="cat-icon" /> Favorites ({favoriteIds.length})
          </button>
        </div>

        {/* Toolbar Controls */}
        <div className="templates-controls-row">
          <div className="templates-results-count">
            Showing <b>{filteredTemplates.length}</b> {filteredTemplates.length === 1 ? "template" : "templates"}
            {selectedCategory !== "All" && (
              <span> in <i>{selectedCategory}</i></span>
            )}
          </div>

          <div className="templates-sort-group">
            <SlidersHorizontal size={13} className="sort-icon" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="templates-sort-select"
            >
              <option value="recommended">Recommended</option>
              <option value="trending">Trending First</option>
              <option value="newest">Newest Releases</option>
              <option value="duration">Duration</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── 4. Template Cards Grid ─────────────────────────────────────────── */}
      {filteredTemplates.length === 0 ? (
        <section className="templates-empty-state">
          <div className="empty-icon-wrap">
            <LayoutTemplate size={28} />
          </div>
          <h3>No templates found</h3>
          <p>
            {searchQuery
              ? `No templates matched "${searchQuery}". Try another search term or browse all categories.`
              : "No templates saved to your favorites yet. Click the heart icon on any template to bookmark it."}
          </p>
          <button
            className="secondary"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
            }}
          >
            Reset Filters
          </button>
        </section>
      ) : (
        <section className="templates-grid">
          {filteredTemplates.map((template) => {
            const isFav = favoriteIds.includes(template.id);

            return (
              <article key={template.id} className="template-card">
                {/* 9:16 Aspect Visual Composition */}
                <div
                  className="template-card-preview"
                  style={{ background: template.previewTheme.bgGradient }}
                  onClick={() => setPreviewTemplate(template)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setPreviewTemplate(template)}
                  aria-label={`Preview ${template.name}`}
                >
                  {/* Top Badges */}
                  <div className="preview-top-bar">
                    {template.badge && (
                      <span className={`template-badge badge-${template.badge.toLowerCase()}`}>
                        {template.badge === "TRENDING" && <Flame size={10} />}
                        {template.badge === "POPULAR" && <Zap size={10} />}
                        {template.badge}
                      </span>
                    )}
                    <button
                      className={`favorite-btn ${isFav ? "favorited" : ""}`}
                      onClick={(e) => handleToggleFavorite(e, template.id)}
                      title={isFav ? "Remove from favorites" : "Save to favorites"}
                      aria-label={isFav ? "Remove favorite" : "Add favorite"}
                    >
                      <Heart size={14} fill={isFav ? "#f06a6a" : "none"} color={isFav ? "#f06a6a" : "#fff"} />
                    </button>
                  </div>

                  {/* Visual Composition Center */}
                  <div className="preview-center-content">
                    <span className="preview-theme-tag">{template.previewTheme.previewTag}</span>
                    <h3 className="preview-headline">{template.previewTheme.previewHeadline}</h3>
                    <p className="preview-sub">{template.previewTheme.previewSub}</p>
                  </div>

                  {/* Simulated Animated Caption Sample */}
                  <div className="preview-caption-container">
                    <div
                      className={`preview-caption-bubble preset-${template.captionPreset}`}
                      style={{
                        fontFamily: template.fontName,
                      }}
                    >
                      <span
                        className="caption-highlight"
                        style={{ color: template.previewTheme.accentColor }}
                      >
                        {template.previewTheme.previewCaptionActive}
                      </span>{" "}
                      <span>{template.previewTheme.previewCaptionRemaining}</span>
                    </div>
                  </div>

                  {/* Hover Overlay */}
                  <div className="preview-hover-overlay">
                    <div className="preview-quick-btn">
                      <Eye size={16} /> Quick Preview
                    </div>
                  </div>
                </div>

                {/* Card Info Details */}
                <div className="template-card-body">
                  <div className="template-info-header">
                    <span className="template-category-tag">{template.category}</span>
                    <div className="template-duration-chip">
                      <Clock size={11} /> {template.duration}
                    </div>
                  </div>

                  <h3 className="template-card-title" onClick={() => setPreviewTemplate(template)}>
                    {template.name}
                  </h3>
                  <p className="template-card-desc">{template.description}</p>

                  <div className="template-card-actions">
                    <button
                      className="primary template-use-btn"
                      onClick={() => onUseTemplate(template)}
                    >
                      <Sparkles size={14} /> Use Template
                    </button>
                    <button
                      className="secondary template-preview-btn"
                      onClick={() => setPreviewTemplate(template)}
                      title="Preview details"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* ── 5. Detailed Template Preview Modal ─────────────────────────────── */}
      {previewTemplate && (
        <div className="template-modal-overlay" onClick={() => setPreviewTemplate(null)}>
          <div
            className="template-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="template-modal-head">
              <div className="modal-head-title">
                <span className="category-pill-active">{previewTemplate.category.toUpperCase()}</span>
                <h2>{previewTemplate.name}</h2>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setPreviewTemplate(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="template-modal-body">
              {/* Left Column: 9:16 Visual Showcase */}
              <div className="modal-preview-stage">
                <div
                  className="modal-phone-viewport"
                  style={{ background: previewTemplate.previewTheme.bgGradient }}
                >
                  <div className="modal-preview-top">
                    <span className="spec-badge">{previewTemplate.aspectRatio}</span>
                    <span className="spec-badge">{previewTemplate.duration}</span>
                  </div>

                  <div className="modal-preview-middle">
                    <span className="modal-tag">{previewTemplate.previewTheme.previewTag}</span>
                    <h3 className="modal-headline">{previewTemplate.previewTheme.previewHeadline}</h3>
                    <p className="modal-sub">{previewTemplate.previewTheme.previewSub}</p>
                  </div>

                  <div className={`modal-caption-area pos-${previewTemplate.captionPosition}`}>
                    <div
                      className={`modal-caption-box preset-${previewTemplate.captionPreset}`}
                      style={{
                        fontFamily: previewTemplate.fontName,
                      }}
                    >
                      <span
                        className="caption-highlight"
                        style={{ color: previewTemplate.previewTheme.accentColor }}
                      >
                        {previewTemplate.previewTheme.previewCaptionActive}
                      </span>{" "}
                      <span>{previewTemplate.previewTheme.previewCaptionRemaining}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Template Specs & Preset Settings */}
              <div className="modal-details-panel">
                <div className="modal-desc-box">
                  <p>{previewTemplate.description}</p>
                </div>

                <div className="modal-specs-grid">
                  <div className="spec-item">
                    <span className="spec-label"><Type size={12}/> Caption Preset</span>
                    <span className="spec-value">{previewTemplate.captionPreset.toUpperCase()}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label"><Layers size={12}/> Position</span>
                    <span className="spec-value">{previewTemplate.captionPosition.toUpperCase()}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label"><SlidersHorizontal size={12}/> Caption Size</span>
                    <span className="spec-value">{previewTemplate.captionSizeScale}%</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label"><Type size={12}/> Font Family</span>
                    <span className="spec-value">{previewTemplate.fontName}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label"><Volume2 size={12}/> Recommended Voice</span>
                    <span className="spec-value">{previewTemplate.recommendedVoice.split("-").slice(-1)[0]}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label"><Clock size={12}/> Max Words / Chunk</span>
                    <span className="spec-value">{previewTemplate.maxWordsPerCaption} words</span>
                  </div>
                </div>

                {/* Starter Script Preview */}
                <div className="modal-script-preview">
                  <label>Sample Starter Script</label>
                  <p>&ldquo;{previewTemplate.sampleScript}&rdquo;</p>
                </div>

                {/* Tags */}
                <div className="modal-tags-list">
                  {previewTemplate.tags.map((tag) => (
                    <span key={tag} className="tag-chip">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="template-modal-footer">
              <button
                className="secondary"
                onClick={() => setPreviewTemplate(null)}
              >
                Close
              </button>
              <button
                className="primary modal-cta-btn"
                onClick={() => {
                  const t = previewTemplate;
                  setPreviewTemplate(null);
                  onUseTemplate(t);
                }}
              >
                <Sparkles size={16} /> Use This Template in Editor
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
