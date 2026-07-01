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

import { DEFAULT_DAILY_WATER_GOAL_ML } from '@lifestyle-os/shared/sync';
import type { WaterLog } from '@lifestyle-os/shared/sync';

import { useAuth } from '../auth/AuthContext';
import {
  ensureDefaultWaterGoal,
  getActiveWaterGoal,
  setDailyWaterGoal,
} from '../db/waterGoals';
import {
  getDailyWaterTotals,
  getLastSyncedAt,
  getPendingSyncCount,
  getTodayWaterLogs,
  getTodayWaterTotalMl,
  insertWaterLogLocal,
  type DailyWaterTotal,
} from '../db/waterLogs';
import { getSupabase } from '../lib/supabase';
import { formatError } from '../lib/errors';
import { createSyncService } from '../sync';

interface SyncContextValue {
  todayLogs: WaterLog[];
  todayTotalMl: number;
  dailyGoalMl: number;
  dailyTotals30d: DailyWaterTotal[];
  pendingCount: number;
  lastSyncedAt: string | null;
  syncing: boolean;
  syncError: string | null;
  logWater: (amountMl: number) => Promise<void>;
  updateDailyGoal: (dailyTargetMl: number) => Promise<void>;
  syncNow: () => Promise<void>;
  refreshLocal: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const [todayLogs, setTodayLogs] = useState<WaterLog[]>([]);
  const [todayTotalMl, setTodayTotalMl] = useState(0);
  const [dailyGoalMl, setDailyGoalMl] = useState(DEFAULT_DAILY_WATER_GOAL_ML);
  const [dailyTotals30d, setDailyTotals30d] = useState<DailyWaterTotal[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const refreshLocal = useCallback(async () => {
    if (!user) return;
    await ensureDefaultWaterGoal(db, user.id);
    const [logs, total, goal, chart, pending, synced] = await Promise.all([
      getTodayWaterLogs(db, user.id),
      getTodayWaterTotalMl(db, user.id),
      getActiveWaterGoal(db, user.id),
      getDailyWaterTotals(db, user.id, 30),
      getPendingSyncCount(db),
      getLastSyncedAt(db),
    ]);
    setTodayLogs(logs);
    setTodayTotalMl(total);
    setDailyGoalMl(goal?.daily_target_ml ?? DEFAULT_DAILY_WATER_GOAL_ML);
    setDailyTotals30d(chart);
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

  const updateDailyGoal = useCallback(
    async (dailyTargetMl: number) => {
      if (!user) return;
      await setDailyWaterGoal(db, user.id, dailyTargetMl);
      await refreshLocal();
      void syncNow();
    },
    [db, user, refreshLocal, syncNow],
  );

  useEffect(() => {
    if (!user) {
      setTodayLogs([]);
      setTodayTotalMl(0);
      setDailyGoalMl(DEFAULT_DAILY_WATER_GOAL_ML);
      setDailyTotals30d([]);
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
      dailyGoalMl,
      dailyTotals30d,
      pendingCount,
      lastSyncedAt,
      syncing,
      syncError,
      logWater,
      updateDailyGoal,
      syncNow,
      refreshLocal,
    }),
    [
      todayLogs,
      todayTotalMl,
      dailyGoalMl,
      dailyTotals30d,
      pendingCount,
      lastSyncedAt,
      syncing,
      syncError,
      logWater,
      updateDailyGoal,
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
