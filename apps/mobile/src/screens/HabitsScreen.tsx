import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';

import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { screenStyles } from '../components/ScreenLayout';
import {
  addHabit,
  getHabitsWithStatus,
  toggleHabitToday,
  type HabitWithStatus,
} from '../db/habits';
import type { ModulesStackParamList } from '../navigation/types';
import { useAppSync } from '../sync/AppSyncContext';
import { colors, spacing } from '../theme/tokens';

type Nav = NativeStackNavigationProp<ModulesStackParamList, 'Habits'>;

export function HabitsScreen() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const { refreshKey, afterLocalWrite } = useAppSync();
  const navigation = useNavigation<Nav>();
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [newName, setNewName] = useState('');

  const reload = useCallback(async () => {
    if (!user) return;
    setHabits(await getHabitsWithStatus(db, user.id));
  }, [db, user]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  const handleAdd = async () => {
    if (!user || !newName.trim()) return;
    await addHabit(db, user.id, newName.trim());
    setNewName('');
    await reload();
    await afterLocalWrite();
  };

  const handleToggle = async (habitId: string) => {
    if (!user) return;
    await toggleHabitToday(db, user.id, habitId);
    await reload();
    await afterLocalWrite();
  };

  const doneCount = habits.filter((h) => h.completed_today).length;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Modules</Text>
      </Pressable>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Habits</Text>
        <Text style={screenStyles.subtitle}>
          Today: {doneCount}/{habits.length} done
        </Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Today&apos;s checklist</Text>
        {habits.length === 0 ? (
          <Text style={styles.meta}>Add a habit below to get started.</Text>
        ) : (
          habits.map((habit) => (
            <Pressable
              key={habit.id}
              onPress={() => void handleToggle(habit.id)}
              style={styles.habitRow}
            >
              <View style={[styles.check, habit.completed_today && styles.checkDone]}>
                <Text style={styles.checkMark}>{habit.completed_today ? '✓' : ''}</Text>
              </View>
              <View style={styles.habitInfo}>
                <Text style={styles.habitName}>{habit.name}</Text>
                <Text style={styles.meta}>🔥 {habit.streak} day streak</Text>
              </View>
            </Pressable>
          ))
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Add habit</Text>
        <Input value={newName} onChangeText={setNewName} placeholder="Habit name" />
        <Button label="Create habit" onPress={() => void handleAdd()} />
      </Card>
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
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { borderColor: colors.success, backgroundColor: colors.success },
  checkMark: { color: colors.bg, fontWeight: '700', fontSize: 16 },
  habitInfo: { flex: 1 },
  habitName: { color: colors.text, fontSize: 16, fontWeight: '500' },
});
