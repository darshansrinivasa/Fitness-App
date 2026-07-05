import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { Input } from './Input';
import { colors, radius, spacing } from '../theme/tokens';

interface WaterLogEditorModalProps {
  visible: boolean;
  currentAmountMl: number;
  saving?: boolean;
  onClose: () => void;
  onSave: (amountMl: number) => Promise<void>;
}

export function WaterLogEditorModal({
  visible,
  currentAmountMl,
  saving = false,
  onClose,
  onSave,
}: WaterLogEditorModalProps) {
  const [value, setValue] = useState(String(currentAmountMl));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setValue(String(currentAmountMl));
      setError(null);
    }
  }, [visible, currentAmountMl]);

  const handleSave = async () => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 50 || parsed > 5000) {
      setError('Enter an amount between 50 and 5,000 ml.');
      return;
    }
    setError(null);
    await onSave(parsed);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Edit water entry</Text>
          <Text style={styles.subtitle}>Adjust the amount for this log.</Text>
          <Input
            value={value}
            onChangeText={setValue}
            keyboardType="number-pad"
            placeholder="250"
            style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button label="Cancel" variant="ghost" onPress={onClose} style={styles.action} />
            <Button
              label={saving ? 'Saving…' : 'Save'}
              loading={saving}
              onPress={() => void handleSave()}
              style={styles.action}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
