import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';

import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { screenStyles } from '../components/ScreenLayout';
import { addGoal, checkInGoal as saveGoalCheckIn, getActiveGoals, type GoalWithProgress } from '../db/goals';
import type { ModulesStackParamList } from '../navigation/types';
import { useAppSync } from '../sync/AppSyncContext';
import { colors, spacing } from '../theme/tokens';

type Nav = NativeStackNavigationProp<ModulesStackParamList, 'Goals'>;

const CATEGORIES = ['fitness', 'body', 'nutrition', 'habit', 'health', 'other'] as const;

export function GoalsScreen() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const { refreshKey, afterLocalWrite } = useAppSync();
  const navigation = useNavigation<Nav>();
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('fitness');
  const [startValue, setStartValue] = useState('0');
  const [targetValue, setTargetValue] = useState('100');
  const [unit, setUnit] = useState('');
  const [checkInTarget, setCheckInTarget] = useState<GoalWithProgress | null>(null);
  const [checkInValue, setCheckInValue] = useState('');

  const reload = useCallback(async () => {
    if (!user) return;
    setGoals(await getActiveGoals(db, user.id));
  }, [db, user]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  const handleAdd = async () => {
    if (!user || !title.trim()) return;
    await addGoal(db, user.id, {
      title: title.trim(),
      category,
      start_value: Number.parseFloat(startValue) || 0,
      target_value: Number.parseFloat(targetValue) || 100,
      unit: unit.trim() || undefined,
    });
    setTitle('');
    await reload();
    await afterLocalWrite();
  };

  const openCheckIn = (goal: GoalWithProgress) => {
    setCheckInTarget(goal);
    setCheckInValue(String(goal.current_value ?? goal.start_value ?? 0));
  };

  const submitCheckIn = async () => {
    if (!user || !checkInTarget) return;
    const value = Number.parseFloat(checkInValue);
    if (!Number.isFinite(value)) return;
    await saveGoalCheckIn(db, user.id, checkInTarget, value);
    setCheckInTarget(null);
    await reload();
    await afterLocalWrite();
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Modules</Text>
      </Pressable>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Goals</Text>
        <Text style={screenStyles.subtitle}>{goals.length} active</Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Active goals</Text>
        {goals.length === 0 ? (
          <Text style={styles.meta}>Create a goal below.</Text>
        ) : (
          goals.map((goal) => (
            <View key={goal.id} style={styles.goalCard}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <Text style={styles.meta}>
                {goal.current_value ?? goal.start_value} / {goal.target_value} {goal.unit}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${goal.progress_pct}%` }]} />
              </View>
              <Text style={styles.pct}>{goal.progress_pct}%</Text>
              <Button
                label="Check in"
                variant="secondary"
                onPress={() => openCheckIn(goal)}
                style={styles.checkInBtn}
              />
            </View>
          ))
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>New goal</Text>
        <Input value={title} onChangeText={setTitle} placeholder="Goal title" />
        <Text style={styles.label}>Category</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setCategory(cat)}
              style={[styles.chip, category === cat && styles.chipActive]}
            >
              <Text style={styles.chipText}>{cat}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          <Input value={startValue} onChangeText={setStartValue} keyboardType="decimal-pad" placeholder="Start" style={styles.field} />
          <Input value={targetValue} onChangeText={setTargetValue} keyboardType="decimal-pad" placeholder="Target" style={styles.field} />
        </View>
        <Input value={unit} onChangeText={setUnit} placeholder="Unit (kg, workouts, etc.)" />
        <Button label="Create goal" onPress={() => void handleAdd()} />
      </Card>

      <Modal visible={!!checkInTarget} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Check in</Text>
            <Text style={styles.meta}>{checkInTarget?.title}</Text>
            <Input
              value={checkInValue}
              onChangeText={setCheckInValue}
              keyboardType="decimal-pad"
              placeholder="Current value"
            />
            <View style={styles.modalActions}>
              <Button label="Cancel" variant="ghost" onPress={() => setCheckInTarget(null)} style={styles.modalBtn} />
              <Button label="Save" onPress={() => void submitCheckIn()} style={styles.modalBtn} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  back: { marginBottom: spacing.sm },
  backText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  meta: { fontSize: 14, color: colors.textMuted },
  goalCard: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  goalTitle: { color: colors.text, fontSize: 17, fontWeight: '600', marginBottom: spacing.xs },
  progressTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  pct: { color: colors.accent, fontWeight: '600', marginBottom: spacing.sm },
  checkInBtn: { alignSelf: 'flex-start' },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: '#0c4a6e' },
  chipText: { color: colors.text, fontSize: 12 },
  row: { flexDirection: 'row', gap: spacing.sm },
  field: { flex: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  modalBtn: { flex: 1 },
});
