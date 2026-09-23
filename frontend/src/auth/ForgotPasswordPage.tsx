import React, { useState } from "react";
import { Mail, ArrowRight, AlertCircle, CheckCircle2, RefreshCw, ChevronLeft } from "lucide-react";
import { requestPasswordReset } from "./authService";
import { useAuth } from "./useAuth";
import logoSrc from "../assets/logo.png";

interface ForgotPasswordPageProps {
  onNavigate: (page: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const { isConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send password reset email.");
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
        <button
          onClick={() => onNavigate("login")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: "none",
            color: "#94A3B8",
            fontSize: 13,
            cursor: "pointer",
            marginBottom: 20,
            padding: 0,
          }}
        >
          <ChevronLeft size={16} /> Back to Sign In
        </button>

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
            Reset your password
          </h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 6, margin: "6px 0 0" }}>
            Enter your email and we'll send you a recovery link
          </p>
        </div>

        {!isConfigured && (
          <div
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
            <strong>Setup Note:</strong> Supabase credentials are not configured in <code>.env</code>.
          </div>
        )}

        {errorMsg && (
          <div
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
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>{errorMsg}</div>
          </div>
        )}

        {submitted ? (
          <div
            style={{
              backgroundColor: "rgba(34, 197, 94, 0.12)",
              border: "1px solid rgba(34, 197, 94, 0.35)",
              borderRadius: 10,
              padding: "22px 18px",
              textAlign: "center",
            }}
          >
            <CheckCircle2 size={36} color="#4ADE80" style={{ margin: "0 auto 12px" }} />
            <h3 style={{ margin: "0 0 8px", color: "#F8FAFC", fontSize: 16 }}>
              Check your email
            </h3>
            <p style={{ color: "#94A3B8", fontSize: 13.5, lineHeight: 1.5, margin: "0 0 18px" }}>
              If an account exists for <strong>{email}</strong>, you will receive password reset instructions.
            </p>
            <button
              onClick={() => onNavigate("login")}
              style={{
              backgroundColor: "#007AFF",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                padding: "10px 18px",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label
                style={{
                  display: "block",
                  color: "#94A3B8",
                  fontSize: 13,
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                Email address
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={17}
                  color="#64748B"
                  style={{ position: "absolute", left: 14, top: 13 }}
                />
                <input
                  type="email"
                  required
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    backgroundColor: "#1A1A1A",
                    border: "1px solid #2A2A2A",
                    borderRadius: 8,
                    padding: "12px 14px 12px 42px",
                    color: "#F8FAFC",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
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
                backgroundColor: "#007AFF",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                padding: "12px 18px",
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <RefreshCw size={17} className="animate-spin" />
              ) : (
                <>
                  Send Recovery Link <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
