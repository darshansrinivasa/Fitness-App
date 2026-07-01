import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { DEFAULT_DAILY_WATER_GOAL_ML } from '@lifestyle-os/shared/sync';
import type { WaterLog } from '@lifestyle-os/shared/sync';

import { useAuth } from '../auth/AuthContext';
import { ensureDefaultWaterGoal, getActiveWaterGoal, setDailyWaterGoal } from '../db/waterGoals';
import {
  getDailyWaterTotals,
  getTodayWaterLogs,
  getTodayWaterTotalMl,
  insertWaterLogLocal,
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

  return {
    todayLogs,
    todayTotalMl,
    dailyGoalMl,
    dailyTotals30d,
    logWater,
    updateDailyGoal,
    reload,
  };
}
