import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from './Button';
import { Input } from './Input';
import { colors, radius, spacing } from '../theme/tokens';

interface GoalEditorModalProps {
  visible: boolean;
  currentGoalMl: number;
  saving?: boolean;
  onClose: () => void;
  onSave: (goalMl: number) => Promise<void>;
}

export function GoalEditorModal({
  visible,
  currentGoalMl,
  saving = false,
  onClose,
  onSave,
}: GoalEditorModalProps) {
  const [value, setValue] = useState(String(currentGoalMl));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setValue(String(currentGoalMl));
      setError(null);
    }
  }, [visible, currentGoalMl]);

  const handleSave = async () => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 500 || parsed > 10000) {
      setError('Enter a goal between 500 and 10,000 ml.');
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
          <Text style={styles.title}>Daily water goal</Text>
          <Text style={styles.subtitle}>How much water do you want to drink each day?</Text>
          <Input
            value={value}
            onChangeText={setValue}
            keyboardType="number-pad"
            placeholder="3000"
            style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button label="Cancel" variant="ghost" onPress={onClose} style={styles.action} />
            <Button
              label={saving ? 'Saving…' : 'Save goal'}
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
