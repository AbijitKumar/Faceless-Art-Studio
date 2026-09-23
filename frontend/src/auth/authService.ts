import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_color: string;
  created_at?: string;
  updated_at?: string;
}

export function formatAuthError(error: any): string {
  if (!error) return "An unexpected error occurred.";
  if (!isSupabaseConfigured) {
    return "Supabase credentials are not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your .env file.";
  }

  const msg = error.message || String(error);
  const lower = msg.toLowerCase();

  if (lower.includes("provider is not enabled") || lower.includes("provider_disabled")) {
    return "This login provider is not enabled in your Supabase project dashboard. Please enable it under Authentication > Providers.";
  }
  if (lower.includes("sms") && (lower.includes("provider") || lower.includes("not enabled") || lower.includes("not found"))) {
    return "SMS provider is not configured in your Supabase project. To use Phone OTP, configure an SMS gateway (Twilio, MessageBird, etc.) in the Supabase Dashboard.";
  }
  if (lower.includes("invalid login credentials") || lower.includes("invalid_credentials")) {
    return "Invalid email or password. Please check your details and try again.";
  }
  if (lower.includes("user already registered") || lower.includes("already exists")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (lower.includes("otp expired") || lower.includes("token has expired")) {
    return "The verification code has expired. Please request a new code.";
  }
  if (lower.includes("invalid token") || lower.includes("token is invalid") || lower.includes("otp")) {
    return "Invalid verification code. Please double-check the 6 digits.";
  }
  if (lower.includes("password should be at least")) {
    return "Password must be at least 6 characters long.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many requests. Please wait a moment before trying again.";
  }

  return msg;
}

export async function signInWithEmailOtp(email: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.");
  }
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw new Error(formatAuthError(error));
  return data;
}

export async function verifyEmailOtp(email: string, token: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: token.trim(),
    type: "email",
  });
  if (error) throw new Error(formatAuthError(error));
  return data;
}

export async function signInWithPhoneOtp(phone: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.");
  }
  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser: true,
    },
  });
  if (error) throw new Error(formatAuthError(error));
  return data;
}

export async function verifyPhoneOtp(phone: string, token: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: token.trim(),
    type: "sms",
  });
  if (error) throw new Error(formatAuthError(error));
  return data;
}

export async function signUpWithPassword(params: {
  email: string;
  password: string;
  displayName: string;
  avatarColor?: string;
}) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.");
  }
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        display_name: params.displayName,
        avatar_color: params.avatarColor || "#1E8CFA",
      },
    },
  });
  if (error) throw new Error(formatAuthError(error));
  return data;
}

export async function signInWithPassword(params: {
  email: string;
  password: string;
}) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.");
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });
  if (error) throw new Error(formatAuthError(error));
  return data;
}

export async function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.");
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw new Error(formatAuthError(error));
  return data;
}

export async function signInWithGitHub() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.");
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw new Error(formatAuthError(error));
  return data;
}

export async function requestPasswordReset(email: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.");
  }
  const redirectUrl = `${window.location.origin}?auth_event=reset-password`;
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });
  if (error) throw new Error(formatAuthError(error));
  return data;
}

export async function updatePassword(newPassword: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw new Error(formatAuthError(error));
  return data;
}

export async function signOut() {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(formatAuthError(error));
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured || !userId) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn("Could not fetch profile from table (might need migration):", error.message);
      return null;
    }
    return data as UserProfile;
  } catch (err) {
    console.warn("fetchUserProfile caught error:", err);
    return null;
  }
}

export async function upsertUserProfile(
  userId: string,
  updates: { display_name?: string; avatar_color?: string }
): Promise<UserProfile | null> {
  if (!isSupabaseConfigured || !userId) return null;
  try {
    const payload = {
      id: userId,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload)
      .select()
      .maybeSingle();

    if (error) {
      console.warn("Could not upsert profile:", error.message);
      return null;
    }
    return data as UserProfile;
  } catch (err) {
    console.warn("upsertUserProfile caught error:", err);
    return null;
  }
}
