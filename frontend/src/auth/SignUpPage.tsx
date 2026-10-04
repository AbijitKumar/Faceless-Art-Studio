import React, { useState } from "react";
import {
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ChevronLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import { signUpWithPassword, signInWithGitHub } from "./authService";
import { useAuth } from "./useAuth";
import { createNotification } from "../notificationService";
import logoSrc from "../assets/logo.png";

interface SignUpPageProps {
  onNavigate: (page: string) => void;
  onSuccess?: () => void;
}

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

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.8z" />
    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1c0 2.8.7 5.4 1.9 7.8l3.7-3z" />
    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
  </svg>
);

const GitHubIcon = () => (
  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

export const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigate, onSuccess }) => {
  const { isConfigured, refreshSession } = useAuth();

  const [googleMsg, setGoogleMsg] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg("Please enter your display name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const data = await signUpWithPassword({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
      });

      // Check if session was returned immediately or email confirmation is required
      if (data.session) {
        await refreshSession();
        // Send one-time welcome notification
        try {
          await createNotification(data.session.user.id, {
            title: "Welcome to Faceless Art Studio!",
            message: "Due to Technical Errors, Video Generation on qualtities above 720p does not work. Please use the 720p option. And we welcome you to our service.",
            type: "welcome",
          });
        } catch (_) { /* non-critical */ }
        if (onSuccess) onSuccess();
        else onNavigate("dashboard");
      } else {
        setSuccessInfo(
          "Account created! We've sent a confirmation email. Please check your inbox and verify your email address to activate your account and sign in."
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setErrorMsg(null);
    setGoogleMsg("Please sign in through email. the dign in through Google service is in progress and will be available pretty soon.");
  };

  const handleGitHub = async () => {
    setErrorMsg(null);
    try {
      await signInWithGitHub();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initiate GitHub sign in.");
    }
  };

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
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          backgroundColor: "#141414",
          borderRadius: 14,
          border: "1px solid #1F1F1F",
          padding: "38px 36px",
          boxShadow: "0 24px 48px -16px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.03)",
        }}
      >
        {/* Back to Login */}
        <button
          onClick={() => onNavigate("login")}
          aria-label="Back to Sign In"
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
          Back to Sign In
        </button>

        {/* Branding */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ marginBottom: 18 }}>
            <img
              src={logoSrc}
              alt="Faceless Art Studio"
              style={{
                height: 64,
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
            Create your account
          </h1>
          <p style={{ color: "#6B7280", fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            Start creating automated faceless videos in seconds.{" "}
            <span style={{ color: "#9CA3AF", fontSize: 12.5 }}>
              Email verification required.
            </span>
          </p>
        </div>

        {/* Unconfigured notice */}
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
            <strong>Setup Note:</strong> Supabase credentials are not yet configured in <code>.env</code>.
          </div>
        )}

        {/* Error */}
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

        {/* Success / email confirmation state */}
        {successInfo ? (
          <div
            role="status"
            style={{
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              borderRadius: 10,
              padding: "24px 20px",
              textAlign: "center",
            }}
          >
            <CheckCircle2 size={38} color="#4ADE80" style={{ margin: "0 auto 14px" }} aria-hidden="true" />
            <h2 style={{ margin: "0 0 10px", color: "#F8FAFC", fontSize: 17, fontWeight: 700 }}>
              Check your inbox!
            </h2>
            <p style={{ color: "#9CA3AF", fontSize: 13.5, lineHeight: 1.6, margin: "0 0 18px" }}>
              {successInfo}
            </p>
            <button
              onClick={() => onNavigate("login")}
              style={{
                backgroundColor: "#007AFF",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                padding: "11px 20px",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Go to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {/* Display Name */}
            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor="signup-name"
                style={{ display: "block", color: "#9CA3AF", fontSize: 13, marginBottom: 6, fontWeight: 500 }}
              >
                Display Name
              </label>
              <div style={{ position: "relative" }}>
                <UserIcon size={16} color="#4B5563" style={{ position: "absolute", left: 14, top: 14 }} aria-hidden="true" />
                <input
                  id="signup-name"
                  type="text"
                  required
                  placeholder="Alex Creator"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                  style={fieldBase}
                />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor="signup-email"
                style={{ display: "block", color: "#9CA3AF", fontSize: 13, marginBottom: 6, fontWeight: 500 }}
              >
                Email address
              </label>
              <div style={{ position: "relative" }}>
                <Mail size={16} color="#4B5563" style={{ position: "absolute", left: 14, top: 14 }} aria-hidden="true" />
                <input
                  id="signup-email"
                  type="email"
                  required
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  style={fieldBase}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor="signup-password"
                style={{ display: "block", color: "#9CA3AF", fontSize: 13, marginBottom: 6, fontWeight: 500 }}
              >
                Password{" "}
                <span style={{ color: "#4B5563", fontSize: 11.5, fontWeight: 400 }}>(min. 6 characters)</span>
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={16} color="#4B5563" style={{ position: "absolute", left: 14, top: 14 }} aria-hidden="true" />
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  style={{ ...fieldBase, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    padding: 6,
                    color: "#9CA3AF",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 4,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: 22 }}>
              <label
                htmlFor="signup-confirm-password"
                style={{ display: "block", color: "#9CA3AF", fontSize: 13, marginBottom: 6, fontWeight: 500 }}
              >
                Confirm Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={16} color="#4B5563" style={{ position: "absolute", left: 14, top: 14 }} aria-hidden="true" />
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  style={{ ...fieldBase, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    padding: 6,
                    color: "#9CA3AF",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 4,
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="btn-create-account"
              type="submit"
              disabled={loading}
              style={primaryBtn(loading)}
            >
              {loading ? (
                <RefreshCw size={17} className="animate-spin" aria-hidden="true" />
              ) : (
                <>Create Account <ArrowRight size={16} /></>
              )}
            </button>

            {/* OR divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                margin: "22px 0 18px",
              }}
            >
              <div style={{ flex: 1, height: 1, backgroundColor: "#1F1F1F" }} />
              <span style={{ color: "#4B5563", fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                OR
              </span>
              <div style={{ flex: 1, height: 1, backgroundColor: "#1F1F1F" }} />
            </div>

            {/* OAuth buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="button" onClick={handleGoogle} style={oauthBtn} aria-label="Sign up with Google">
                <GoogleIcon />
                Google
              </button>
              <button type="button" onClick={handleGitHub} style={oauthBtn} aria-label="Sign up with GitHub">
                <GitHubIcon />
                GitHub
              </button>
            </div>
            {googleMsg && (
              <div
                role="status"
                style={{
                  marginTop: 12,
                  backgroundColor: "rgba(234, 179, 8, 0.1)",
                  border: "1px solid rgba(234, 179, 8, 0.3)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: "#FDE047",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                }}
              >
                {googleMsg}
              </div>
            )}
          </form>
        )}

        {/* Footer: already have account */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <span style={{ color: "#6B7280", fontSize: 13 }}>
            Already have an account?{" "}
          </span>
          <button
            type="button"
            onClick={() => onNavigate("login")}
            style={{
              background: "none",
              border: "none",
              color: "#007AFF",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
              fontFamily: "inherit",
            }}
          >
            Sign in
          </button>
        </div>

        {/* ── Legal Links ── */}
        <div style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>
          By creating an account, you agree to our{" "}
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
