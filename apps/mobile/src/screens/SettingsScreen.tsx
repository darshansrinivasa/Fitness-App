import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { screenStyles } from '../components/ScreenLayout';
import { updateProfile } from '../lib/supabase';
import { colors, spacing } from '../theme/tokens';

export function SettingsScreen() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [heightCm, setHeightCm] = useState(
    profile?.height_cm ? String(profile.height_cm) : '',
  );
  const [weightUnit, setWeightUnit] = useState(profile?.weight_unit ?? 'kg');
  const [waterUnit, setWaterUnit] = useState(profile?.water_unit ?? 'ml');
  const [notifications, setNotifications] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const height = heightCm ? Number.parseFloat(heightCm) : null;
      await updateProfile(user.id, {
        full_name: fullName.trim() || null,
        height_cm: height,
        weight_unit: weightUnit,
        water_unit: waterUnit,
      });
      await refreshProfile();
      Alert.alert('Saved', 'Profile updated.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const toggleWeightUnit = () => {
    setWeightUnit((u) => (u === 'kg' ? 'lbs' : 'kg'));
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Settings</Text>
        <Text style={screenStyles.subtitle}>{user?.email}</Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Profile</Text>
        <Input value={fullName} onChangeText={setFullName} placeholder="Full name" />
        <Input
          value={heightCm}
          onChangeText={setHeightCm}
          keyboardType="decimal-pad"
          placeholder="Height (cm) — for BMI"
        />
        <Button
          label={`Weight unit: ${weightUnit}`}
          variant="secondary"
          onPress={toggleWeightUnit}
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Notifications</Text>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ true: colors.accent, false: colors.border }}
          />
        </View>
        <Text style={styles.hint}>Reminders ship in a later slice.</Text>
        <Button
          label={saving ? 'Saving…' : 'Save profile'}
          loading={saving}
          onPress={() => void handleSave()}
          style={styles.saveBtn}
        />
      </Card>

      <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  switchLabel: { color: colors.text, fontSize: 16 },
  hint: { color: colors.textDim, fontSize: 12, marginBottom: spacing.md },
  saveBtn: { marginTop: spacing.sm },
});
