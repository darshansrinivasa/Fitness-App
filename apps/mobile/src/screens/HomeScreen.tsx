import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { screenStyles } from '../components/ScreenLayout';
import { useSync } from '../sync/SyncContext';
import { colors, spacing } from '../theme/tokens';

const PRESETS_ML = [200, 350, 500] as const;
const DAILY_GOAL_ML = 3000;

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
    pendingCount,
    lastSyncedAt,
    syncing,
    syncError,
    logWater,
    syncNow,
  } = useSync();

  const progress = Math.min(todayTotalMl / DAILY_GOAL_ML, 1);
  const displayName =
    profile?.full_name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email ||
    'User';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Hi, {displayName}</Text>
        <Text style={screenStyles.subtitle}>Slice 0 — Water pilot</Text>
      </View>

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

      <Card>
        <Text style={styles.cardTitle}>Water today</Text>
        <Text style={styles.total}>
          {todayTotalMl} / {DAILY_GOAL_ML} ml
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
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

      <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  total: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing.md,
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
  progressTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
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
