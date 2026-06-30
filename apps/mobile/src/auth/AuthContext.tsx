import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { fetchProfile, getSupabase, resetSupabaseClient, type Profile } from '../lib/supabase';
import { signInWithGoogle as googleSignIn } from './googleSignIn';

const AUTH_INIT_TIMEOUT_MS = 15_000;

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  authError: string | null;
  retryInit: () => void;
  signInWithGoogle: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [initAttempt, setInitAttempt] = useState(0);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const data = await fetchProfile(userId);
      setProfile(data);
    } catch (err) {
      console.warn('Profile load failed (non-fatal):', err);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let initialSessionHandled = false;

    const fallbackTimer = setTimeout(() => {
      if (cancelled || initialSessionHandled) return;
      console.error('Auth init timed out waiting for INITIAL_SESSION');
      setAuthError(
        'Session restore is taking too long. Check your connection and try again.',
      );
      setLoading(false);
    }, AUTH_INIT_TIMEOUT_MS);

    const { data: subscription } = getSupabase().auth.onAuthStateChange(
      (event, nextSession) => {
        if (cancelled) return;

        if (event === 'INITIAL_SESSION') {
          initialSessionHandled = true;
          clearTimeout(fallbackTimer);
          setSession(nextSession);
          setAuthError(null);
          if (nextSession?.user) {
            void loadProfile(nextSession.user.id);
          }
          setLoading(false);
          return;
        }

        setSession(nextSession);
        setAuthError(null);
        if (nextSession?.user) {
          void loadProfile(nextSession.user.id);
        } else {
          setProfile(null);
        }
      },
    );

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile, initAttempt]);

  const retryInit = useCallback(() => {
    resetSupabaseClient();
    setAuthError(null);
    setSession(null);
    setProfile(null);
    setLoading(true);
    setInitAttempt((n) => n + 1);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    await googleSignIn();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    const { data, error } = await getSupabase().auth.signUp({ email, password });
    if (error) throw error;
    if (!data.session) {
      throw new Error(
        'Check your email to confirm your account, then sign in.',
      );
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw error;
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    await loadProfile(session.user.id);
  }, [loadProfile, session?.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      authError,
      retryInit,
      signInWithGoogle,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [
      session,
      profile,
      loading,
      authError,
      retryInit,
      signInWithGoogle,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
