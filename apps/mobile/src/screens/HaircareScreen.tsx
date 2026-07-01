import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import type { HaircareLog } from '@lifestyle-os/shared/sync';

import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { screenStyles } from '../components/ScreenLayout';
import {
  addHaircareProduct,
  getHaircareLogs,
  getHaircareProducts,
  logHaircare,
} from '../db/haircare';
import type { ModulesStackParamList } from '../navigation/types';
import { useAppSync } from '../sync/AppSyncContext';
import { colors, spacing } from '../theme/tokens';

type Nav = NativeStackNavigationProp<ModulesStackParamList, 'Haircare'>;
type LogType = HaircareLog['log_type'];

const LOG_TYPES: LogType[] = ['wash', 'oil', 'treatment', 'trim', 'note'];

export function HaircareScreen() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const { refreshKey, afterLocalWrite } = useAppSync();
  const navigation = useNavigation<Nav>();
  const [logs, setLogs] = useState<HaircareLog[]>([]);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [newProduct, setNewProduct] = useState('');
  const [logType, setLogType] = useState<LogType>('wash');
  const [scalp, setScalp] = useState(3);
  const [hair, setHair] = useState(3);
  const [notes, setNotes] = useState('');

  const reload = useCallback(async () => {
    if (!user) return;
    const [logList, products] = await Promise.all([
      getHaircareLogs(db, user.id),
      getHaircareProducts(db, user.id),
    ]);
    setLogs(logList);
    setProductNames(products.map((p) => p.name));
  }, [db, user]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  const handleAddProduct = async () => {
    if (!user || !newProduct.trim()) return;
    await addHaircareProduct(db, user.id, newProduct.trim());
    setNewProduct('');
    await reload();
    await afterLocalWrite();
  };

  const handleLog = async () => {
    if (!user) return;
    await logHaircare(db, user.id, {
      log_type: logType,
      scalp_condition: scalp,
      hair_condition: hair,
      notes: notes.trim() || undefined,
    });
    setNotes('');
    await reload();
    await afterLocalWrite();
    Alert.alert('Saved', 'Haircare logged.');
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Modules</Text>
      </Pressable>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Haircare</Text>
        <Text style={screenStyles.subtitle}>{productNames.length} active product(s)</Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Add product</Text>
        <Input value={newProduct} onChangeText={setNewProduct} placeholder="Product name" />
        <Button label="Save product" onPress={() => void handleAddProduct()} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Log routine</Text>
        <View style={styles.typeRow}>
          {LOG_TYPES.map((t) => (
            <Pressable
              key={t}
              onPress={() => setLogType(t)}
              style={[styles.typeBtn, logType === t && styles.typeActive]}
            >
              <Text style={styles.typeText}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Scalp condition (1–5)</Text>
        <RatingRow value={scalp} onChange={setScalp} />
        <Text style={styles.label}>Hair condition (1–5)</Text>
        <RatingRow value={hair} onChange={setHair} />
        <Input value={notes} onChangeText={setNotes} placeholder="Notes (optional)" />
        <Button label="Save log" onPress={() => void handleLog()} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Recent logs</Text>
        {logs.length === 0 ? (
          <Text style={styles.meta}>No logs yet.</Text>
        ) : (
          logs.map((l) => (
            <Text key={l.id} style={styles.row}>
              {l.logged_date} · {l.log_type} · scalp {l.scalp_condition}/5 · hair {l.hair_condition}/5
            </Text>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

function RatingRow({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.ratingRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
          style={[styles.ratingBtn, value === n && styles.ratingActive]}
        >
          <Text style={styles.ratingText}>{n}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  back: { marginBottom: spacing.md },
  backText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs, marginTop: spacing.sm },
  meta: { color: colors.textMuted, fontSize: 14 },
  row: { color: colors.text, fontSize: 14, marginBottom: spacing.xs },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  typeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  typeActive: { backgroundColor: colors.accent },
  typeText: { color: colors.text, fontSize: 12, textTransform: 'capitalize' },
  ratingRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  ratingBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingActive: { backgroundColor: colors.accent },
  ratingText: { color: colors.text, fontWeight: '700' },
});
