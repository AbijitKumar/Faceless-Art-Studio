import React, { useState } from "react";
import { Lock, ArrowRight, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { updatePassword } from "./authService";
import { useAuth } from "./useAuth";
import logoSrc from "../assets/logo.png";

interface ResetPasswordPageProps {
  onNavigate: (page: string) => void;
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

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onNavigate }) => {
  const { clearPasswordRecoveryFlag } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      await updatePassword(password);
      setIsSuccess(true);
      clearPasswordRecoveryFlag();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

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
          maxWidth: 440,
          backgroundColor: "#141414",
          borderRadius: 14,
          border: "1px solid #1F1F1F",
          padding: "38px 36px",
          boxShadow: "0 24px 48px -16px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.03)",
        }}
      >
        {/* Branding */}
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ marginBottom: 16 }}>
            <img
              src={logoSrc}
              alt="Faceless Art Studio"
              style={{
                height: 60,
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
              fontSize: 22,
              fontWeight: 800,
              color: "#F8FAFC",
              margin: 0,
            }}
          >
            Set New Password
          </h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 6, margin: "6px 0 0" }}>
            Enter your new password below
          </p>
        </div>

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

        {isSuccess ? (
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
              Password Updated!
            </h2>
            <p style={{ color: "#9CA3AF", fontSize: 13.5, lineHeight: 1.6, margin: "0 0 18px" }}>
              Your account password has been successfully updated.
            </p>
            <button
              onClick={() => onNavigate("dashboard")}
              style={{
                backgroundColor: "#007AFF",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                padding: "11px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Continue to Studio
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {/* New Password */}
            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor="reset-password"
                style={{
                  display: "block",
                  color: "#9CA3AF",
                  fontSize: 13,
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                New Password{" "}
                <span style={{ color: "#4B5563", fontSize: 11.5, fontWeight: 400 }}>(min. 6 characters)</span>
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={16} color="#4B5563" style={{ position: "absolute", left: 14, top: 14 }} aria-hidden="true" />
                <input
                  id="reset-password"
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  style={fieldBase}
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: 22 }}>
              <label
                htmlFor="reset-confirm-password"
                style={{
                  display: "block",
                  color: "#9CA3AF",
                  fontSize: 13,
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                Confirm New Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={16} color="#4B5563" style={{ position: "absolute", left: 14, top: 14 }} aria-hidden="true" />
                <input
                  id="reset-confirm-password"
                  type="password"
                  required
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  style={fieldBase}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: loading ? "#004C99" : "#007AFF",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                padding: "13px 18px",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.65 : 1,
                transition: "all 0.2s ease",
                fontFamily: "inherit",
              }}
            >
              {loading ? (
                <RefreshCw size={17} className="animate-spin" aria-hidden="true" />
              ) : (
                <>Update Password <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
