import React, { useState, useEffect } from "react";
import {
  Mail,
  Lock,
  Phone,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ChevronLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  signInWithEmailOtp,
  verifyEmailOtp,
  signInWithPhoneOtp,
  verifyPhoneOtp,
  signInWithPassword,
  signInWithGoogle,
  signInWithGitHub,
} from "./authService";
import { useAuth } from "./useAuth";
import logoSrc from "../assets/logo.png";

interface LoginPageProps {
  onNavigate: (page: string) => void;
  onSuccess?: () => void;
}

type TabType = "password" | "email-otp" | "phone-otp";

const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)" },
  { code: "+1", label: "US / Canada (+1)" },
  { code: "+44", label: "United Kingdom (+44)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+49", label: "Germany (+49)" },
  { code: "+65", label: "Singapore (+65)" },
];

/* ── Inline responsive styles injected once ──────────────────────────────── */
const STYLE_ID = "lp-responsive-styles";
const RESPONSIVE_CSS = `
  @keyframes lp-pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  @media (max-width: 520px) {
    .lp-card {
      padding: 28px 18px !important;
      border-radius: 12px !important;
    }
    .lp-logo { height: 58px !important; }
    .lp-circuit { display: none !important; }
  }
  @media (max-width: 768px) {
    .lp-circuit-lg { display: none !important; }
  }
`;

function ensureStyles() {
  if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = RESPONSIVE_CSS;
    document.head.appendChild(el);
  }
}

/* ── Circuit corner SVG components ──────────────────────────────────────── */
function CircuitCorner({
  position,
}: {
  position: "tl" | "tr" | "bl" | "br";
}) {
  const size = 160;
  const flip = {
    tl: "scale(1,1)",
    tr: "scale(-1,1)",
    bl: "scale(1,-1)",
    br: "scale(-1,-1)",
  }[position];

  const style: React.CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    pointerEvents: "none",
    ...(position === "tl" ? { top: 0, left: 0 } : {}),
    ...(position === "tr" ? { top: 0, right: 0 } : {}),
    ...(position === "bl" ? { bottom: 0, left: 0 } : {}),
    ...(position === "br" ? { bottom: 0, right: 0 } : {}),
  };

  return (
    <div className="lp-circuit" style={style}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ transform: flip, transformOrigin: "center" }}
      >
        {/* Main diagonal line from corner inward */}
        <line x1="0" y1="0" x2="90" y2="90" stroke="#1E2832" strokeWidth="1" />

        {/* Chamfered horizontal line segment */}
        <polyline
          points="0,30 20,30 35,45 80,45"
          stroke="#1A2330"
          strokeWidth="1"
          fill="none"
        />

        {/* Chamfered vertical line segment */}
        <polyline
          points="30,0 30,20 45,35 45,80"
          stroke="#1A2330"
          strokeWidth="1"
          fill="none"
        />

        {/* Secondary horizontal trace */}
        <polyline
          points="0,52 10,52 22,64 70,64"
          stroke="#161E28"
          strokeWidth="0.8"
          fill="none"
        />

        {/* Connector pins along top edge */}
        <line x1="15" y1="0" x2="15" y2="6" stroke="#1E2832" strokeWidth="1.2" />
        <line x1="28" y1="0" x2="28" y2="5" stroke="#1E2832" strokeWidth="1.2" />
        <line x1="42" y1="0" x2="42" y2="4" stroke="#1E2832" strokeWidth="1.2" />

        {/* Connector pins along left edge */}
        <line x1="0" y1="15" x2="6" y2="15" stroke="#1E2832" strokeWidth="1.2" />
        <line x1="0" y1="28" x2="5" y2="28" stroke="#1E2832" strokeWidth="1.2" />
        <line x1="0" y1="42" x2="4" y2="42" stroke="#1E2832" strokeWidth="1.2" />

        {/* Node block at corner */}
        <rect x="0" y="0" width="8" height="8" fill="#141C26" stroke="#1E2832" strokeWidth="0.8" />

        {/* Inward-facing glow dot */}
        <circle cx="90" cy="90" r="3" fill="#1E3A50" opacity="0.8">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="90" cy="90" r="5" fill="none" stroke="#1E3A50" strokeWidth="0.6" opacity="0.4" />

        {/* Secondary node at trace intersection */}
        <circle cx="45" cy="45" r="2" fill="#1A2D40" opacity="0.6" />
        <rect x="78" y="43" width="4" height="4" fill="#141C26" stroke="#1E2832" strokeWidth="0.6" />
        <rect x="43" y="78" width="4" height="4" fill="#141C26" stroke="#1E2832" strokeWidth="0.6" />
      </svg>
    </div>
  );
}

