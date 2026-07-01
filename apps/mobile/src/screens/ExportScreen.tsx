import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import {
  EXPORT_MODULES,
  resolveDateRange,
  type DateRangePreset,
  type ExportFormat,
  type ExportModule,
} from '@lifestyle-os/shared';

import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { screenStyles } from '../components/ScreenLayout';
import { gatherLifestyleExport } from '../db/analytics';
import { shareExport } from '../lib/exportFile';
import type { InsightsStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme/tokens';

type Nav = NativeStackNavigationProp<InsightsStackParamList, 'Export'>;

const PRESETS: DateRangePreset[] = ['today', 'week', 'month', 'quarter', 'custom'];
const FORMATS: { key: ExportFormat; label: string }[] = [
  { key: 'json', label: 'JSON' },
  { key: 'markdown', label: 'Markdown' },
  { key: 'pdf', label: 'PDF' },
  { key: 'chatgpt', label: 'ChatGPT' },
];

const MODULE_LABELS: Record<ExportModule, string> = {
  water: 'Water',
  fitness: 'Fitness',
  nutrition: 'Nutrition',
  body: 'Body',
  sleep: 'Sleep',
  habits: 'Habits',
  supplements: 'Supplements',
  goals: 'Goals',
  health: 'Health',
  haircare: 'Haircare',
  skincare: 'Skincare',
  photos: 'Photos',
};

export function ExportScreen() {
  const db = useSQLiteContext();
  const { user, profile } = useAuth();
  const navigation = useNavigation<Nav>();
  const [preset, setPreset] = useState<DateRangePreset>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [format, setFormat] = useState<ExportFormat>('json');
  const [selectedModules, setSelectedModules] = useState<ExportModule[]>([...EXPORT_MODULES]);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [exporting, setExporting] = useState(false);

  const toggleModule = (mod: ExportModule) => {
    setSelectedModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod],
    );
  };

  const handleExport = async () => {
    if (!user) return;
    if (selectedModules.length === 0) {
      Alert.alert('Select modules', 'Choose at least one module to export.');
      return;
    }
    if (preset === 'custom' && (!customFrom || !customTo)) {
      Alert.alert('Date range', 'Enter custom from/to dates (YYYY-MM-DD).');
      return;
    }

    setExporting(true);
    try {
      const range = resolveDateRange(preset, customFrom || undefined, customTo || undefined);
      const data = await gatherLifestyleExport(
        db,
        user.id,
        range.from,
        range.to,
        {
          name: profile?.full_name ?? null,
          height_cm: profile?.height_cm ?? null,
          weight_unit: profile?.weight_unit ?? 'kg',
        },
        {
          modules: selectedModules,
          includePhotoMetadata: includePhotos,
        },
      );
      await shareExport(data, format);
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Could not export.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Analytics</Text>
      </Pressable>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Export</Text>
        <Text style={screenStyles.subtitle}>Share your data for backup or AI analysis</Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Date range</Text>
        <View style={styles.chipRow}>
          {PRESETS.map((p) => (
            <Pressable
              key={p}
              onPress={() => setPreset(p)}
              style={[styles.chip, preset === p && styles.chipActive]}
            >
              <Text style={styles.chipText}>{p}</Text>
            </Pressable>
          ))}
        </View>
        {preset === 'custom' ? (
          <>
            <Input value={customFrom} onChangeText={setCustomFrom} placeholder="From (YYYY-MM-DD)" />
            <Input value={customTo} onChangeText={setCustomTo} placeholder="To (YYYY-MM-DD)" />
          </>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Format</Text>
        <View style={styles.chipRow}>
          {FORMATS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFormat(f.key)}
              style={[styles.chip, format === f.key && styles.chipActive]}
            >
              <Text style={styles.chipText}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Modules</Text>
        <View style={styles.chipRow}>
          {EXPORT_MODULES.map((mod) => (
            <Pressable
              key={mod}
              onPress={() => toggleModule(mod)}
              style={[styles.chip, selectedModules.includes(mod) && styles.chipActive]}
            >
              <Text style={styles.chipText}>{MODULE_LABELS[mod]}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Include photo metadata</Text>
          <Switch
            value={includePhotos}
            onValueChange={setIncludePhotos}
            trackColor={{ true: colors.accent, false: colors.border }}
          />
        </View>
        <Text style={styles.hint}>Exports photo dates only — not image files.</Text>
      </Card>

      <Button
        label={exporting ? 'Exporting…' : 'Export & share'}
        loading={exporting}
        onPress={() => void handleExport()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  back: { marginBottom: spacing.md },
  backText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.accent },
  chipText: { color: colors.text, fontSize: 12, textTransform: 'capitalize' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  switchLabel: { color: colors.text, fontSize: 14 },
  hint: { color: colors.textDim, fontSize: 12, marginTop: spacing.xs },
});
