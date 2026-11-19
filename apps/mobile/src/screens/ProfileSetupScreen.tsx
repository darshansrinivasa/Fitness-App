import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthContext';
import { Input } from '../components/Input';
import { logWeight } from '../db/body';
import { setNutritionGoal } from '../db/nutrition';
import { setDailyWaterGoal } from '../db/waterGoals';
import { updateProfile } from '../lib/supabase';
import { colors, radius, spacing } from '../theme/tokens';

const GENDERS = ['Male', 'Female', 'Other'] as const;

export function ProfileSetupScreen() {
  const db = useSQLiteContext();
  const { user, signOut, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<(typeof GENDERS)[number]>('Male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [waterMl, setWaterMl] = useState('2500');
  const [calories, setCalories] = useState('2200');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [waterUnit, setWaterUnit] = useState<'ml' | 'oz'>('ml');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const initial = (fullName.trim().charAt(0) || 'A').toUpperCase();

  const submit = async () => {
    if (!user) return;
    const name = fullName.trim();
    if (!name) {
      setError('Enter your name to continue.');
      return;
    }
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      setError('Use YYYY-MM-DD for date of birth.');
      return;
    }

    const heightCm = height ? Number.parseFloat(height) : null;
    const weightValue = weight ? Number.parseFloat(weight) : null;
    const waterTarget = Number.parseInt(waterMl, 10);
    const calorieTarget = Number.parseInt(calories, 10);
    if (height && (!heightCm || heightCm <= 0)) {
      setError('Height must be a positive number.');
      return;
    }
    if (weight && (!weightValue || weightValue <= 0)) {
      setError('Weight must be a positive number.');
      return;
    }
    if (!waterTarget || waterTarget <= 0 || !calorieTarget || calorieTarget <= 0) {
      setError('Daily water and calories need positive targets.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const weightKg =
        weightValue == null
          ? null
          : weightUnit === 'lbs'
            ? Math.round((weightValue / 2.20462) * 10) / 10
            : weightValue;

      await updateProfile(user.id, {
        full_name: name,
        date_of_birth: dob || null,
        gender: gender.toLowerCase(),
        height_cm: heightCm,
        weight_unit: weightUnit,
        water_unit: waterUnit,
      });
      const waterTargetMl =
        waterUnit === 'oz' ? Math.round(waterTarget * 29.5735) : waterTarget;
      await setDailyWaterGoal(db, user.id, waterTargetMl);
      await setNutritionGoal(db, user.id, { calories: calorieTarget });
      if (weightKg != null) {
        await logWeight(db, user.id, weightKg);
      }
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={() => void signOut()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.textDim} />
          </Pressable>
          <Text style={styles.headerTitle}>Set up your profile</Text>
          <Text style={styles.step}>Step 1 of 1</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>This helps us personalise your experience</Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>

          <Text style={styles.label}>Full name</Text>
          <Input
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your name"
            autoCapitalize="words"
            style={styles.field}
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>Date of birth</Text>
              <Input
                value={dob}
                onChangeText={setDob}
                placeholder="YYYY-MM-DD"
                style={styles.field}
              />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.segment}>
                {GENDERS.map((option) => {
                  const active = gender === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setGender(option)}
                      style={[styles.segmentItem, active && styles.segmentActive]}
                    >
                      <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>Height (cm)</Text>
              <Input
                value={height}
                onChangeText={setHeight}
                placeholder="0"
                keyboardType="decimal-pad"
                style={styles.field}
              />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Weight ({weightUnit})</Text>
              <Input
                value={weight}
                onChangeText={setWeight}
                placeholder="0"
                keyboardType="decimal-pad"
                style={styles.field}
              />
            </View>
          </View>

          <View style={styles.targets}>
            <Text style={styles.targetsTitle}>Daily targets</Text>
            <View style={styles.targetRow}>
              <View style={styles.targetLabel}>
                <Ionicons name="water-outline" size={20} color={colors.accent} />
                <Text style={styles.targetText}>Daily water</Text>
              </View>
              <View style={styles.targetField}>
                <Input
                  value={waterMl}
                  onChangeText={setWaterMl}
                  keyboardType="number-pad"
                  style={styles.compactField}
                />
                <Text style={styles.compactUnit}>{waterUnit}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.targetRow}>
              <View style={styles.targetLabel}>
                <Ionicons name="flame-outline" size={20} color="#695d3c" />
                <Text style={styles.targetText}>Daily calories</Text>
              </View>
              <View style={styles.targetField}>
                <Input
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="number-pad"
                  style={styles.compactField}
                />
                <Text style={styles.compactUnit}>kcal</Text>
              </View>
            </View>
          </View>

          <Text style={styles.prefsTitle}>Preferences</Text>
          <UnitRow
            label="Weight unit"
            left="kg"
            right="lbs"
            value={weightUnit}
            onChange={setWeightUnit}
          />
          <UnitRow
            label="Liquid unit"
            left="ml"
            right="oz"
            value={waterUnit}
            onChange={setWaterUnit}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => void submit()}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed, saving && styles.disabled]}
          >
            <Text style={styles.ctaLabel}>{saving ? 'Saving…' : 'Get Started'}</Text>
            <Ionicons name="arrow-forward" size={20} color="#ffffff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function UnitRow<T extends string>({
  label,
  left,
  right,
  value,
  onChange,
}: {
  label: string;
  left: T;
  right: T;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.unitRow}>
      <Text style={styles.targetText}>{label}</Text>
      <View style={styles.pill}>
        {[left, right].map((option) => {
          const active = value === option;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={[styles.pillItem, active && styles.segmentActive]}
            >
              <Text style={[styles.pillLabel, active && styles.segmentLabelActive]}>
                {option.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: {
    height: 64,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.primaryContainer },
  step: { fontSize: 14, color: colors.textDim },
  content: { padding: spacing.lg, paddingBottom: 120 },
  intro: { fontSize: 16, lineHeight: 24, color: colors.textDim, marginBottom: spacing.xl },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignSelf: 'center',
    marginBottom: spacing.xl,
    backgroundColor: colors.accentContainer,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 36, fontWeight: '700', color: '#3d2e89' },
  label: { fontSize: 14, fontWeight: '500', color: colors.textDim, marginBottom: spacing.sm },
  field: { marginBottom: spacing.lg, backgroundColor: colors.surface },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    padding: 4,
    height: 48,
    marginBottom: spacing.lg,
  },
  segmentItem: { flex: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.surface },
  segmentLabel: { fontSize: 11, fontWeight: '600', color: colors.textDim },
  segmentLabelActive: { color: '#3d2e89' },
  targets: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  targetsTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.primaryContainer,
    marginBottom: spacing.md,
  },
  targetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  targetLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  targetText: { fontSize: 14, color: colors.text },
  targetField: { width: 128, position: 'relative' },
  compactField: { marginBottom: 0, textAlign: 'right', paddingRight: 36 },
  compactUnit: {
    position: 'absolute',
    right: spacing.md,
    top: 16,
    fontSize: 12,
    color: colors.textDim,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  prefsTitle: { fontSize: 14, fontWeight: '500', color: colors.textDim, marginBottom: spacing.md },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  pill: {
    flexDirection: 'row',
    width: 112,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainer,
    padding: 4,
  },
  pillItem: { flex: 1, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  pillLabel: { fontSize: 11, fontWeight: '700', color: colors.textDim },
  error: { color: colors.danger, fontSize: 14, marginTop: spacing.sm },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    padding: spacing.lg,
  },
  cta: {
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  ctaLabel: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.6 },
});
