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
import {
  getLastSyncedAt,
  getPendingSyncCount,
  getTodayWaterLogs,
  getTodayWaterTotalMl,
  insertWaterLogLocal,
  migrateLocalSchema,
} from '../db/waterLogs';
import { getSupabase } from '../lib/supabase';
import { formatError } from '../lib/errors';
import { createSyncService } from '../sync';
import type { WaterLog } from '@lifestyle-os/shared/sync';

interface SyncContextValue {
  todayLogs: WaterLog[];
  todayTotalMl: number;
  pendingCount: number;
  lastSyncedAt: string | null;
  syncing: boolean;
  syncError: string | null;
  logWater: (amountMl: number) => Promise<void>;
  syncNow: () => Promise<void>;
  refreshLocal: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const [todayLogs, setTodayLogs] = useState<WaterLog[]>([]);
  const [todayTotalMl, setTodayTotalMl] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const refreshLocal = useCallback(async () => {
    if (!user) return;
    const [logs, total, pending, synced] = await Promise.all([
      getTodayWaterLogs(db, user.id),
      getTodayWaterTotalMl(db, user.id),
      getPendingSyncCount(db),
      getLastSyncedAt(db),
    ]);
    setTodayLogs(logs);
    setTodayTotalMl(total);
    setPendingCount(pending);
    setLastSyncedAt(synced);
  }, [db, user]);

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
      if (!session) {
        throw new Error('Session expired. Sign in again.');
      }

      const service = createSyncService(db, supabase);
      await service.sync();
      await refreshLocal();
    } catch (err) {
      console.error('Sync error:', err);
      setSyncError(formatError(err));
    } finally {
      setSyncing(false);
    }
  }, [db, user, refreshLocal]);

  const logWater = useCallback(
    async (amountMl: number) => {
      if (!user) return;
      await insertWaterLogLocal(db, user.id, amountMl);
      await refreshLocal();
      void syncNow();
    },
    [db, user, refreshLocal, syncNow],
  );

  useEffect(() => {
    if (!user) {
      setTodayLogs([]);
      setTodayTotalMl(0);
      setPendingCount(0);
      setLastSyncedAt(null);
      return;
    }
    void refreshLocal();
    void syncNow();
    // Only re-run when the signed-in user changes
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
      todayLogs,
      todayTotalMl,
      pendingCount,
      lastSyncedAt,
      syncing,
      syncError,
      logWater,
      syncNow,
      refreshLocal,
    }),
    [
      todayLogs,
      todayTotalMl,
      pendingCount,
      lastSyncedAt,
      syncing,
      syncError,
      logWater,
      syncNow,
      refreshLocal,
    ],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}

export { migrateLocalSchema };
