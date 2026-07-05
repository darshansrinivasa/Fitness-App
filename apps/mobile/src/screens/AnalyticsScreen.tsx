import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import {
  buildPeriodSummary,
  periodToPreset,
  resolveDateRange,
  type ReportPeriod,
} from '@lifestyle-os/shared';

import { useAuth } from '../auth/AuthContext';
import { Card } from '../components/Card';
import { HabitHeatmap } from '../components/HabitHeatmap';
import { PhotoComparison } from '../components/PhotoComparison';
import { ScreenScroll, screenStyles } from '../components/ScreenLayout';
import { WaterChart } from '../components/WaterChart';
import { WeightChart } from '../components/WeightChart';
import {
  gatherLifestyleExport,
  getHabitHeatmapForRange,
  getPhotosInRange,
  getWaterTotalsForRange,
  getWeightTrendForRange,
} from '../db/analytics';
import { ensureDefaultWaterGoal, getActiveWaterGoal } from '../db/waterGoals';
import { getSignedPhotoUrl } from '../lib/photoStorage';
import type { InsightsStackParamList } from '../navigation/types';
import { useAppSync } from '../sync/AppSyncContext';
import { colors, spacing } from '../theme/tokens';

type Nav = NativeStackNavigationProp<InsightsStackParamList, 'Analytics'>;

const PERIODS: ReportPeriod[] = ['daily', 'weekly', 'monthly'];

export function AnalyticsScreen() {
  const db = useSQLiteContext();
  const { user, profile } = useAuth();
  const { refreshKey } = useAppSync();
  const navigation = useNavigation<Nav>();
  const [period, setPeriod] = useState<ReportPeriod>('weekly');
  const [summaryHeadline, setSummaryHeadline] = useState('—');
  const [moduleCards, setModuleCards] = useState<
    Array<{ label: string; headline: string; detail: string }>
  >([]);
  const [waterData, setWaterData] = useState<Array<{ day: string; total_ml: number }>>([]);
  const [waterGoal, setWaterGoal] = useState(3000);
  const [weightData, setWeightData] = useState<Array<{ day: string; weight_kg: number }>>([]);
  const [heatmap, setHeatmap] = useState<Awaited<ReturnType<typeof getHabitHeatmapForRange>>>([]);
  const [photoCompare, setPhotoCompare] = useState({
    beforeUrl: null as string | null,
    afterUrl: null as string | null,
    beforeDate: '—',
    afterDate: '—',
  });

  const reload = useCallback(async () => {
    if (!user) return;
    await ensureDefaultWaterGoal(db, user.id);
    const range = resolveDateRange(periodToPreset(period));
    const goal = await getActiveWaterGoal(db, user.id);
    setWaterGoal(goal?.daily_target_ml ?? 3000);

    const exportData = await gatherLifestyleExport(
      db,
      user.id,
      range.from,
      range.to,
      {
        name: profile?.full_name ?? null,
        height_cm: profile?.height_cm ?? null,
        weight_unit: profile?.weight_unit ?? 'kg',
      },
      { modules: ['water', 'fitness', 'nutrition', 'body', 'sleep', 'habits', 'health', 'skincare', 'photos'], includePhotoMetadata: true },
    );

    const summary = buildPeriodSummary(period, range, exportData);
    setSummaryHeadline(
      `${summary.totals.workouts} workouts · ${summary.totals.water_avg_ml} ml water · ${summary.totals.sleep_avg_hours}h sleep`,
    );
    setModuleCards(summary.modules);

    const [water, weight, heat, photos] = await Promise.all([
      getWaterTotalsForRange(db, user.id, range.from, range.to),
      getWeightTrendForRange(db, user.id, range.from, range.to),
      getHabitHeatmapForRange(db, user.id, range.from, range.to),
      getPhotosInRange(db, user.id, range.from, range.to),
    ]);
    setWaterData(water);
    setWeightData(weight);
    setHeatmap(heat);

    if (photos.length >= 1) {
      const first = photos[0];
      const last = photos[photos.length - 1];
      const [beforeUrl, afterUrl] = await Promise.all([
        getSignedPhotoUrl(first.storage_path),
        getSignedPhotoUrl(last.storage_path),
      ]);
      setPhotoCompare({
        beforeUrl,
        afterUrl,
        beforeDate: first.taken_date,
        afterDate: last.taken_date,
      });
    } else {
      setPhotoCompare({ beforeUrl: null, afterUrl: null, beforeDate: '—', afterDate: '—' });
    }
  }, [db, user, profile, period]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  return (
    <ScreenScroll>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Analytics</Text>
        <Text style={screenStyles.subtitle}>{summaryHeadline}</Text>
      </View>

      <View style={styles.tabRow}>
        {PERIODS.map((p) => (
          <Pressable
            key={p}
            onPress={() => setPeriod(p)}
            style={[styles.tabBtn, period === p && styles.tabActive]}
          >
            <Text style={styles.tabText}>{p}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={() => navigation.navigate('Export')}>
        <Text style={styles.exportLink}>Export data →</Text>
      </Pressable>

      <View style={styles.grid}>
        {moduleCards.slice(0, 6).map((m) => (
          <Card key={m.label} style={styles.gridCard}>
            <Text style={styles.cardTitle}>{m.label}</Text>
            <Text style={styles.stat}>{m.headline}</Text>
            <Text style={styles.meta}>{m.detail}</Text>
          </Card>
        ))}
      </View>

      <Card>
        <Text style={styles.cardTitle}>Water trend</Text>
        <WaterChart data={waterData} goalMl={waterGoal} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Weight trend</Text>
        <WeightChart data={weightData} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Habit heatmap</Text>
        <HabitHeatmap rows={heatmap} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Photo comparison</Text>
        <PhotoComparison {...photoCompare} />
      </Card>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.accent },
  tabText: { color: colors.text, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  exportLink: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
  gridCard: { width: '47%', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  stat: { fontSize: 22, fontWeight: '700', color: colors.accent },
  meta: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
