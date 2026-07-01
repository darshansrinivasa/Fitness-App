import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { useAuth } from '../auth/AuthContext';
import { getLastSyncedAt, getPendingSyncCount } from '../db/waterLogs';
import { formatError } from '../lib/errors';
import { getSupabase } from '../lib/supabase';
import { createSyncService } from './index';

interface AppSyncContextValue {
  syncing: boolean;
  syncError: string | null;
  pendingCount: number;
  lastSyncedAt: string | null;
  refreshKey: number;
  syncNow: () => Promise<void>;
  afterLocalWrite: () => Promise<void>;
}

const AppSyncContext = createContext<AppSyncContextValue | null>(null);

export function AppSyncProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshMeta = useCallback(async () => {
    const [pending, synced] = await Promise.all([
      getPendingSyncCount(db),
      getLastSyncedAt(db),
    ]);
    setPendingCount(pending);
    setLastSyncedAt(synced);
    setRefreshKey((k) => k + 1);
  }, [db]);

  const syncNow = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const supabase = getSupabase();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('Session expired. Sign in again.');

      const service = createSyncService(db, supabase);
      await service.sync();
      await refreshMeta();
    } catch (err) {
      console.error('Sync error:', err);
      setSyncError(formatError(err));
    } finally {
      setSyncing(false);
    }
  }, [db, user, refreshMeta]);

  const afterLocalWrite = useCallback(async () => {
    await refreshMeta();
    void syncNow();
  }, [refreshMeta, syncNow]);

  useEffect(() => {
    if (!user) {
      setPendingCount(0);
      setLastSyncedAt(null);
      return;
    }
    void refreshMeta();
    void syncNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active' && user) void syncNow();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [user, syncNow]);

  const value = useMemo(
    () => ({
      syncing,
      syncError,
      pendingCount,
      lastSyncedAt,
      refreshKey,
      syncNow,
      afterLocalWrite,
    }),
    [syncing, syncError, pendingCount, lastSyncedAt, refreshKey, syncNow, afterLocalWrite],
  );

  return (
    <AppSyncContext.Provider value={value}>{children}</AppSyncContext.Provider>
  );
}

export function useAppSync(): AppSyncContextValue {
  const ctx = useContext(AppSyncContext);
  if (!ctx) throw new Error('useAppSync must be used within AppSyncProvider');
  return ctx;
}

/** @deprecated Use AppSyncProvider */
export const SyncProvider = AppSyncProvider;

/** @deprecated Use useAppSync */
export function useSync(): AppSyncContextValue {
  return useAppSync();
}
