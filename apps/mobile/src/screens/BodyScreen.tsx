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
import type { BodyMeasurement, WeightLog } from '@lifestyle-os/shared/sync';

import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { ScreenScroll, screenStyles } from '../components/ScreenLayout';
import { WeightChart } from '../components/WeightChart';
import {
  calcBmi,
  getLatestBodyMeasurement,
  getLatestWeight,
  getWeightHistory,
  getWeightTrend,
  kgToLbs,
  logBodyMeasurement,
  logWeight,
  lbsToKg,
  type WeightTrendPoint,
} from '../db/body';
import type { ModulesStackParamList } from '../navigation/types';
import { useAppSync } from '../sync/AppSyncContext';
import { colors, spacing } from '../theme/tokens';

type Nav = NativeStackNavigationProp<ModulesStackParamList, 'Body'>;

const MEASUREMENT_FIELDS = [
  ['chest_cm', 'Chest'],
  ['waist_cm', 'Waist'],
  ['hips_cm', 'Hips'],
  ['shoulders_cm', 'Shoulders'],
  ['neck_cm', 'Neck'],
  ['left_arm_cm', 'Left arm'],
  ['right_arm_cm', 'Right arm'],
  ['left_thigh_cm', 'Left thigh'],
  ['right_thigh_cm', 'Right thigh'],
  ['left_calf_cm', 'Left calf'],
  ['right_calf_cm', 'Right calf'],
] as const;

export function BodyScreen() {
  const db = useSQLiteContext();
  const { user, profile } = useAuth();
  const { refreshKey, afterLocalWrite } = useAppSync();
  const navigation = useNavigation<Nav>();
  const useLbs = profile?.weight_unit === 'lbs';
  const [weightInput, setWeightInput] = useState('');
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [latestMeasurement, setLatestMeasurement] = useState<BodyMeasurement | null>(null);
  const [latest, setLatest] = useState<WeightLog | null>(null);
  const [history, setHistory] = useState<WeightLog[]>([]);
  const [trend, setTrend] = useState<WeightTrendPoint[]>([]);

  const reload = useCallback(async () => {
    if (!user) return;
    const [last, hist, chart, measurement] = await Promise.all([
      getLatestWeight(db, user.id),
      getWeightHistory(db, user.id, 10),
      getWeightTrend(db, user.id, 30),
      getLatestBodyMeasurement(db, user.id),
    ]);
    setLatest(last);
    setHistory(hist);
    setTrend(chart);
    setLatestMeasurement(measurement);
    if (measurement) {
      const next: Record<string, string> = {};
      for (const [key] of MEASUREMENT_FIELDS) {
        const value = measurement[key];
        if (value != null) next[key] = String(value);
      }
      setMeasurements(next);
    }
    if (last) {
      setWeightInput(
        String(useLbs ? kgToLbs(last.weight_kg) : Math.round(last.weight_kg * 10) / 10),
      );
    }
  }, [db, user, useLbs]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  const handleLogWeight = async () => {
    if (!user) return;
    const val = Number.parseFloat(weightInput);
    if (!Number.isFinite(val) || val <= 0) {
      Alert.alert('Invalid weight', 'Enter a valid number.');
      return;
    }
    const weightKg = useLbs ? lbsToKg(val) : val;
    await logWeight(db, user.id, weightKg);
    await reload();
    await afterLocalWrite();
    Alert.alert('Saved', 'Weight logged.');
  };

  const handleLogMeasurements = async () => {
    if (!user) return;
    const patch: Partial<Pick<BodyMeasurement, (typeof MEASUREMENT_FIELDS)[number][0]>> = {};
    for (const [key, label] of MEASUREMENT_FIELDS) {
      const raw = measurements[key]?.trim();
      if (!raw) continue;
      const value = Number.parseFloat(raw);
      if (!Number.isFinite(value) || value <= 0) {
        Alert.alert('Invalid measurement', `${label} must be a number in cm.`);
        return;
      }
      patch[key] = value;
    }
    if (Object.keys(patch).length === 0) {
      Alert.alert('Measurements', 'Enter at least one measurement in cm.');
      return;
    }
    await logBodyMeasurement(db, user.id, patch);
    await reload();
    await afterLocalWrite();
    Alert.alert('Saved', 'Measurements logged and queued to sync.');
  };

  const displayWeight = latest
    ? useLbs
      ? `${kgToLbs(latest.weight_kg)} lbs`
      : `${latest.weight_kg} kg`
    : '—';
  const bmi = latest ? calcBmi(latest.weight_kg, profile?.height_cm ?? null) : null;

  return (
    <ScreenScroll>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Modules</Text>
      </Pressable>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Body</Text>
        <Text style={screenStyles.subtitle}>
          Latest: {displayWeight}
          {bmi ? ` · BMI ${bmi}` : ''}
        </Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Log weight</Text>
        <Input
          value={weightInput}
          onChangeText={setWeightInput}
          keyboardType="decimal-pad"
          placeholder={useLbs ? 'Weight (lbs)' : 'Weight (kg)'}
        />
        <Button label="Save weight" onPress={() => void handleLogWeight()} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Measurements (cm)</Text>
        {latestMeasurement ? (
          <Text style={styles.meta}>Last logged {latestMeasurement.logged_date}</Text>
        ) : null}
        {MEASUREMENT_FIELDS.map(([key, label]) => (
          <Input
            key={key}
            value={measurements[key] ?? ''}
            onChangeText={(value) => setMeasurements((current) => ({ ...current, [key]: value }))}
            keyboardType="decimal-pad"
            placeholder={`${label} (cm)`}
          />
        ))}
        <Button label="Save measurements" variant="secondary" onPress={() => void handleLogMeasurements()} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Weight trend (30 days)</Text>
        <WeightChart data={trend} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>History</Text>
        {history.length === 0 ? (
          <Text style={styles.meta}>No entries yet.</Text>
        ) : (
          history.map((entry) => (
            <View key={entry.id} style={styles.row}>
              <Text style={styles.rowTitle}>{entry.logged_date}</Text>
              <Text style={styles.meta}>
                {useLbs ? `${kgToLbs(entry.weight_kg)} lbs` : `${entry.weight_kg} kg`}
              </Text>
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
  meta: { color: colors.textMuted, fontSize: 14 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '500' },
});
