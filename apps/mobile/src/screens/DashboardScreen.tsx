import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';

import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ScreenScroll } from '../components/ScreenLayout';
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
import type { RootStackParamList, RootTabParamList } from '../navigation/types';
import { useAppSync } from '../sync/AppSyncContext';
import { colors, moduleColors, radius, spacing } from '../theme/tokens';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

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
    'there';
  const firstName = displayName.split(' ')[0];
  const initial = displayName.charAt(0).toUpperCase();
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

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
      <View style={styles.topRow}>
        <View style={styles.greeting}>
          <Text style={styles.hello}>Hi, {firstName}</Text>
          <Text style={styles.dateLabel}>{todayLabel}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile and settings"
          onPress={() => navigation.navigate('Settings')}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{initial}</Text>
        </Pressable>
      </View>

      <View style={styles.syncBanner}>
        <Text style={styles.syncMeta}>
          {syncing
            ? 'Syncing…'
            : syncError
              ? syncError
              : pendingCount > 0
                ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync`
                : 'All changes synced'}
        </Text>
        <Pressable onPress={() => void syncNow()} disabled={syncing}>
          <Text style={styles.link}>{syncing ? 'Syncing' : 'Sync'}</Text>
        </Pressable>
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

      <Text style={styles.section}>Today</Text>
      <View style={styles.grid}>
        <StatCard
          title="Water"
          accent={moduleColors.water.border}
          onPress={() => navigation.navigate('Modules', { screen: 'Water' })}
        >
          <WaterProgressRing currentMl={todayTotalMl} goalMl={dailyGoalMl} size={88} />
        </StatCard>
        <StatCard
          title="Fitness"
          accent={moduleColors.fitness.border}
          value={String(workoutsToday)}
          caption="workouts today"
          onPress={() => navigation.navigate('Modules', { screen: 'Fitness' })}
        />
      </View>
      <View style={styles.grid}>
        <StatCard
          title="Nutrition"
          accent={moduleColors.nutrition.border}
          value={String(calories.current)}
          caption={`/ ${calories.goal} kcal`}
          onPress={() => navigation.navigate('Modules', { screen: 'Nutrition' })}
        />
        <StatCard
          title="Weight"
          accent={moduleColors.body.border}
          value={latestWeight}
          caption="latest entry"
          onPress={() => navigation.navigate('Modules', { screen: 'Body' })}
        />
      </View>
      <View style={styles.grid}>
        <StatCard
          title="Sleep"
          accent={moduleColors.sleep.border}
          value={sleepSummary}
          caption="last night"
          onPress={() => navigation.navigate('Modules', { screen: 'Sleep' })}
        />
        <StatCard
          title="Habits"
          accent={moduleColors.habits.border}
          value={habitsSummary}
          caption="done today"
          onPress={() => navigation.navigate('Modules', { screen: 'Habits' })}
        />
      </View>
      <View style={styles.grid}>
        <StatCard
          title="Supplements"
          accent={moduleColors.supplements.border}
          value={supplementsSummary}
          caption="taken today"
          onPress={() => navigation.navigate('Modules', { screen: 'Supplements' })}
        />
        <StatCard
          title="Goals"
          accent={moduleColors.goals.border}
          value={String(activeGoals)}
          caption="active"
          onPress={() => navigation.navigate('Modules', { screen: 'Goals' })}
        />
      </View>
      <View style={styles.grid}>
        <StatCard
          title="Health"
          accent={moduleColors.health.border}
          value={heartRate}
          caption="latest heart rate"
          onPress={() => navigation.navigate('Modules', { screen: 'Health' })}
        />
        <StatCard
          title="Photos"
          accent={moduleColors.photos.border}
          value={String(photoCount)}
          caption="progress shots"
          onPress={() => navigation.navigate('Modules', { screen: 'Photos' })}
        />
      </View>
    </ScreenScroll>
  );
}

function StatCard({
  title,
  accent,
  value,
  caption,
  onPress,
  children,
}: {
  title: string;
  accent: string;
  value?: string;
  caption?: string;
  onPress: () => void;
  children?: ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={styles.gridPress}>
      <Card style={[styles.gridCard, { borderLeftWidth: 4, borderLeftColor: accent }]}>
        <Text style={styles.cardTitle}>{title}</Text>
        {children ?? <Text style={styles.stat}>{value}</Text>}
        {caption ? <Text style={styles.meta}>{caption}</Text> : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  greeting: { flex: 1 },
  hello: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: colors.text },
  dateLabel: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.accentContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#3d2e89', fontSize: 16, fontWeight: '700' },
  syncMeta: { flex: 1, fontSize: 13, color: colors.textMuted },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  section: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
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
  grid: { flexDirection: 'row', gap: spacing.md },
  gridPress: { flex: 1 },
  gridCard: { flex: 1, alignItems: 'center', marginBottom: spacing.md },
  stat: { fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center' },
  statSmall: { fontSize: 20, fontWeight: '700', color: colors.accent },
  meta: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.danger, fontSize: 13, marginVertical: spacing.xs },
  syncBtn: { marginTop: spacing.sm },
});
