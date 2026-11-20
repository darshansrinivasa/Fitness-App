import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { fetchProfile, getSupabase, hasSupabaseConfig, type Profile } from './supabase';

interface AuthValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  profileReady: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = hasSupabaseConfig();
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileReady, setProfileReady] = useState(!configured);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    setProfileReady(false);
    try {
      setProfile(await fetchProfile(userId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load profile');
    } finally {
      setProfileReady(true);
    }
  }, []);

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabase();
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session) void loadProfile(data.session.user.id);
      else setProfileReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) void loadProfile(next.user.id);
      else {
        setProfile(null);
        setProfileReady(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [configured, loadProfile]);

  const value = useMemo<AuthValue>(
    () => ({
      configured,
      loading,
      session,
      user: session?.user ?? null,
      profile,
      profileReady,
      error,
      refreshProfile: async () => {
        if (session) await loadProfile(session.user.id);
      },
      signInWithGoogle: async () => {
        const { error: authError } = await getSupabase().auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        });
        if (authError) throw new Error(authError.message);
      },
      signOut: async () => {
        sessionStorage.removeItem('los-unlocked');
        const { error: authError } = await getSupabase().auth.signOut();
        if (authError) throw new Error(authError.message);
      },
    }),
    [configured, error, loadProfile, loading, profile, profileReady, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
