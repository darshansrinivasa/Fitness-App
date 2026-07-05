import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
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
import { ScreenScroll, screenStyles } from '../components/ScreenLayout';
import { getTodayWorkoutCount, logQuickWorkout, getRecentWorkouts, type WorkoutSummary } from '../db/fitness';
import { useAppSync } from '../sync/AppSyncContext';
import type { ModulesStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme/tokens';

type Nav = NativeStackNavigationProp<ModulesStackParamList, 'Fitness'>;

export function FitnessScreen() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const { refreshKey, afterLocalWrite } = useAppSync();
  const navigation = useNavigation<Nav>();
  const [exerciseName, setExerciseName] = useState('Bench Press');
  const [reps, setReps] = useState('8');
  const [weight, setWeight] = useState('60');
  const [setCount, setSetCount] = useState('3');
  const [history, setHistory] = useState<WorkoutSummary[]>([]);
  const [todayCount, setTodayCount] = useState(0);

  const reload = useCallback(async () => {
    if (!user) return;
    const [recent, count] = await Promise.all([
      getRecentWorkouts(db, user.id),
      getTodayWorkoutCount(db, user.id),
    ]);
    setHistory(recent);
    setTodayCount(count);
  }, [db, user]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  const handleLog = async () => {
    if (!user) return;
    const sets = Number.parseInt(setCount, 10);
    const repVal = Number.parseInt(reps, 10);
    const weightVal = Number.parseFloat(weight);
    if (!exerciseName.trim() || !Number.isFinite(sets) || sets < 1) {
      Alert.alert('Invalid input', 'Enter exercise name and set count.');
      return;
    }
    const setRows = Array.from({ length: sets }, () => ({
      reps: repVal,
      weight_kg: weightVal,
    }));
    await logQuickWorkout(db, user.id, exerciseName.trim(), setRows);
    await reload();
    await afterLocalWrite();
    Alert.alert('Logged', `${exerciseName} — ${sets} sets saved.`);
  };

  return (
    <ScreenScroll>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Modules</Text>
      </Pressable>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Fitness</Text>
        <Text style={screenStyles.subtitle}>{todayCount} workout(s) today</Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Quick log</Text>
        <Input value={exerciseName} onChangeText={setExerciseName} placeholder="Exercise name" />
        <View style={styles.row}>
          <Input value={setCount} onChangeText={setSetCount} keyboardType="number-pad" placeholder="Sets" style={styles.field} />
          <Input value={reps} onChangeText={setReps} keyboardType="number-pad" placeholder="Reps" style={styles.field} />
          <Input value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="kg" style={styles.field} />
        </View>
        <Button label="Log workout" onPress={() => void handleLog()} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Recent workouts</Text>
        {history.length === 0 ? (
          <Text style={styles.meta}>No workouts logged yet.</Text>
        ) : (
          history.map((item) => (
            <View key={`${item.id}-${item.exercise_name}`} style={styles.historyRow}>
              <View>
                <Text style={styles.historyTitle}>{item.exercise_name}</Text>
                <Text style={styles.meta}>
                  {new Date(item.started_at).toLocaleDateString()} · {item.set_count} sets
                </Text>
              </View>
            </View>
          ))
        )}
      </Card>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  back: { marginBottom: spacing.sm },
  backText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  field: { flex: 1, marginBottom: spacing.md },
  meta: { fontSize: 14, color: colors.textMuted },
  historyRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyTitle: { color: colors.text, fontSize: 16, fontWeight: '500' },
});
