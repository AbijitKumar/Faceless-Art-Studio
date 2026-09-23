import React, { useState } from "react";
import { X, AlertCircle, RefreshCw, Mail, Lock, ArrowRight } from "lucide-react";
import logoSrc from "../assets/logo.png";
import {
  signInWithEmailOtp,
  verifyEmailOtp,
  signInWithPassword,
  signUpWithPassword,
  signInWithGoogle,
  signInWithGitHub,
} from "./authService";
import { useAuth } from "./useAuth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { refreshSession, isConfigured } = useAuth();
  const [mode, setMode] = useState<"otp" | "password" | "signup">("otp");

  // Email OTP state
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Password / Signup state
  const [passEmail, setPassEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithEmailOtp(email.trim());
      setOtpSent(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setErrorMsg("Please enter the verification code.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await verifyEmailOtp(email.trim(), otp.trim());
      await refreshSession();
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignInPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passEmail.trim() || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithPassword({ email: passEmail.trim(), password });
      await refreshSession();
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !passEmail.trim() || !password) {
      setErrorMsg("All fields are required.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      const data = await signUpWithPassword({
        email: passEmail.trim(),
        password,
        displayName: displayName.trim(),
      });
      if (data.session) {
        await refreshSession();
        onSuccess();
        onClose();
      } else {
        setErrorMsg("Confirmation link sent to your email. Please check your inbox.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Sign up failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          backgroundColor: "#181B20",
          borderRadius: 16,
          border: "1px solid #282E38",
          padding: 30,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
          position: "relative",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            right: 18,
            top: 18,
            background: "transparent",
            border: "none",
            color: "#64748B",
            cursor: "pointer",
            padding: 4,
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <img
              src={logoSrc}
              alt="Faceless Art Studio"
              style={{
                height: 48,
                maxWidth: "100%",
                objectFit: "contain",
                display: "block",
                margin: "0 auto",
              }}
            />
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 800,
              color: "#F8FAFC",
              fontFamily: "'Manrope', 'Inter', sans-serif",
            }}
          >
            Sign in to Generate
          </h2>
          <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: 13 }}>
            Your video draft has been preserved. Sign in to start rendering.
          </p>
        </div>

        {!isConfigured && (
          <div
            style={{
              backgroundColor: "rgba(234, 179, 8, 0.1)",
              border: "1px solid rgba(234, 179, 8, 0.3)",
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 14,
              fontSize: 12,
              color: "#FDE047",
            }}
          >
            Supabase credentials not configured in <code>.env</code>.
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 14,
              color: "#FCA5A5",
              fontSize: 12.5,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* Mode Selector */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 4,
            backgroundColor: "#121418",
            padding: 4,
            borderRadius: 8,
            marginBottom: 18,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode("otp");
              setErrorMsg(null);
            }}
            style={{
              padding: "6px 2px",
              borderRadius: 6,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: mode === "otp" ? "#1E8CFA" : "transparent",
              color: mode === "otp" ? "#FFFFFF" : "#94A3B8",
            }}
          >
            Email OTP
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setErrorMsg(null);
            }}
            style={{
              padding: "6px 2px",
              borderRadius: 6,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: mode === "password" ? "#1E8CFA" : "transparent",
              color: mode === "password" ? "#FFFFFF" : "#94A3B8",
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMsg(null);
            }}
            style={{
              padding: "6px 2px",
              borderRadius: 6,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: mode === "signup" ? "#1E8CFA" : "transparent",
              color: mode === "signup" ? "#FFFFFF" : "#94A3B8",
            }}
          >
            Sign Up
          </button>
        </div>

        {/* OTP Mode */}
        {mode === "otp" && (
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendOtp}>
                <div style={{ marginBottom: 14 }}>
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: "100%",
                      backgroundColor: "#1F242D",
                      border: "1px solid #2E3644",
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: "#F8FAFC",
                      fontSize: 13.5,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    backgroundColor: "#1E8CFA",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Sending..." : "Send Verification Code"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div style={{ marginBottom: 14 }}>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    style={{
                      width: "100%",
                      backgroundColor: "#1F242D",
                      border: "1px solid #2E3644",
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: "#F8FAFC",
                      fontSize: 16,
                      letterSpacing: "3px",
                      textAlign: "center",
                      fontWeight: 700,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    backgroundColor: "#1E8CFA",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Verifying..." : "Verify & Start Generation"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Password Sign In Mode */}
        {mode === "password" && (
          <form onSubmit={handleSignInPassword}>
            <div style={{ marginBottom: 10 }}>
              <input
                type="email"
                required
                placeholder="Email"
                value={passEmail}
                onChange={(e) => setPassEmail(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: "#1F242D",
                  border: "1px solid #2E3644",
                  borderRadius: 8,
                  padding: "10px 12px",
                  color: "#F8FAFC",
                  fontSize: 13.5,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: "#1F242D",
                  border: "1px solid #2E3644",
                  borderRadius: 8,
                  padding: "10px 12px",
                  color: "#F8FAFC",
                  fontSize: 13.5,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                backgroundColor: "#1E8CFA",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Signing in..." : "Sign In & Generate"}
            </button>
          </form>
        )}

        {/* Sign Up Mode */}
        {mode === "signup" && (
          <form onSubmit={handleSignUpPassword}>
            <div style={{ marginBottom: 10 }}>
              <input
                type="text"
                required
                placeholder="Your Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: "#1F242D",
                  border: "1px solid #2E3644",
                  borderRadius: 8,
                  padding: "10px 12px",
                  color: "#F8FAFC",
                  fontSize: 13.5,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <input
                type="email"
                required
                placeholder="Email"
                value={passEmail}
                onChange={(e) => setPassEmail(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: "#1F242D",
                  border: "1px solid #2E3644",
                  borderRadius: 8,
                  padding: "10px 12px",
                  color: "#F8FAFC",
                  fontSize: 13.5,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <input
                type="password"
                required
                placeholder="Password (6+ chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: "#1F242D",
                  border: "1px solid #2E3644",
                  borderRadius: 8,
                  padding: "10px 12px",
                  color: "#F8FAFC",
                  fontSize: 13.5,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                backgroundColor: "#1E8CFA",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Creating account..." : "Create Account & Generate"}
            </button>
          </form>
        )}

        {/* OAuth Buttons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginTop: 14,
          }}
        >
          <button
            type="button"
            onClick={() => signInWithGoogle().catch((e: any) => setErrorMsg(e.message))}
            aria-label="Sign in with Google"
            style={{
              backgroundColor: "#161616",
              border: "1px solid #2A2A2A",
              borderRadius: 6,
              padding: "9px 10px",
              color: "#D4D4D4",
              fontSize: 12.5,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.8z" />
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1c0 2.8.7 5.4 1.9 7.8l3.7-3z" />
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
            </svg>
            Google
          </button>
          <button
            type="button"
            onClick={() => signInWithGitHub().catch((e: any) => setErrorMsg(e.message))}
            aria-label="Sign in with GitHub"
            style={{
              backgroundColor: "#161616",
              border: "1px solid #2A2A2A",
              borderRadius: 6,
              padding: "9px 10px",
              color: "#D4D4D4",
              fontSize: 12.5,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
            }}
          >
            <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub
          </button>
        </div>
      </div>
    </div>
  );
};
