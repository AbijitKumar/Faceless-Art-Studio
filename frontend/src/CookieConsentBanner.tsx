import React, { useState, useEffect } from "react";
import { Shield } from "lucide-react";

export const COOKIE_CONSENT_STORAGE_KEY = "faceless-art-studio-cookie-consent";

export type CookieConsentChoice = "accepted" | "declined";

interface CookieConsentBannerProps {
  onNavigate: (page: "privacy" | "terms") => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onNavigate }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
      if (!stored) {
        setIsVisible(true);
      }
    } catch {
      // In case localStorage is blocked by browser settings
      setIsVisible(true);
    }
  }, []);

  const handleChoice = (choice: CookieConsentChoice) => {
    try {
      localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, choice);
    } catch {
      // Ignore storage write errors
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      className="cookie-consent-banner"
      role="region"
      aria-label="Cookie and privacy preferences"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
    >
      <div className="cookie-consent-content">
        <div className="cookie-consent-icon-box" aria-hidden="true">
          <Shield size={20} />
        </div>
        <div className="cookie-consent-text">
          <h2 id="cookie-consent-title" className="cookie-consent-title">
            Your privacy matters
          </h2>
          <p id="cookie-consent-desc" className="cookie-consent-desc">
            Faceless Art Studio uses essential browser storage to keep the application working, such as remembering your preferences and maintaining your session. We don&apos;t use advertising cookies.
          </p>
          <div className="cookie-consent-links">
            <span>Learn more in our</span>
            <button
              type="button"
              className="cookie-consent-link"
              onClick={() => onNavigate("privacy")}
              aria-label="View Privacy Policy"
            >
              Privacy Policy
            </button>
            <span>and</span>
            <button
              type="button"
              className="cookie-consent-link"
              onClick={() => onNavigate("terms")}
              aria-label="View Terms of Service"
            >
              Terms of Service
            </button>.
          </div>
        </div>
      </div>

      <div className="cookie-consent-actions">
        <div className="cookie-consent-btn-group">
          <button
            type="button"
            className="cookie-btn-decline"
            onClick={() => handleChoice("declined")}
            aria-label="Decline optional cookies"
          >
            Decline
          </button>
          <button
            type="button"
            className="cookie-btn-accept"
            onClick={() => handleChoice("accepted")}
            aria-label="Accept essential browser storage"
          >
            Accept
          </button>
        </div>
        <span className="cookie-consent-note">
          Declining optional cookies does not affect essential studio features.
        </span>
      </div>
    </aside>
  );
};
