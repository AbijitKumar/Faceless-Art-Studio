import { useState, useEffect } from "react";
import {
  ChevronDown, LayoutDashboard, FolderKanban,
  Video, LayoutTemplate, Image, Settings,
  FileText, Mic, Subtitles, Play, Cpu, Eye, Download,
  Mail, ArrowRight, CheckCircle2, Info
} from "lucide-react";

export type HelpSectionId = "about" | "video-flow" | "bug-report";

interface HelpPageProps {
  initialSection?: HelpSectionId;
}

export function HelpPage({ initialSection = "about" }: HelpPageProps) {
  const [expandedSection, setExpandedSection] = useState<HelpSectionId | null>(initialSection);

  useEffect(() => {
    if (initialSection) {
      setExpandedSection(initialSection);
    }
  }, [initialSection]);

  const toggleSection = (id: HelpSectionId) => {
    setExpandedSection((prev) => (prev === id ? null : id));
  };

  return (
    <main className="content help-content">
      {/* ── Page Header ── */}
      <section className="hero">
        <div>
          <small className="eyebrow">GUIDANCE & SUPPORT</small>
          <h1>Help</h1>
          <p>Find quick information about Faceless Art Studio, learn how to create a video, or report a problem.</p>
        </div>
      </section>

      {/* ── Accordion Stack (Exactly 3 Sections) ── */}
      <div className="help-accordion-stack">
        {/* ── SECTION 1: ABOUT ── */}
        <article className={`panel help-card ${expandedSection === "about" ? "expanded" : ""}`}>
          <button
            type="button"
            className="help-card-header"
            onClick={() => toggleSection("about")}
            aria-expanded={expandedSection === "about"}
            aria-controls="help-section-about"
          >
            <div className="help-card-header-left">
              <span className="help-card-num">01</span>
              <div>
                <h2>About</h2>
                <span className="help-card-tagline">What Faceless Art Studio is and how pages are organized</span>
              </div>
            </div>
            <span className="help-chevron" aria-hidden="true">
              <ChevronDown size={20} />
            </span>
          </button>

          {expandedSection === "about" && (
            <div id="help-section-about" className="help-card-body" role="region">
              <div className="about-overview-box">
                <p>
                  <strong>Faceless Art Studio</strong> is an AI-powered media suite designed to create engaging
                  vertical short videos (9:16) without showing your face. Simply provide a script, pick background
                  footage, select an AI voice narration, and the studio automatically handles speech synthesis,
                  word-level transcription, and synchronized kinetic captions.
                </p>
              </div>

              <div className="pages-guide-grid">
                <div className="page-guide-card">
                  <div className="page-guide-icon"><LayoutDashboard size={18} /></div>
                  <div className="page-guide-text">
                    <strong>Dashboard</strong>
                    <p>The starting point for accessing recent creations, activity logs, and quick workflow actions.</p>
                  </div>
                </div>

                <div className="page-guide-card">
                  <div className="page-guide-icon"><FolderKanban size={18} /></div>
                  <div className="page-guide-text">
                    <strong>My Projects</strong>
                    <p>Manage, inspect, duplicate, rename, or delete your previously created video projects.</p>
                  </div>
                </div>

                <div className="page-guide-card">
                  <div className="page-guide-icon"><Video size={18} /></div>
                  <div className="page-guide-text">
                    <strong>Create Video</strong>
                    <p>Provide a script, pick background video & voice, style captions, and generate final MP4 videos.</p>
                  </div>
                </div>

                <div className="page-guide-card">
                  <div className="page-guide-icon"><LayoutTemplate size={18} /></div>
                  <div className="page-guide-text">
                    <strong>Templates</strong>
                    <p>Browse curated, ready-made video configurations with pre-tuned caption styles, fonts, and voices.</p>
                  </div>
                </div>

                <div className="page-guide-card">
                  <div className="page-guide-icon"><Image size={18} /></div>
                  <div className="page-guide-text">
                    <strong>Media Library</strong>
                    <p>Browse and manage source videos, audio tracks, generated outputs, and track storage usage.</p>
                  </div>
                </div>

                <div className="page-guide-card">
                  <div className="page-guide-icon"><Settings size={18} /></div>
                  <div className="page-guide-text">
                    <strong>Settings</strong>
                    <p>Configure display name, theme mode, auto-save drafts, delete confirmation, and landing screen.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </article>

        {/* ── SECTION 2: VIDEO CREATION ── */}
        <article className={`panel help-card ${expandedSection === "video-flow" ? "expanded" : ""}`}>
          <button
            type="button"
            className="help-card-header"
            onClick={() => toggleSection("video-flow")}
            aria-expanded={expandedSection === "video-flow"}
            aria-controls="help-section-video-flow"
          >
            <div className="help-card-header-left">
              <span className="help-card-num">02</span>
              <div>
                <h2>Video Creation</h2>
                <span className="help-card-tagline">Visual step-by-step pipeline from script to final video</span>
              </div>
            </div>
            <span className="help-chevron" aria-hidden="true">
              <ChevronDown size={20} />
            </span>
          </button>

          {expandedSection === "video-flow" && (
            <div id="help-section-video-flow" className="help-card-body" role="region">
              <p className="flow-intro">
                Follow this sequential 8-step workflow to generate high-retention faceless videos in the editor:
              </p>

              <div className="flowchart-container">
                {/* Step 1 */}
                <div className="flow-step">
                  <div className="flow-step-badge">
                    <span className="flow-num">1</span>
                    <FileText size={16} />
                  </div>
                  <div className="flow-step-content">
                    <strong>Script</strong>
                    <p>Enter or upload the text you want spoken in the video.</p>
                  </div>
                </div>

                <div className="flow-arrow" aria-hidden="true">↓</div>

                {/* Step 2 */}
                <div className="flow-step">
                  <div className="flow-step-badge">
                    <span className="flow-num">2</span>
                    <Video size={16} />
                  </div>
                  <div className="flow-step-content">
                    <strong>Source Video</strong>
                    <p>Choose the background/source video that will be used.</p>
                  </div>
                </div>

                <div className="flow-arrow" aria-hidden="true">↓</div>

                {/* Step 3 */}
                <div className="flow-step">
                  <div className="flow-step-badge">
                    <span className="flow-num">3</span>
                    <Mic size={16} />
                  </div>
                  <div className="flow-step-content">
                    <strong>Voice</strong>
                    <p>Select the voice that will narrate your script.</p>
                  </div>
                </div>

                <div className="flow-arrow" aria-hidden="true">↓</div>

                {/* Step 4 */}
                <div className="flow-step">
                  <div className="flow-step-badge">
                    <span className="flow-num">4</span>
                    <Subtitles size={16} />
                  </div>
                  <div className="flow-step-content">
                    <strong>Captions</strong>
                    <p>Choose whether captions are enabled and configure their style.</p>
                  </div>
                </div>

                <div className="flow-arrow" aria-hidden="true">↓</div>

                {/* Step 5 */}
                <div className="flow-step">
                  <div className="flow-step-badge">
                    <span className="flow-num">5</span>
                    <Play size={16} />
                  </div>
                  <div className="flow-step-content">
                    <strong>Generate</strong>
                    <p>Start the video generation process.</p>
                  </div>
                </div>

                <div className="flow-arrow" aria-hidden="true">↓</div>

                {/* Step 6 */}
                <div className="flow-step flow-step--highlight">
                  <div className="flow-step-badge">
                    <span className="flow-num">6</span>
                    <Cpu size={16} />
                  </div>
                  <div className="flow-step-content">
                    <strong>Processing</strong>
                    <p>The application generates the voice, creates the transcript, renders captions, and produces the final video.</p>
                  </div>
                </div>

                <div className="flow-arrow" aria-hidden="true">↓</div>

                {/* Step 7 */}
                <div className="flow-step">
                  <div className="flow-step-badge">
                    <span className="flow-num">7</span>
                    <Eye size={16} />
                  </div>
                  <div className="flow-step-content">
                    <strong>Preview</strong>
                    <p>Watch the generated video directly in the editor player.</p>
                  </div>
                </div>

                <div className="flow-arrow" aria-hidden="true">↓</div>

                {/* Step 8 */}
                <div className="flow-step">
                  <div className="flow-step-badge">
                    <span className="flow-num">8</span>
                    <Download size={16} />
                  </div>
                  <div className="flow-step-content">
                    <strong>Download</strong>
                    <p>Download the final MP4 or access it through My Projects / Media Library.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </article>

        {/* ── SECTION 3: REPORT A BUG ── */}
        <article className={`panel help-card ${expandedSection === "bug-report" ? "expanded" : ""}`}>
          <button
            type="button"
            className="help-card-header"
            onClick={() => toggleSection("bug-report")}
            aria-expanded={expandedSection === "bug-report"}
            aria-controls="help-section-bug-report"
          >
            <div className="help-card-header-left">
              <span className="help-card-num">03</span>
              <div>
                <h2>Report a Bug</h2>
                <span className="help-card-tagline">Send feedback or report broken functionality</span>
              </div>
            </div>
            <span className="help-chevron" aria-hidden="true">
              <ChevronDown size={20} />
            </span>
          </button>

          {expandedSection === "bug-report" && (
            <div id="help-section-bug-report" className="help-card-body" role="region">
              <div className="bug-report-intro">
                <p>
                  Encountered an unexpected error, issue, or broken behavior? You can send a direct report to the
                  developer to investigate and fix.
                </p>
              </div>

              <div className="bug-guide-box">
                <strong>Helpful information to include in your report:</strong>
                <ul className="bug-checklist">
                  <li>
                    <CheckCircle2 size={14} className="bug-check-icon" />
                    <span><strong>What happened:</strong> A clear description of the issue or error message.</span>
                  </li>
                  <li>
                    <CheckCircle2 size={14} className="bug-check-icon" />
                    <span><strong>What you expected:</strong> What the application was supposed to do.</span>
                  </li>
                  <li>
                    <CheckCircle2 size={14} className="bug-check-icon" />
                    <span><strong>Page / feature:</strong> The specific screen you were using (e.g. Video Editor, Media Library).</span>
                  </li>
                  <li>
                    <CheckCircle2 size={14} className="bug-check-icon" />
                    <span><strong>Steps to reproduce:</strong> Step-by-step instructions to recreate the problem.</span>
                  </li>
                  <li>
                    <CheckCircle2 size={14} className="bug-check-icon" />
                    <span><strong>Screenshot:</strong> Attach a screenshot or error log if available.</span>
                  </li>
                </ul>
              </div>

              <div className="bug-action-wrap">
                <a
                  href="mailto:abijitbuilds@gmail.com?subject=Faceless%20Art%20Studio%20Bug%20Report"
                  className="primary bug-email-btn"
                >
                  <Mail size={16} />
                  <span>Report a problem →</span>
                </a>
                <small className="bug-email-target">
                  <Info size={12} />
                  Opens your email client addressed to <code>abijitbuilds@gmail.com</code>
                </small>
              </div>
            </div>
          )}
        </article>
      </div>
    </main>
  );
}
