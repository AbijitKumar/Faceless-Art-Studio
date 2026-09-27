import React from "react";
import { ArrowLeft, FileText, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import logoSrc from "./assets/logo.png";

interface TermsPageProps {
  onBack: () => void;
  onNavigatePrivacy?: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onBack, onNavigatePrivacy }) => {
  return (
    <div className="legal-page-wrap">
      <header className="legal-header">
        <div className="legal-header-inner">
          <button onClick={onBack} className="legal-back-btn" aria-label="Go back">
            <ArrowLeft size={16} /> Back to Studio
          </button>
          <div className="legal-brand">
            <img src={logoSrc} alt="Faceless Art Studio Logo" className="legal-logo" />
            <span>Faceless Art Studio</span>
          </div>
        </div>
      </header>

      <main className="legal-container">
        <article className="legal-card">
          <div className="legal-badge">
            <FileText size={14} /> Terms &amp; Conditions
          </div>
          <h1>Terms of Service</h1>
          <p className="legal-subtitle">
            Effective Date: September 2026 &bull; Last updated: September 2026
          </p>

          <section className="legal-section">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using Faceless Art Studio (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree to all terms, do not access or use the application.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Permitted Use &amp; Content Guidelines</h2>
            <p>
              You agree to use Faceless Art Studio solely for lawful video creation and publishing purposes. You may not use the Service to:
            </p>
            <ul>
              <li>Create or distribute content that is defamatory, harassing, sexually explicit, abusive, or promotes hate speech.</li>
              <li>Infringe upon the intellectual property, copyright, trademark, or privacy rights of any third party.</li>
              <li>Upload malicious code, executables, viruses, or attempt unauthorized penetration or extraction of other accounts&rsquo; data.</li>
              <li>Bypass rate limits, authentication controls, or account isolation mechanisms.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Intellectual Property &amp; User Ownership</h2>
            <p>
              You retain all rights, title, and ownership in the scripts, media files, and creative prompts you provide to the studio. To the maximum extent permitted by applicable law, you own the resulting composite video files generated through your account.
            </p>
            <p>
              You represent and warrant that you hold all necessary rights, licenses, and permissions for any background footage, audio, or scripts uploaded to the Service.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Service Availability &amp; Rate Limits</h2>
            <p>
              Video processing involves intensive computational workflows (voice synthesis, Whisper transcription, and FFmpeg video compositing). We provide the service on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. Reasonable rate limits and upload constraints are enforced to ensure service stability for all creators.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Termination &amp; Account Deletion</h2>
            <p>
              You may terminate your account at any time using the Account Deletion feature within the Settings page. We reserve the right to suspend or terminate accounts that violate our safety policies or attempt security bypasses.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by applicable law, Faceless Art Studio and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your access to or inability to use the Service.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Contact &amp; Legal Notices</h2>
            <p>
              Questions regarding these Terms of Service may be directed to:
              <br />
              <strong>Legal / Contact Email:</strong> <code>[legal@yourdomain.com / Support contact to be specified]</code>
            </p>
            {onNavigatePrivacy && (
              <p style={{ marginTop: 16 }}>
                For information on how we handle your data, please see our{" "}
                <button
                  type="button"
                  onClick={onNavigatePrivacy}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--blue, #1e8cfa)",
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                    font: "inherit",
                  }}
                >
                  Privacy Policy
                </button>.
              </p>
            )}
          </section>
        </article>
      </main>
    </div>
  );
};
