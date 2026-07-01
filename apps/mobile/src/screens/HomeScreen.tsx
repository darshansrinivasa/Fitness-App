import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { GoalEditorModal } from '../components/GoalEditorModal';
import { screenStyles } from '../components/ScreenLayout';
import { WaterChart } from '../components/WaterChart';
import { WaterProgressRing } from '../components/WaterProgressRing';
import { useSync } from '../sync/SyncContext';
import { colors, spacing } from '../theme/tokens';

const PRESETS_ML = [200, 350, 500] as const;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSyncedAt(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString();
}

export function HomeScreen() {
  const { user, profile, signOut } = useAuth();
  const {
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
  } = useSync();
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);

  const displayName =
    profile?.full_name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email ||
    'User';

  const handleSaveGoal = async (goalMl: number) => {
    setSavingGoal(true);
    try {
      await updateDailyGoal(goalMl);
    } finally {
      setSavingGoal(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Hi, {displayName}</Text>
        <Text style={screenStyles.subtitle}>Slice 1 — Water</Text>
      </View>

      <Card>
        <View style={styles.waterHeader}>
          <Text style={styles.cardTitle}>Water today</Text>
          <Pressable onPress={() => setGoalModalOpen(true)}>
            <Text style={styles.goalLink}>Goal: {dailyGoalMl} ml</Text>
          </Pressable>
        </View>

        <WaterProgressRing currentMl={todayTotalMl} goalMl={dailyGoalMl} />

        <Text style={styles.total}>
          {todayTotalMl} / {dailyGoalMl} ml
        </Text>

        <View style={styles.presets}>
          {PRESETS_ML.map((ml) => (
            <Button
              key={ml}
              label={`+${ml} ml`}
              variant="secondary"
              onPress={() => void logWater(ml)}
              style={styles.presetButton}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Last 30 days</Text>
        <WaterChart data={dailyTotals30d} goalMl={dailyGoalMl} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Today&apos;s log</Text>
        {todayLogs.length === 0 ? (
          <Text style={styles.meta}>No water logged yet.</Text>
        ) : (
          todayLogs.map((log) => (
            <View key={log.id} style={styles.logRow}>
              <Text style={styles.logAmount}>{log.amount_ml} ml</Text>
              <Text style={styles.meta}>{formatTime(log.logged_at)}</Text>
            </View>
          ))
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Sync</Text>
        <Text style={styles.meta}>Pending: {pendingCount}</Text>
        <Text style={styles.meta}>Last synced: {formatSyncedAt(lastSyncedAt)}</Text>
        {syncError ? <Text style={styles.error}>{syncError}</Text> : null}
        <Button
          label={syncing ? 'Syncing…' : 'Sync now'}
          loading={syncing}
          onPress={() => void syncNow()}
          style={styles.syncButton}
        />
      </Card>

      <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />

      <GoalEditorModal
        visible={goalModalOpen}
        currentGoalMl={dailyGoalMl}
        saving={savingGoal}
        onClose={() => setGoalModalOpen(false)}
        onSave={handleSaveGoal}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  goalLink: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  total: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  meta: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  error: {
    fontSize: 14,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  presets: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  presetButton: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  syncButton: {
    marginTop: spacing.sm,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logAmount: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
});
