import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import type { WeightLog } from '@lifestyle-os/shared/sync';

import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { screenStyles } from '../components/ScreenLayout';
import { WeightChart } from '../components/WeightChart';
import {
  calcBmi,
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

export function BodyScreen() {
  const db = useSQLiteContext();
  const { user, profile } = useAuth();
  const { refreshKey, afterLocalWrite } = useAppSync();
  const navigation = useNavigation<Nav>();
  const useLbs = profile?.weight_unit === 'lbs';
  const [weightInput, setWeightInput] = useState('');
  const [waistInput, setWaistInput] = useState('');
  const [latest, setLatest] = useState<WeightLog | null>(null);
  const [history, setHistory] = useState<WeightLog[]>([]);
  const [trend, setTrend] = useState<WeightTrendPoint[]>([]);

  const reload = useCallback(async () => {
    if (!user) return;
    const [last, hist, chart] = await Promise.all([
      getLatestWeight(db, user.id),
      getWeightHistory(db, user.id, 10),
      getWeightTrend(db, user.id, 30),
    ]);
    setLatest(last);
    setHistory(hist);
    setTrend(chart);
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
    const waist = Number.parseFloat(waistInput);
    if (!Number.isFinite(waist) || waist <= 0) {
      Alert.alert('Invalid measurement', 'Enter waist in cm.');
      return;
    }
    await logBodyMeasurement(db, user.id, { waist_cm: waist });
    await afterLocalWrite();
    Alert.alert('Saved', 'Measurements logged.');
  };

  const displayWeight = latest
    ? useLbs
      ? `${kgToLbs(latest.weight_kg)} lbs`
      : `${latest.weight_kg} kg`
    : '—';
  const bmi = latest ? calcBmi(latest.weight_kg, profile?.height_cm ?? null) : null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
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
        <Text style={styles.cardTitle}>Measurements</Text>
        <Input
          value={waistInput}
          onChangeText={setWaistInput}
          keyboardType="decimal-pad"
          placeholder="Waist (cm)"
        />
        <Button label="Save waist" variant="secondary" onPress={() => void handleLogMeasurements()} />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
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
