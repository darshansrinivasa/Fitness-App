import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WaterLog } from '@lifestyle-os/shared/sync';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { GoalEditorModal } from '../components/GoalEditorModal';
import { ScreenScroll, screenStyles } from '../components/ScreenLayout';
import { WaterChart } from '../components/WaterChart';
import { WaterLogEditorModal } from '../components/WaterLogEditorModal';
import { WaterProgressRing } from '../components/WaterProgressRing';
import { useWaterModule } from '../hooks/useWaterModule';
import { colors, spacing } from '../theme/tokens';

const PRESETS_ML = [200, 350, 500] as const;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function WaterScreen() {
  const {
    todayLogs,
    todayTotalMl,
    dailyGoalMl,
    dailyTotals30d,
    logWater,
    updateDailyGoal,
    updateWaterEntry,
    deleteWaterEntry,
  } = useWaterModule();
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [editingLog, setEditingLog] = useState<WaterLog | null>(null);
  const [savingLog, setSavingLog] = useState(false);

  const handleSaveGoal = async (goalMl: number) => {
    setSavingGoal(true);
    try {
      await updateDailyGoal(goalMl);
    } finally {
      setSavingGoal(false);
    }
  };

  const handleSaveLog = async (amountMl: number) => {
    if (!editingLog) return;
    setSavingLog(true);
    try {
      await updateWaterEntry(editingLog.id, amountMl);
    } finally {
      setSavingLog(false);
    }
  };

  const confirmDelete = (log: WaterLog) => {
    Alert.alert(
      'Delete entry?',
      `Remove ${log.amount_ml} ml logged at ${formatTime(log.logged_at)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteWaterEntry(log.id),
        },
      ],
    );
  };

  return (
    <ScreenScroll>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Water</Text>
        <Text style={screenStyles.subtitle}>Hydration tracking</Text>
      </View>

      <Card>
        <View style={styles.headerRow}>
          <Text style={styles.cardTitle}>Today</Text>
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
              <View style={styles.logInfo}>
                <Text style={styles.logAmount}>{log.amount_ml} ml</Text>
                <Text style={styles.meta}>{formatTime(log.logged_at)}</Text>
              </View>
              <View style={styles.logActions}>
                <Pressable
                  onPress={() => setEditingLog(log)}
                  hitSlop={8}
                  accessibilityLabel={`Edit ${log.amount_ml} ml entry`}
                >
                  <Ionicons name="pencil-outline" size={20} color={colors.accent} />
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(log)}
                  hitSlop={8}
                  accessibilityLabel={`Delete ${log.amount_ml} ml entry`}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </Card>

      <GoalEditorModal
        visible={goalModalOpen}
        currentGoalMl={dailyGoalMl}
        saving={savingGoal}
        onClose={() => setGoalModalOpen(false)}
        onSave={handleSaveGoal}
      />

      <WaterLogEditorModal
        visible={editingLog !== null}
        currentAmountMl={editingLog?.amount_ml ?? 0}
        saving={savingLog}
        onClose={() => setEditingLog(null)}
        onSave={handleSaveLog}
      />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  goalLink: { fontSize: 14, color: colors.accent, fontWeight: '600' },
  total: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  meta: { fontSize: 14, color: colors.textMuted },
  presets: { flexDirection: 'row', gap: spacing.sm },
  presetButton: { flex: 1, paddingHorizontal: spacing.sm },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logAmount: { color: colors.text, fontSize: 16, fontWeight: '500' },
  logActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
