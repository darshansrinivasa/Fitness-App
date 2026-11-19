import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import { todayDateString, type PersonalRecord, type WorkoutTemplate } from '@lifestyle-os/shared/sync';

import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { ModuleTabs } from '../components/ModuleTabs';
import { ScreenScroll, screenStyles } from '../components/ScreenLayout';
import {
  getPersonalRecords,
  getSessions,
  getWeeklyWorkoutDays,
  getWorkoutTemplates,
  logWorkoutSession,
  saveWorkoutTemplate,
  type ExerciseDraft,
  type WorkoutSession,
} from '../db/fitness';
import type { ModulesStackParamList } from '../navigation/types';
import { useAppSync } from '../sync/AppSyncContext';
import { colors, moduleColors, spacing } from '../theme/tokens';

type Nav = NativeStackNavigationProp<ModulesStackParamList, 'Fitness'>;
type Tab = 'today' | 'history' | 'templates' | 'records';

const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'history', label: 'History' },
  { id: 'templates', label: 'Templates' },
  { id: 'records', label: 'Records' },
];

const EMPTY_DRAFT: ExerciseDraft = {
  exercise_name: '',
  sets: 3,
  reps: 8,
  weight_kg: 60,
};

export function FitnessScreen() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const { refreshKey, afterLocalWrite } = useAppSync();
  const navigation = useNavigation<Nav>();
  const accent = moduleColors.fitness.accent;
  const [tab, setTab] = useState<Tab>('today');
  const [workoutName, setWorkoutName] = useState('Push Day');
  const [drafts, setDrafts] = useState<ExerciseDraft[]>([{ ...EMPTY_DRAFT, exercise_name: 'Bench Press' }]);
  const [today, setToday] = useState<WorkoutSession[]>([]);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [weekDays, setWeekDays] = useState(0);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);

  const reload = useCallback(async () => {
    if (!user) return;
    const todayDate = todayDateString();
    const [todaySessions, historySessions, days, templateRows, recordRows] = await Promise.all([
      getSessions(db, user.id, { date: todayDate }),
      getSessions(db, user.id, { limit: 40 }),
      getWeeklyWorkoutDays(db, user.id),
      getWorkoutTemplates(db, user.id),
      getPersonalRecords(db, user.id),
    ]);
    setToday(todaySessions);
    setHistory(historySessions);
    setWeekDays(days);
    setTemplates(templateRows);
    setRecords(recordRows);
  }, [db, user]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  const updateDraft = (index: number, patch: Partial<ExerciseDraft>) => {
    setDrafts((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const readyExercises = () =>
    drafts
      .map((row) => ({
        ...row,
        exercise_name: row.exercise_name.trim(),
        sets: Number(row.sets),
        reps: Number(row.reps),
        weight_kg: Number(row.weight_kg),
      }))
      .filter(
        (row) =>
          row.exercise_name &&
          Number.isFinite(row.sets) &&
          row.sets > 0 &&
          Number.isFinite(row.reps) &&
          row.reps > 0 &&
          Number.isFinite(row.weight_kg) &&
          row.weight_kg > 0,
      );

  const handleLog = async (templateId?: string | null) => {
    if (!user) return;
    const exercises = readyExercises();
    if (!workoutName.trim() || exercises.length === 0) {
      Alert.alert('Add an exercise', 'Enter a workout name and at least one exercise with sets, reps, and weight.');
      return;
    }
    await logWorkoutSession(db, user.id, workoutName.trim(), exercises, templateId);
    await reload();
    await afterLocalWrite();
    Alert.alert('Logged', `${workoutName.trim()} saved and queued to sync.`);
  };

  const handleSaveTemplate = async () => {
    if (!user) return;
    const exercises = readyExercises();
    if (!workoutName.trim() || exercises.length === 0) {
      Alert.alert('Add an exercise', 'Name the template and add at least one exercise.');
      return;
    }
    await saveWorkoutTemplate(db, user.id, workoutName.trim(), exercises);
    await reload();
    await afterLocalWrite();
    setTab('templates');
  };

  const applyTemplate = (template: WorkoutTemplate) => {
    setWorkoutName(template.name);
    setDrafts(
      template.exercises.map((exercise) => ({
        exercise_name: exercise.exercise_name,
        sets: exercise.sets,
        reps: exercise.reps,
        weight_kg: exercise.weight_kg,
      })),
    );
    setTab('today');
  };

  const todayVolume = today.reduce((sum, session) => sum + session.volume, 0);

  return (
    <ScreenScroll>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Modules</Text>
      </Pressable>
      <Text style={[screenStyles.title, { color: accent }]}>Fitness</Text>
      <Text style={screenStyles.subtitle}>
        {weekDays}/7 days this week · {Math.round(todayVolume)} kg volume today
      </Text>
      <ModuleTabs tabs={TABS} value={tab} onChange={setTab} accent={accent} />

      {tab === 'today' ? (
        <>
          {today.length === 0 ? (
            <Card>
              <Text style={styles.meta}>No workout logged today.</Text>
            </Card>
          ) : (
            today.map((session) => <SessionCard key={session.id} session={session} />)
          )}
          <Card>
            <Text style={styles.cardTitle}>Log workout</Text>
            <Input value={workoutName} onChangeText={setWorkoutName} placeholder="Workout name" />
            {drafts.map((draft, index) => (
              <View key={`draft-${index}`} style={styles.draft}>
                <Input
                  value={draft.exercise_name}
                  onChangeText={(value) => updateDraft(index, { exercise_name: value })}
                  placeholder="Exercise name"
                />
                <View style={styles.row}>
                  <Input
                    value={String(draft.sets)}
                    onChangeText={(value) => updateDraft(index, { sets: Number(value) || 0 })}
                    keyboardType="number-pad"
                    placeholder="Sets"
                    style={styles.field}
                  />
                  <Input
                    value={String(draft.reps)}
                    onChangeText={(value) => updateDraft(index, { reps: Number(value) || 0 })}
                    keyboardType="number-pad"
                    placeholder="Reps"
                    style={styles.field}
                  />
                  <Input
                    value={String(draft.weight_kg)}
                    onChangeText={(value) => updateDraft(index, { weight_kg: Number(value) || 0 })}
                    keyboardType="decimal-pad"
                    placeholder="kg"
                    style={styles.field}
                  />
                </View>
              </View>
            ))}
            <Button
              label="Add exercise"
              variant="secondary"
              onPress={() => setDrafts((current) => [...current, { ...EMPTY_DRAFT }])}
            />
            <Button label="Finish workout" onPress={() => void handleLog()} />
            <Button label="Save as template" variant="ghost" onPress={() => void handleSaveTemplate()} />
          </Card>
        </>
      ) : null}

      {tab === 'history' ? (
        history.length === 0 ? (
          <Card>
            <Text style={styles.meta}>No workouts yet.</Text>
          </Card>
        ) : (
          history.map((session) => <SessionCard key={session.id} session={session} />)
        )
      ) : null}

      {tab === 'templates' ? (
        templates.length === 0 ? (
          <Card>
            <Text style={styles.meta}>Save a workout from Today to reuse it.</Text>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <Text style={styles.cardTitle}>{template.name}</Text>
              {template.exercises.map((exercise) => (
                <Text key={exercise.exercise_name} style={styles.meta}>
                  {exercise.exercise_name} · {exercise.sets} sets · {exercise.weight_kg} kg
                </Text>
              ))}
              <Button label="Use template" variant="secondary" onPress={() => applyTemplate(template)} />
            </Card>
          ))
        )
      ) : null}

      {tab === 'records' ? (
        records.length === 0 ? (
          <Card>
            <Text style={styles.meta}>Personal records appear when you lift heavier than before.</Text>
          </Card>
        ) : (
          records.map((record) => (
            <Card key={record.id}>
              <Text style={styles.cardTitle}>{record.exercise_name}</Text>
              <Text style={styles.meta}>
                {record.weight_kg} kg × {record.reps} reps
              </Text>
            </Card>
          ))
        )
      ) : null}
    </ScreenScroll>
  );
}

function SessionCard({ session }: { session: WorkoutSession }) {
  return (
    <Card>
      <View style={styles.sessionHead}>
        <View>
          <Text style={styles.cardTitle}>{session.name}</Text>
          <Text style={styles.meta}>{new Date(session.started_at).toLocaleString()}</Text>
        </View>
        <Text style={styles.volume}>{Math.round(session.volume)} kg</Text>
      </View>
      {session.exercises.map((exercise) => (
        <View key={`${session.id}-${exercise.exercise_name}`} style={styles.exerciseRow}>
          <Text style={styles.rowTitle}>{exercise.exercise_name}</Text>
          <Text style={styles.meta}>
            {exercise.set_count} sets · {exercise.top_weight ?? '—'} kg
          </Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  back: { marginBottom: spacing.sm },
  backText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  meta: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  field: { flex: 1 },
  draft: { marginBottom: spacing.sm },
  sessionHead: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  volume: { color: moduleColors.fitness.accent, fontWeight: '700' },
  exerciseRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '500' },
});
