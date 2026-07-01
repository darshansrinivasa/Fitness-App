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
  addSupplement,
  getSupplementsWithStatus,
  logSupplementTaken,
  type SupplementWithStatus,
} from '../db/supplements';
import type { ModulesStackParamList } from '../navigation/types';
import { useAppSync } from '../sync/AppSyncContext';
import { colors, spacing } from '../theme/tokens';

type Nav = NativeStackNavigationProp<ModulesStackParamList, 'Supplements'>;

export function SupplementsScreen() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const { refreshKey, afterLocalWrite } = useAppSync();
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<SupplementWithStatus[]>([]);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('500');
  const [unit, setUnit] = useState('mg');

  const reload = useCallback(async () => {
    if (!user) return;
    setItems(await getSupplementsWithStatus(db, user.id));
  }, [db, user]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  const handleAdd = async () => {
    if (!user || !name.trim()) return;
    await addSupplement(db, user.id, {
      name: name.trim(),
      dose_amount: Number.parseFloat(dose) || 1,
      dose_unit: unit.trim() || 'mg',
    });
    setName('');
    await reload();
    await afterLocalWrite();
  };

  const handleTake = async (supplement: SupplementWithStatus) => {
    if (!user || supplement.taken_today) return;
    await logSupplementTaken(db, user.id, supplement);
    await reload();
    await afterLocalWrite();
  };

  const done = items.filter((i) => i.taken_today).length;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Modules</Text>
      </Pressable>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Supplements</Text>
        <Text style={screenStyles.subtitle}>
          Today: {done}/{items.length} taken
        </Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Today&apos;s checklist</Text>
        {items.length === 0 ? (
          <Text style={styles.meta}>Add a supplement below.</Text>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.dose_amount} {item.dose_unit}
                </Text>
              </View>
              <Button
                label={item.taken_today ? 'Taken' : 'Take'}
                variant={item.taken_today ? 'ghost' : 'secondary'}
                onPress={() => void handleTake(item)}
                style={styles.takeBtn}
              />
            </View>
          ))
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Add supplement</Text>
        <Input value={name} onChangeText={setName} placeholder="Name" />
        <View style={styles.doseRow}>
          <Input value={dose} onChangeText={setDose} keyboardType="decimal-pad" placeholder="Dose" style={styles.doseField} />
          <Input value={unit} onChangeText={setUnit} placeholder="Unit" style={styles.doseField} />
        </View>
        <Button label="Save supplement" onPress={() => void handleAdd()} />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rowInfo: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '500' },
  takeBtn: { paddingHorizontal: spacing.md },
  doseRow: { flexDirection: 'row', gap: spacing.sm },
  doseField: { flex: 1 },
});
