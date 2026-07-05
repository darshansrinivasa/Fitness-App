import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSQLiteContext } from 'expo-sqlite';

import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { screenStyles, ScreenScroll } from '../components/ScreenLayout';
import { WaterProgressRing } from '../components/WaterProgressRing';
import { getTodayWorkoutCount } from '../db/fitness';
import { ensureDefaultNutritionGoal, getActiveNutritionGoal, getTodayMacroTotals } from '../db/nutrition';
import { getLatestWeight } from '../db/body';
import { getActiveGoalsCount } from '../db/goals';
import { getLatestHeartRate } from '../db/health';
import { getTodayHabitsCompletedCount } from '../db/habits';
import { getProgressPhotoCount } from '../db/photos';
import { formatDuration, getLastSleepLog } from '../db/sleep';
import { getTodaySupplementsTakenCount } from '../db/supplements';
import { ensureDefaultWaterGoal } from '../db/waterGoals';
import { useWaterModule } from '../hooks/useWaterModule';
import type { RootTabParamList } from '../navigation/types';
import { useAppSync } from '../sync/AppSyncContext';
import { colors, spacing } from '../theme/tokens';

type Nav = BottomTabNavigationProp<RootTabParamList, 'Home'>;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function DashboardScreen() {
  const { user, profile } = useAuth();
  const { logWater, todayTotalMl, dailyGoalMl, todayLogs, deleteWaterEntry } = useWaterModule();
  const { pendingCount, syncing, syncError, syncNow, refreshKey } = useAppSync();
  const navigation = useNavigation<Nav>();
  const db = useSQLiteContext();
  const [workoutsToday, setWorkoutsToday] = useState(0);
  const [calories, setCalories] = useState({ current: 0, goal: 2200 });
  const [latestWeight, setLatestWeight] = useState<string>('—');
  const [sleepSummary, setSleepSummary] = useState<string>('—');
  const [habitsSummary, setHabitsSummary] = useState('0/0');
  const [supplementsSummary, setSupplementsSummary] = useState('0/0');
  const [activeGoals, setActiveGoals] = useState(0);
  const [heartRate, setHeartRate] = useState<string>('—');
  const [photoCount, setPhotoCount] = useState(0);

  const displayName =
    profile?.full_name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    'User';

  const reload = useCallback(async () => {
    if (!user) return;
    await Promise.all([
      ensureDefaultWaterGoal(db, user.id),
      ensureDefaultNutritionGoal(db, user.id),
    ]);
    const [workoutCount, macros, goal, weight, lastSleep, habits, supps, goalsCount, hr, photos] =
      await Promise.all([
      getTodayWorkoutCount(db, user.id),
      getTodayMacroTotals(db, user.id),
      getActiveNutritionGoal(db, user.id),
      getLatestWeight(db, user.id),
      getLastSleepLog(db, user.id),
      getTodayHabitsCompletedCount(db, user.id),
      getTodaySupplementsTakenCount(db, user.id),
      getActiveGoalsCount(db, user.id),
      getLatestHeartRate(db, user.id),
      getProgressPhotoCount(db, user.id),
    ]);
    setWorkoutsToday(workoutCount);
    setCalories({ current: macros.calories, goal: goal?.calories ?? 2200 });
    setLatestWeight(weight ? `${weight.weight_kg} kg` : '—');
    setSleepSummary(lastSleep ? formatDuration(lastSleep.duration_minutes) : '—');
    setHabitsSummary(`${habits.done}/${habits.total}`);
    setSupplementsSummary(`${supps.done}/${supps.total}`);
    setActiveGoals(goalsCount);
    setHeartRate(hr ? `${hr} bpm` : '—');
    setPhotoCount(photos);
  }, [db, user]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  return (
    <ScreenScroll>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Hi, {displayName}</Text>
        <Text style={screenStyles.subtitle}>Slice 5 — Dashboard</Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Quick log</Text>
        <View style={styles.quickRow}>
          <Button label="+200 ml" variant="secondary" onPress={() => void logWater(200)} style={styles.quickBtn} />
          <Button label="+350 ml" variant="secondary" onPress={() => void logWater(350)} style={styles.quickBtn} />
          <Button label="+500 ml" variant="secondary" onPress={() => void logWater(500)} style={styles.quickBtn} />
        </View>
        {todayLogs.length > 0 ? (
          <View style={styles.lastWaterRow}>
            <Text style={styles.meta}>
              Last: {todayLogs[0].amount_ml} ml at {formatTime(todayLogs[0].logged_at)}
            </Text>
            <Pressable onPress={() => void deleteWaterEntry(todayLogs[0].id)}>
              <Text style={styles.undoLink}>Undo</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.quickLinks}>
          <Pressable onPress={() => navigation.navigate('Modules', { screen: 'Fitness' })}>
            <Text style={styles.link}>Log workout →</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Modules', { screen: 'Nutrition' })}>
            <Text style={styles.link}>Log meal →</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Modules', { screen: 'Body' })}>
            <Text style={styles.link}>Log weight →</Text>
          </Pressable>
        </View>
      </Card>

      <View style={styles.grid}>
        <Card style={styles.gridCard}>
          <Text style={styles.cardTitle}>Water</Text>
          <WaterProgressRing currentMl={todayTotalMl} goalMl={dailyGoalMl} size={100} />
          <Pressable onPress={() => navigation.navigate('Water')}>
            <Text style={styles.link}>Open water →</Text>
          </Pressable>
        </Card>
        <Card style={styles.gridCard}>
          <Text style={styles.cardTitle}>Fitness</Text>
          <Text style={styles.stat}>{workoutsToday}</Text>
          <Text style={styles.meta}>workouts today</Text>
        </Card>
      </View>

      <View style={styles.grid}>
        <Card style={styles.gridCard}>
          <Text style={styles.cardTitle}>Nutrition</Text>
          <Text style={styles.stat}>{calories.current}</Text>
          <Text style={styles.meta}>/ {calories.goal} kcal</Text>
        </Card>
        <Card style={styles.gridCard}>
          <Text style={styles.cardTitle}>Weight</Text>
          <Text style={styles.statSmall}>{latestWeight}</Text>
          <Text style={styles.meta}>latest entry</Text>
        </Card>
      </View>

      <View style={styles.grid}>
        <Card style={styles.gridCard}>
          <Text style={styles.cardTitle}>Sleep</Text>
          <Text style={styles.statSmall}>{sleepSummary}</Text>
          <Pressable onPress={() => navigation.navigate('Modules', { screen: 'Sleep' })}>
            <Text style={styles.link}>Log sleep →</Text>
          </Pressable>
        </Card>
        <Card style={styles.gridCard}>
          <Text style={styles.cardTitle}>Habits</Text>
          <Text style={styles.stat}>{habitsSummary}</Text>
          <Text style={styles.meta}>done today</Text>
        </Card>
      </View>

      <View style={styles.grid}>
        <Card style={styles.gridCard}>
          <Text style={styles.cardTitle}>Supplements</Text>
          <Text style={styles.stat}>{supplementsSummary}</Text>
          <Text style={styles.meta}>taken today</Text>
        </Card>
        <Card style={styles.gridCard}>
          <Text style={styles.cardTitle}>Goals</Text>
          <Text style={styles.stat}>{activeGoals}</Text>
          <Text style={styles.meta}>active</Text>
        </Card>
      </View>

      <View style={styles.grid}>
        <Card style={styles.gridCard}>
          <Text style={styles.cardTitle}>Health</Text>
          <Text style={styles.statSmall}>{heartRate}</Text>
          <Pressable onPress={() => navigation.navigate('Modules', { screen: 'Health' })}>
            <Text style={styles.link}>Log vitals →</Text>
          </Pressable>
        </Card>
        <Card style={styles.gridCard}>
          <Text style={styles.cardTitle}>Photos</Text>
          <Text style={styles.stat}>{photoCount}</Text>
          <Text style={styles.meta}>progress shots</Text>
        </Card>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Sync</Text>
        <Text style={styles.meta}>Pending: {pendingCount}</Text>
        {syncError ? <Text style={styles.error}>{syncError}</Text> : null}
        <Button
          label={syncing ? 'Syncing…' : 'Sync now'}
          loading={syncing}
          onPress={() => void syncNow()}
          style={styles.syncBtn}
        />
      </Card>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  quickBtn: { flex: 1, paddingHorizontal: spacing.xs },
  lastWaterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  undoLink: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  quickLinks: { gap: spacing.xs },
  link: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  grid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  gridCard: { flex: 1, alignItems: 'center' },
  stat: { fontSize: 32, fontWeight: '700', color: colors.accent },
  statSmall: { fontSize: 20, fontWeight: '700', color: colors.accent },
  meta: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.danger, fontSize: 13, marginVertical: spacing.xs },
  syncBtn: { marginTop: spacing.sm },
});
