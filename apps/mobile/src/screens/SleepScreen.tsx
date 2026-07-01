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
import type { SleepLog } from '@lifestyle-os/shared/sync';

import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { screenStyles } from '../components/ScreenLayout';
import {
  buildSleepTimes,
  formatDuration,
  getAvgSleepMinutes7d,
  getLastSleepLog,
  getSleepHistory,
  logSleep,
} from '../db/sleep';
import type { ModulesStackParamList } from '../navigation/types';
import { useAppSync } from '../sync/AppSyncContext';
import { colors, spacing } from '../theme/tokens';

type Nav = NativeStackNavigationProp<ModulesStackParamList, 'Sleep'>;

const QUALITY = [1, 2, 3, 4, 5] as const;

export function SleepScreen() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const { refreshKey, afterLocalWrite } = useAppSync();
  const navigation = useNavigation<Nav>();
  const [bedtime, setBedtime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [quality, setQuality] = useState(4);
  const [last, setLast] = useState<SleepLog | null>(null);
  const [history, setHistory] = useState<SleepLog[]>([]);
  const [avg7d, setAvg7d] = useState<number | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    const [lastLog, hist, avg] = await Promise.all([
      getLastSleepLog(db, user.id),
      getSleepHistory(db, user.id),
      getAvgSleepMinutes7d(db, user.id),
    ]);
    setLast(lastLog);
    setHistory(hist);
    setAvg7d(avg);
  }, [db, user]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  const handleSave = async () => {
    if (!user) return;
    const times = buildSleepTimes(bedtime, wakeTime);
    await logSleep(db, user.id, {
      bedtime: times.bedtime,
      wakeTime: times.wake_time,
      qualityRating: quality,
    });
    await reload();
    await afterLocalWrite();
    Alert.alert('Saved', 'Sleep logged for last night.');
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Modules</Text>
      </Pressable>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Sleep</Text>
        <Text style={screenStyles.subtitle}>
          Avg 7d: {formatDuration(avg7d)}
        </Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Log last night</Text>
        <Input value={bedtime} onChangeText={setBedtime} placeholder="Bedtime (HH:MM)" />
        <Input value={wakeTime} onChangeText={setWakeTime} placeholder="Wake (HH:MM)" />
        <Text style={styles.label}>Quality</Text>
        <View style={styles.qualityRow}>
          {QUALITY.map((q) => (
            <Pressable
              key={q}
              onPress={() => setQuality(q)}
              style={[styles.qualityBtn, quality === q && styles.qualityActive]}
            >
              <Text style={styles.qualityText}>{q}</Text>
            </Pressable>
          ))}
        </View>
        <Button label="Save sleep" onPress={() => void handleSave()} />
      </Card>

      {last ? (
        <Card>
          <Text style={styles.cardTitle}>Last entry</Text>
          <Text style={styles.stat}>{formatDuration(last.duration_minutes)}</Text>
          <Text style={styles.meta}>
            {last.sleep_date} · Quality {last.quality_rating}/5
          </Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.cardTitle}>History</Text>
        {history.length === 0 ? (
          <Text style={styles.meta}>No sleep logged yet.</Text>
        ) : (
          history.map((entry) => (
            <View key={entry.id} style={styles.row}>
              <Text style={styles.rowTitle}>{entry.sleep_date}</Text>
              <Text style={styles.meta}>
                {formatDuration(entry.duration_minutes)} · ★{entry.quality_rating}
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
  label: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs },
  qualityRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  qualityBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qualityActive: { borderColor: colors.accent, backgroundColor: '#0c4a6e' },
  qualityText: { color: colors.text, fontWeight: '600' },
  stat: { fontSize: 28, fontWeight: '700', color: colors.accent },
  meta: { fontSize: 14, color: colors.textMuted },
  row: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '500' },
});
