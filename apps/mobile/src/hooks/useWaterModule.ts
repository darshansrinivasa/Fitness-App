import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { DEFAULT_DAILY_WATER_GOAL_ML } from '@lifestyle-os/shared/sync';
import type { WaterLog } from '@lifestyle-os/shared/sync';

import { useAuth } from '../auth/AuthContext';
import { ensureDefaultWaterGoal, getActiveWaterGoal, setDailyWaterGoal } from '../db/waterGoals';
import {
  deleteWaterLogLocal,
  getDailyWaterTotals,
  getTodayWaterLogs,
  getTodayWaterTotalMl,
  insertWaterLogLocal,
  updateWaterLogLocal,
  type DailyWaterTotal,
} from '../db/waterLogs';
import { useAppSync } from '../sync/AppSyncContext';

export function useWaterModule() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const { refreshKey, afterLocalWrite } = useAppSync();
  const [todayLogs, setTodayLogs] = useState<WaterLog[]>([]);
  const [todayTotalMl, setTodayTotalMl] = useState(0);
  const [dailyGoalMl, setDailyGoalMl] = useState(DEFAULT_DAILY_WATER_GOAL_ML);
  const [dailyTotals30d, setDailyTotals30d] = useState<DailyWaterTotal[]>([]);

  const reload = useCallback(async () => {
    if (!user) return;
    await ensureDefaultWaterGoal(db, user.id);
    const [logs, total, goal, chart] = await Promise.all([
      getTodayWaterLogs(db, user.id),
      getTodayWaterTotalMl(db, user.id),
      getActiveWaterGoal(db, user.id),
      getDailyWaterTotals(db, user.id, 30),
    ]);
    setTodayLogs(logs);
    setTodayTotalMl(total);
    setDailyGoalMl(goal?.daily_target_ml ?? DEFAULT_DAILY_WATER_GOAL_ML);
    setDailyTotals30d(chart);
  }, [db, user]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  const logWater = useCallback(
    async (amountMl: number) => {
      if (!user) return;
      await insertWaterLogLocal(db, user.id, amountMl);
      await reload();
      await afterLocalWrite();
    },
    [db, user, reload, afterLocalWrite],
  );

  const updateDailyGoal = useCallback(
    async (dailyTargetMl: number) => {
      if (!user) return;
      await setDailyWaterGoal(db, user.id, dailyTargetMl);
      await reload();
      await afterLocalWrite();
    },
    [db, user, reload, afterLocalWrite],
  );

  const updateWaterEntry = useCallback(
    async (logId: string, amountMl: number) => {
      if (!user) return false;
      const updated = await updateWaterLogLocal(db, user.id, logId, amountMl);
      if (!updated) return false;
      await reload();
      await afterLocalWrite();
      return true;
    },
    [db, user, reload, afterLocalWrite],
  );

  const deleteWaterEntry = useCallback(
    async (logId: string) => {
      if (!user) return false;
      const deleted = await deleteWaterLogLocal(db, user.id, logId);
      if (!deleted) return false;
      await reload();
      await afterLocalWrite();
      return true;
    },
    [db, user, reload, afterLocalWrite],
  );

  return {
    todayLogs,
    todayTotalMl,
    dailyGoalMl,
    dailyTotals30d,
    logWater,
    updateDailyGoal,
    updateWaterEntry,
    deleteWaterEntry,
    reload,
  };
}
