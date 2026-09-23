import React, { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  UserProfile,
  fetchUserProfile,
  upsertUserProfile,
  signOut as apiSignOut,
} from "./authService";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  isPasswordRecovery: boolean;
  clearPasswordRecoveryFlag: () => void;
  updateProfile: (updates: { display_name?: string; avatar_color?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);

  // Check URL parameters for recovery event if redirected with hash or query
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth_event") === "reset-password") {
      setIsPasswordRecovery(true);
    }
  }, []);

  const loadProfile = async (currentUser: User) => {
    const dbProfile = await fetchUserProfile(currentUser.id);
    if (dbProfile) {
      setProfile(dbProfile);
    } else {
      // Fallback to user_metadata or default
      const meta = currentUser.user_metadata || {};
      const fallbackProfile: UserProfile = {
        id: currentUser.id,
        display_name: meta.display_name || meta.full_name || currentUser.email?.split("@")[0] || "Creator",
        avatar_color: meta.avatar_color || "#1E8CFA",
      };
      setProfile(fallbackProfile);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    // 1. Initial session load
    supabase.auth.getSession().then(({ data: { session: initSession }, error }) => {
      if (!isMounted) return;
      if (error) {
        console.warn("Error getting initial Supabase session:", error.message);
      }
      setSession(initSession);
      setUser(initSession?.user ?? null);
      if (initSession?.user) {
        loadProfile(initSession.user).finally(() => {
          if (isMounted) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    // 2. Auth state subscription
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;

      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await loadProfile(currentSession.user);
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const updateProfile = async (updates: { display_name?: string; avatar_color?: string }) => {
    if (!user) return;
    // Optimistic update
    setProfile((prev) => (prev ? { ...prev, ...updates } : null));

    // Persist to Supabase
    const saved = await upsertUserProfile(user.id, updates);
    if (saved) {
      setProfile(saved);
    }
  };

  const signOut = async () => {
    try {
      await apiSignOut();
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsPasswordRecovery(false);
    }
  };

  const refreshSession = async () => {
    if (!isSupabaseConfigured) return;
    const { data: { session: newSession } } = await supabase.auth.getSession();
    setSession(newSession);
    setUser(newSession?.user ?? null);
    if (newSession?.user) {
      await loadProfile(newSession.user);
    }
  };

  const clearPasswordRecoveryFlag = () => {
    setIsPasswordRecovery(false);
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    isAuthenticated: Boolean(user && session),
    isConfigured: isSupabaseConfigured,
    isPasswordRecovery,
    clearPasswordRecoveryFlag,
    updateProfile,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
