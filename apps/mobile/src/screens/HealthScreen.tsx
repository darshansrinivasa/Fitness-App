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
import type { MedicalRecord, SymptomLog, VitalsLog } from '@lifestyle-os/shared/sync';

import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { screenStyles } from '../components/ScreenLayout';
import {
  addMedicalRecord,
  getLatestHeartRate,
  getMedicalRecords,
  getRecentSymptoms,
  getRecentVitals,
  logSymptom,
  logVitals,
} from '../db/health';
import type { ModulesStackParamList } from '../navigation/types';
import { useAppSync } from '../sync/AppSyncContext';
import { colors, spacing } from '../theme/tokens';

type Nav = NativeStackNavigationProp<ModulesStackParamList, 'Health'>;
type Tab = 'vitals' | 'symptoms' | 'medical';

const RECORD_TYPES: MedicalRecord['record_type'][] = [
  'visit',
  'diagnosis',
  'prescription',
  'lab_result',
  'vaccination',
];

export function HealthScreen() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const { refreshKey, afterLocalWrite } = useAppSync();
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('vitals');
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [vitals, setVitals] = useState<VitalsLog[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomLog[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);

  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [hr, setHr] = useState('');
  const [sugar, setSugar] = useState('');
  const [symptomText, setSymptomText] = useState('');
  const [severity, setSeverity] = useState(3);
  const [recordTitle, setRecordTitle] = useState('');
  const [recordType, setRecordType] = useState<MedicalRecord['record_type']>('visit');
  const [doctorName, setDoctorName] = useState('');

  const reload = useCallback(async () => {
    if (!user) return;
    const [latestHr, vitalsList, symptomList, recordList] = await Promise.all([
      getLatestHeartRate(db, user.id),
      getRecentVitals(db, user.id),
      getRecentSymptoms(db, user.id),
      getMedicalRecords(db, user.id),
    ]);
    setHeartRate(latestHr);
    setVitals(vitalsList);
    setSymptoms(symptomList);
    setRecords(recordList);
  }, [db, user]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  const handleLogVitals = async () => {
    if (!user) return;
    await logVitals(db, user.id, {
      systolic_bp: systolic ? Number(systolic) : undefined,
      diastolic_bp: diastolic ? Number(diastolic) : undefined,
      heart_rate_bpm: hr ? Number(hr) : undefined,
      blood_sugar_mgdl: sugar ? Number(sugar) : undefined,
    });
    setSystolic('');
    setDiastolic('');
    setHr('');
    setSugar('');
    await reload();
    await afterLocalWrite();
    Alert.alert('Saved', 'Vitals logged.');
  };

  const handleLogSymptom = async () => {
    if (!user || !symptomText.trim()) return;
    await logSymptom(db, user.id, symptomText.trim(), severity);
    setSymptomText('');
    await reload();
    await afterLocalWrite();
    Alert.alert('Saved', 'Symptom logged.');
  };

  const handleAddRecord = async () => {
    if (!user || !recordTitle.trim()) return;
    await addMedicalRecord(db, user.id, {
      title: recordTitle.trim(),
      record_type: recordType,
      doctor_name: doctorName.trim() || undefined,
    });
    setRecordTitle('');
    setDoctorName('');
    await reload();
    await afterLocalWrite();
    Alert.alert('Saved', 'Medical record added.');
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Modules</Text>
      </Pressable>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Health</Text>
        <Text style={screenStyles.subtitle}>
          Latest HR: {heartRate ? `${heartRate} bpm` : '—'}
        </Text>
      </View>

      <View style={styles.tabRow}>
        {(['vitals', 'symptoms', 'medical'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && styles.tabActive]}
          >
            <Text style={styles.tabText}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'vitals' ? (
        <>
          <Card>
            <Text style={styles.cardTitle}>Log vitals</Text>
            <Input value={systolic} onChangeText={setSystolic} placeholder="Systolic BP" keyboardType="number-pad" />
            <Input value={diastolic} onChangeText={setDiastolic} placeholder="Diastolic BP" keyboardType="number-pad" />
            <Input value={hr} onChangeText={setHr} placeholder="Heart rate (bpm)" keyboardType="number-pad" />
            <Input value={sugar} onChangeText={setSugar} placeholder="Blood sugar (mg/dL)" keyboardType="decimal-pad" />
            <Button label="Save vitals" onPress={() => void handleLogVitals()} />
          </Card>
          <Card>
            <Text style={styles.cardTitle}>Recent vitals</Text>
            {vitals.length === 0 ? (
              <Text style={styles.meta}>No entries yet.</Text>
            ) : (
              vitals.map((v) => (
                <Text key={v.id} style={styles.row}>
                  {v.logged_at.slice(0, 10)} · BP {v.systolic_bp ?? '—'}/{v.diastolic_bp ?? '—'} · HR {v.heart_rate_bpm ?? '—'}
                </Text>
              ))
            )}
          </Card>
        </>
      ) : null}

      {tab === 'symptoms' ? (
        <>
          <Card>
            <Text style={styles.cardTitle}>Log symptom</Text>
            <Input value={symptomText} onChangeText={setSymptomText} placeholder="Symptom" />
            <Text style={styles.label}>Severity (1–5)</Text>
            <View style={styles.severityRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setSeverity(s)}
                  style={[styles.severityBtn, severity === s && styles.severityActive]}
                >
                  <Text style={styles.severityText}>{s}</Text>
                </Pressable>
              ))}
            </View>
            <Button label="Save symptom" onPress={() => void handleLogSymptom()} />
          </Card>
          <Card>
            <Text style={styles.cardTitle}>Recent symptoms</Text>
            {symptoms.length === 0 ? (
              <Text style={styles.meta}>No entries yet.</Text>
            ) : (
              symptoms.map((s) => (
                <Text key={s.id} style={styles.row}>
                  {s.logged_date} · {s.symptom} (severity {s.severity})
                </Text>
              ))
            )}
          </Card>
        </>
      ) : null}

      {tab === 'medical' ? (
        <>
          <Card>
            <Text style={styles.cardTitle}>Add record</Text>
            <Input value={recordTitle} onChangeText={setRecordTitle} placeholder="Title" />
            <Input value={doctorName} onChangeText={setDoctorName} placeholder="Doctor (optional)" />
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {RECORD_TYPES.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setRecordType(t)}
                  style={[styles.typeBtn, recordType === t && styles.typeActive]}
                >
                  <Text style={styles.typeText}>{t}</Text>
                </Pressable>
              ))}
            </View>
            <Button label="Save record" onPress={() => void handleAddRecord()} />
          </Card>
          <Card>
            <Text style={styles.cardTitle}>Records</Text>
            {records.length === 0 ? (
              <Text style={styles.meta}>No records yet.</Text>
            ) : (
              records.map((r) => (
                <Text key={r.id} style={styles.row}>
                  {r.record_date} · {r.title} ({r.record_type})
                </Text>
              ))
            )}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  back: { marginBottom: spacing.md },
  backText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  tabRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.accent },
  tabText: { color: colors.text, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs },
  meta: { color: colors.textMuted, fontSize: 14 },
  row: { color: colors.text, fontSize: 14, marginBottom: spacing.xs },
  severityRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  severityBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityActive: { backgroundColor: colors.accent },
  severityText: { color: colors.text, fontWeight: '700' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  typeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  typeActive: { backgroundColor: colors.accent },
  typeText: { color: colors.text, fontSize: 12 },
});