/* ── Google SVG icon ─────────────────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.8z" />
    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1c0 2.8.7 5.4 1.9 7.8l3.7-3z" />
    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
  </svg>
);

/* ── GitHub SVG icon ─────────────────────────────────────────────────────── */
const GitHubIcon = () => (
  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

/* ── Field wrapper ───────────────────────────────────────────────────────── */
const fieldBase: React.CSSProperties = {
  width: "100%",
  backgroundColor: "#1A1A1A",
  border: "1px solid #2A2A2A",
  borderRadius: 8,
  padding: "12px 14px 12px 42px",
  color: "#F8FAFC",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "'Inter', sans-serif",
};

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onSuccess }) => {
  const { isConfigured, refreshSession } = useAuth();

  // Default to password login as primary
  const [activeTab, setActiveTab] = useState<TabType>("password");

  // Email OTP state
  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Phone OTP state
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneCooldown, setPhoneCooldown] = useState(0);

  // Password state
  const [passEmail, setPassEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Feedback & Loading
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Inject responsive styles once
  useEffect(() => { ensureStyles(); }, []);

  // Cooldown timers
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (phoneCooldown <= 0) return;
    const timer = setTimeout(() => setPhoneCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [phoneCooldown]);

  const handleEmailSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithEmailOtp(email.trim());
      setEmailOtpSent(true);
      setResendCooldown(60);
      setInfoMsg(`Verification code sent to ${email.trim()}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send email verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOtp.trim()) {
      setErrorMsg("Please enter the 6-digit verification code.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await verifyEmailOtp(email.trim(), emailOtp.trim());
      await refreshSession();
      if (onSuccess) onSuccess();
      else onNavigate("dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || "Verification failed. Please check the code.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanNum = phoneNumber.trim().replace(/\D/g, "");
    if (!cleanNum || cleanNum.length < 7) {
      setErrorMsg("Please enter a valid phone number.");
      return;
    }
    const fullPhone = `${countryCode}${cleanNum}`;
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithPhoneOtp(fullPhone);
      setPhoneOtpSent(true);
      setPhoneCooldown(60);
      setInfoMsg(`Verification code sent to ${fullPhone}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send SMS code.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneOtp.trim()) {
      setErrorMsg("Please enter the 6-digit verification code.");
      return;
    }
    const cleanNum = phoneNumber.trim().replace(/\D/g, "");
    const fullPhone = `${countryCode}${cleanNum}`;
    setErrorMsg(null);
    setLoading(true);
    try {
      await verifyPhoneOtp(fullPhone, phoneOtp.trim());
      await refreshSession();
      if (onSuccess) onSuccess();
      else onNavigate("dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || "Verification failed. Please check the code.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passEmail.trim() || !password) {
      setErrorMsg("Please enter both your email and password.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithPassword({
        email: passEmail.trim(),
        password,
      });
      await refreshSession();
      if (onSuccess) onSuccess();
      else onNavigate("dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initiate Google sign in.");
    }
  };

  const handleGitHub = async () => {
    setErrorMsg(null);
    try {
      await signInWithGitHub();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initiate GitHub sign in.");
    }
  };

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setErrorMsg(null);
    setInfoMsg(null);
  };

  /* ── Shared button styles ──────────────────────────────────────────────── */
  const primaryBtn = (isDisabled: boolean): React.CSSProperties => ({
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: isDisabled ? "#004C99" : "#007AFF",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    padding: "13px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.65 : 1,
    transition: "all 0.2s ease",
    letterSpacing: "0.02em",
    fontFamily: "'Inter', sans-serif",
  });

  const oauthBtn: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#161616",
    border: "1px solid #2A2A2A",
    borderRadius: 8,
    padding: "11px 14px",
    color: "#D4D4D4",
    fontSize: 13.5,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s ease",
    fontFamily: "'Inter', sans-serif",
  };

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: "8px 6px",
    borderRadius: 7,
    border: "none",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
    backgroundColor: active ? "#007AFF" : "transparent",
    color: active ? "#ffffff" : "#6B7280",
    fontFamily: "'Inter', sans-serif",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0A0A0A",
        padding: "32px 16px",
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Circuit corner decorations ── */}
      <CircuitCorner position="tl" />
      <CircuitCorner position="tr" />
      <CircuitCorner position="bl" />
      <CircuitCorner position="br" />

      {/* ── Login card ── */}
      <div
        className="lp-card"
        style={{
          width: "100%",
          maxWidth: 460,
          backgroundColor: "#141414",
          borderRadius: 14,
          border: "1px solid #1F1F1F",
          padding: "38px 36px",
          boxShadow: "0 24px 48px -16px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.03)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Back to Dashboard */}
        <button
          onClick={() => onNavigate("dashboard")}
          aria-label="Back to Dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: "none",
            color: "#6B7280",
            fontSize: 13,
            cursor: "pointer",
            marginBottom: 22,
            padding: 0,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <ChevronLeft size={16} />
          Back to Dashboard
        </button>

        {/* ── Branding header ── */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ marginBottom: 18 }}>
            <img
              src={logoSrc}
              alt="Faceless Art Studio"
              className="lp-logo"
              style={{
                height: 72,
                maxWidth: "100%",
                objectFit: "contain",
                display: "block",
                margin: "0 auto",
              }}
            />
          </div>
          <h1
            style={{
              fontFamily: "'Manrope', 'Inter', sans-serif",
              fontSize: 24,
              fontWeight: 800,
              color: "#F8FAFC",
              margin: "0 0 8px",
            }}
          >
            Welcome Back
          </h1>
          <p style={{ color: "#6B7280", fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            Don't have an account yet?{" "}
            <button
              type="button"
              onClick={() => onNavigate("signup")}
              style={{
                background: "none",
                border: "none",
                color: "#007AFF",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
                fontFamily: "inherit",
              }}
            >
              Sign up
            </button>
          </p>
        </div>

        {/* ── Unconfigured Notice ── */}
        {!isConfigured && (
          <div
            role="alert"
            style={{
              backgroundColor: "rgba(234, 179, 8, 0.1)",
              border: "1px solid rgba(234, 179, 8, 0.3)",
              borderRadius: 8,
              padding: "12px 14px",
              marginBottom: 20,
              fontSize: 12.5,
              color: "#FDE047",
              lineHeight: 1.5,
            }}
          >
            <strong>Setup Note:</strong> Supabase credentials are not yet set in <code>.env</code>. Add{" "}
            <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to enable authentication.
          </div>
        )}

        {/* ── Error / Info feedback ── */}
        {errorMsg && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 18,
              color: "#FCA5A5",
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
            <div>{errorMsg}</div>
          </div>
        )}

        {infoMsg && (
          <div
            role="status"
            aria-live="polite"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              backgroundColor: "rgba(0, 122, 255, 0.12)",
              border: "1px solid rgba(0, 122, 255, 0.3)",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 18,
              color: "#93C5FD",
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
            <div>{infoMsg}</div>
          </div>
        )}

        {/* ── Tab selector ── */}
        <div
          role="tablist"
          aria-label="Sign in method"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 5,
            backgroundColor: "#0D0D0D",
            padding: 4,
            borderRadius: 10,
            marginBottom: 22,
            border: "1px solid #1A1A1A",
          }}
        >
          <button
            role="tab"
            aria-selected={activeTab === "password"}
            type="button"
            id="tab-password"
            onClick={() => switchTab("password")}
            style={tabBtn(activeTab === "password")}
          >
            Password
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "email-otp"}
            type="button"
            id="tab-email-otp"
            onClick={() => switchTab("email-otp")}
            style={tabBtn(activeTab === "email-otp")}
          >
            Email OTP
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "phone-otp"}
            type="button"
            id="tab-phone-otp"
            onClick={() => switchTab("phone-otp")}
            style={tabBtn(activeTab === "phone-otp")}
          >
            Phone SMS
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: PASSWORD LOGIN (default/primary)
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "password" && (
          <form onSubmit={handlePasswordSignIn} noValidate>
            {/* Email field */}
            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor="pass-email"
                style={{
                  display: "block",
                  color: "#9CA3AF",
                  fontSize: 13,
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                Email
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={16}
                  color="#4B5563"
                  style={{ position: "absolute", left: 14, top: 14 }}
                  aria-hidden="true"
                />
                <input
                  id="pass-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="email address"
                  value={passEmail}
                  onChange={(e) => setPassEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { /* form submit handles it */ } }}
                  style={fieldBase}
                />
              </div>
            </div>

            {/* Password field */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <label
                  htmlFor="pass-password"
                  style={{ color: "#9CA3AF", fontSize: 13, fontWeight: 500 }}
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => onNavigate("forgot-password")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#007AFF",
                    fontSize: 12,
                    cursor: "pointer",
                    padding: 0,
                    fontFamily: "inherit",
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <Lock
                  size={16}
                  color="#4B5563"
                  style={{ position: "absolute", left: 14, top: 14 }}
                  aria-hidden="true"
                />
                <input
                  id="pass-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...fieldBase, paddingRight: 44 }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#4B5563",
                    cursor: "pointer",
                    padding: 2,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="btn-login"
              disabled={loading}
              style={primaryBtn(loading)}
            >
              {loading ? (
                <RefreshCw size={17} className="animate-spin" aria-hidden="true" />
              ) : (
                "Login"
              )}
            </button>
          </form>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: EMAIL OTP
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "email-otp" && (
          <div>
            {!emailOtpSent ? (
              <form onSubmit={handleEmailSendOtp} noValidate>
                <div style={{ marginBottom: 16 }}>
                  <label
                    htmlFor="otp-email"
                    style={{
                      display: "block",
                      color: "#9CA3AF",
                      fontSize: 13,
                      marginBottom: 6,
                      fontWeight: 500,
                    }}
                  >
                    Email address
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail
                      size={16}
                      color="#4B5563"
                      style={{ position: "absolute", left: 14, top: 14 }}
                      aria-hidden="true"
                    />
                    <input
                      id="otp-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={fieldBase}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={primaryBtn(loading)}
                >
                  {loading ? (
                    <RefreshCw size={17} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <>Send Verification Code <ArrowRight size={16} /></>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleEmailVerifyOtp} noValidate>
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <label
                      htmlFor="otp-code"
                      style={{ color: "#9CA3AF", fontSize: 13, fontWeight: 500 }}
                    >
                      Enter 6-digit code
                    </label>
                    <button
                      type="button"
                      onClick={() => { setEmailOtpSent(false); setEmailOtp(""); setErrorMsg(null); setInfoMsg(null); }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#007AFF",
                        fontSize: 12,
                        cursor: "pointer",
                        padding: 0,
                        fontFamily: "inherit",
                      }}
                    >
                      Change email
                    </button>
                  </div>
                  <input
                    id="otp-code"
                    type="text"
                    required
                    maxLength={8}
                    placeholder="123456"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value)}
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    style={{
                      ...fieldBase,
                      paddingLeft: 14,
                      fontSize: 18,
                      letterSpacing: "5px",
                      textAlign: "center",
                      fontWeight: 700,
                    }}
                  />
                </div>
                <button type="submit" disabled={loading} style={primaryBtn(loading)}>
                  {loading ? <RefreshCw size={17} className="animate-spin" aria-hidden="true" /> : "Verify & Sign In"}
                </button>
                <div style={{ textAlign: "center", marginTop: 14 }}>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={() => handleEmailSendOtp()}
                    style={{
                      background: "none",
                      border: "none",
                      color: resendCooldown > 0 ? "#374151" : "#6B7280",
                      fontSize: 12.5,
                      cursor: resendCooldown > 0 ? "default" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : "Didn't receive code? Resend"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: PHONE OTP
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "phone-otp" && (
          <div>
            {!phoneOtpSent ? (
              <form onSubmit={handlePhoneSendOtp} noValidate>
                <div style={{ marginBottom: 16 }}>
                  <label
                    htmlFor="phone-number"
                    style={{
                      display: "block",
                      color: "#9CA3AF",
                      fontSize: 13,
                      marginBottom: 6,
                      fontWeight: 500,
                    }}
                  >
                    Mobile Phone Number
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      aria-label="Country code"
                      style={{
                        width: 130,
                        backgroundColor: "#1A1A1A",
                        border: "1px solid #2A2A2A",
                        borderRadius: 8,
                        padding: "12px 10px",
                        color: "#F8FAFC",
                        fontSize: 13,
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <div style={{ position: "relative", flex: 1 }}>
                      <Phone
                        size={16}
                        color="#4B5563"
                        style={{ position: "absolute", left: 14, top: 14 }}
                        aria-hidden="true"
                      />
                      <input
                        id="phone-number"
                        type="tel"
                        required
                        placeholder="9876543210"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        autoComplete="tel"
                        style={fieldBase}
                      />
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={loading} style={primaryBtn(loading)}>
                  {loading ? (
                    <RefreshCw size={17} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <>Send SMS Code <ArrowRight size={16} /></>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handlePhoneVerifyOtp} noValidate>
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <label
                      htmlFor="phone-otp-code"
                      style={{ color: "#9CA3AF", fontSize: 13, fontWeight: 500 }}
                    >
                      Enter 6-digit SMS code
                    </label>
                    <button
                      type="button"
                      onClick={() => { setPhoneOtpSent(false); setPhoneOtp(""); setErrorMsg(null); setInfoMsg(null); }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#007AFF",
                        fontSize: 12,
                        cursor: "pointer",
                        padding: 0,
                        fontFamily: "inherit",
                      }}
                    >
                      Change number
                    </button>
                  </div>
                  <input
                    id="phone-otp-code"
                    type="text"
                    required
                    maxLength={8}
                    placeholder="123456"
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value)}
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    style={{
                      ...fieldBase,
                      paddingLeft: 14,
                      fontSize: 18,
                      letterSpacing: "5px",
                      textAlign: "center",
                      fontWeight: 700,
                    }}
                  />
                </div>
                <button type="submit" disabled={loading} style={primaryBtn(loading)}>
                  {loading ? <RefreshCw size={17} className="animate-spin" aria-hidden="true" /> : "Verify & Sign In"}
                </button>
                <div style={{ textAlign: "center", marginTop: 14 }}>
                  <button
                    type="button"
                    disabled={phoneCooldown > 0 || loading}
                    onClick={() => handlePhoneSendOtp()}
                    style={{
                      background: "none",
                      border: "none",
                      color: phoneCooldown > 0 ? "#374151" : "#6B7280",
                      fontSize: 12.5,
                      cursor: phoneCooldown > 0 ? "default" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {phoneCooldown > 0
                      ? `Resend SMS in ${phoneCooldown}s`
                      : "Didn't receive code? Resend"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── OR Divider ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "22px 0 18px",
          }}
        >
          <div style={{ flex: 1, height: 1, backgroundColor: "#1F1F1F" }} />
          <span
            style={{
              color: "#4B5563",
              fontSize: 11.5,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
            }}
          >
            OR
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: "#1F1F1F" }} />
        </div>

        {/* ── OAuth Buttons (Google + GitHub only — real providers) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button
            type="button"
            id="btn-google-login"
            onClick={handleGoogle}
            style={oauthBtn}
            aria-label="Sign in with Google"
          >
            <GoogleIcon />
            Google
          </button>
          <button
            type="button"
            id="btn-github-login"
            onClick={handleGitHub}
            style={oauthBtn}
            aria-label="Sign in with GitHub"
          >
            <GitHubIcon />
            GitHub
          </button>
        </div>

        {/* ── Legal Links ── */}
        <div style={{ marginTop: 22, textAlign: "center", fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>
          By signing in, you agree to our{" "}
          <button
            type="button"
            onClick={() => onNavigate("terms")}
            style={{
              background: "none",
              border: "none",
              color: "#94A3B8",
              textDecoration: "underline",
              cursor: "pointer",
              fontSize: 12,
              padding: 0,
            }}
          >
            Terms of Service
          </button>{" "}
          and{" "}
          <button
            type="button"
            onClick={() => onNavigate("privacy")}
            style={{
              background: "none",
              border: "none",
              color: "#94A3B8",
              textDecoration: "underline",
              cursor: "pointer",
              fontSize: 12,
              padding: 0,
            }}
          >
            Privacy Policy
          </button>.
        </div>
      </div>
    </div>
  );
};
