import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppLock } from '../auth/AppLockContext';
import { colors, spacing } from '../theme/tokens';

export function LockScreen() {
  const { unlock, biometricLabel } = useAppLock();

  useEffect(() => {
    void unlock();
  }, [unlock]);

  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed-outline" size={48} color={colors.accent} />
      <Text style={styles.title}>App locked</Text>
      <Text style={styles.subtitle}>Use {biometricLabel.toLowerCase()} or device PIN to continue</Text>
      <Pressable style={styles.button} onPress={() => void unlock()}>
        <Text style={styles.buttonText}>Unlock</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    zIndex: 100,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: spacing.lg },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  buttonText: { color: colors.bg, fontSize: 16, fontWeight: '600' },
});
