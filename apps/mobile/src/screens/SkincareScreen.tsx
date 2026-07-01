import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import type { BreakoutLog, SkincareLog } from '@lifestyle-os/shared/sync';

import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { screenStyles } from '../components/ScreenLayout';
import {
  addSkincareProduct,
  getBreakoutLogs,
  getSkincareLogs,
  getSkincareProducts,
  logBreakout,
  logSkincareRoutine,
} from '../db/skincare';
import type { ModulesStackParamList } from '../navigation/types';
import { useAppSync } from '../sync/AppSyncContext';
import { colors, spacing } from '../theme/tokens';

type Nav = NativeStackNavigationProp<ModulesStackParamList, 'Skincare'>;
type Tab = 'routine' | 'breakouts' | 'products';

export function SkincareScreen() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const { refreshKey, afterLocalWrite } = useAppSync();
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('routine');
  const [routines, setRoutines] = useState<SkincareLog[]>([]);
  const [breakouts, setBreakouts] = useState<BreakoutLog[]>([]);
  const [products, setProducts] = useState<string[]>([]);

  const [routineType, setRoutineType] = useState<SkincareLog['routine_type']>('morning');
  const [hydration, setHydration] = useState(3);
  const [clarity, setClarity] = useState(3);
  const [location, setLocation] = useState('');
  const [severity, setSeverity] = useState(3);
  const [newProduct, setNewProduct] = useState('');

  const reload = useCallback(async () => {
    if (!user) return;
    const [routineList, breakoutList, productList] = await Promise.all([
      getSkincareLogs(db, user.id),
      getBreakoutLogs(db, user.id),
      getSkincareProducts(db, user.id),
    ]);
    setRoutines(routineList);
    setBreakouts(breakoutList);
    setProducts(productList.map((p) => p.name));
  }, [db, user]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  const handleLogRoutine = async () => {
    if (!user) return;
    await logSkincareRoutine(db, user.id, {
      routine_type: routineType,
      skin_hydration: hydration,
      skin_clarity: clarity,
    });
    await reload();
    await afterLocalWrite();
    Alert.alert('Saved', 'Routine logged.');
  };

  const handleLogBreakout = async () => {
    if (!user || !location.trim()) return;
    await logBreakout(db, user.id, location.trim(), severity);
    setLocation('');
    await reload();
    await afterLocalWrite();
    Alert.alert('Saved', 'Breakout logged.');
  };

  const handleAddProduct = async () => {
    if (!user || !newProduct.trim()) return;
    await addSkincareProduct(db, user.id, newProduct.trim());
    setNewProduct('');
    await reload();
    await afterLocalWrite();
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Modules</Text>
      </Pressable>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Skincare</Text>
        <Text style={screenStyles.subtitle}>{products.length} product(s)</Text>
      </View>

      <View style={styles.tabRow}>
        {(['routine', 'breakouts', 'products'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && styles.tabActive]}
          >
            <Text style={styles.tabText}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'routine' ? (
        <>
          <Card>
            <Text style={styles.cardTitle}>Log routine</Text>
            <View style={styles.typeRow}>
              {(['morning', 'night'] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setRoutineType(t)}
                  style={[styles.typeBtn, routineType === t && styles.typeActive]}
                >
                  <Text style={styles.typeText}>{t}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Hydration (1–5)</Text>
            <RatingRow value={hydration} onChange={setHydration} />
            <Text style={styles.label}>Clarity (1–5)</Text>
            <RatingRow value={clarity} onChange={setClarity} />
            <Button label="Save routine" onPress={() => void handleLogRoutine()} />
          </Card>
          <Card>
            <Text style={styles.cardTitle}>Recent routines</Text>
            {routines.length === 0 ? (
              <Text style={styles.meta}>No routines yet.</Text>
            ) : (
              routines.map((r) => (
                <Text key={r.id} style={styles.row}>
                  {r.logged_date} · {r.routine_type} · hydration {r.skin_hydration}/5
                </Text>
              ))
            )}
          </Card>
        </>
      ) : null}

      {tab === 'breakouts' ? (
        <>
          <Card>
            <Text style={styles.cardTitle}>Log breakout</Text>
            <Input value={location} onChangeText={setLocation} placeholder="Location (e.g. chin)" />
            <Text style={styles.label}>Severity (1–5)</Text>
            <RatingRow value={severity} onChange={setSeverity} />
            <Button label="Save breakout" onPress={() => void handleLogBreakout()} />
          </Card>
          <Card>
            <Text style={styles.cardTitle}>Recent breakouts</Text>
            {breakouts.length === 0 ? (
              <Text style={styles.meta}>No breakouts logged.</Text>
            ) : (
              breakouts.map((b) => (
                <Text key={b.id} style={styles.row}>
                  {b.logged_date} · {b.location} (severity {b.severity})
                </Text>
              ))
            )}
          </Card>
        </>
      ) : null}

      {tab === 'products' ? (
        <>
          <Card>
            <Text style={styles.cardTitle}>Add product</Text>
            <Input value={newProduct} onChangeText={setNewProduct} placeholder="Product name" />
            <Button label="Save product" onPress={() => void handleAddProduct()} />
          </Card>
          <Card>
            <Text style={styles.cardTitle}>Your products</Text>
            {products.length === 0 ? (
              <Text style={styles.meta}>No products yet.</Text>
            ) : (
              products.map((name) => (
                <Text key={name} style={styles.row}>
                  {name}
                </Text>
              ))
            )}
          </Card>
        </>
      ) : null}
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
  label: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs, marginTop: spacing.sm },
  meta: { color: colors.textMuted, fontSize: 14 },
  row: { color: colors.text, fontSize: 14, marginBottom: spacing.xs },
  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  typeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  typeActive: { backgroundColor: colors.accent },
  typeText: { color: colors.text, fontSize: 13, textTransform: 'capitalize' },
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
