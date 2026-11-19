import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppLock } from '../auth/AppLockContext';
import { useAuth } from '../auth/AuthContext';
import { colors, radius, spacing } from '../theme/tokens';

export function LockScreen() {
  const { unlock, biometricLabel } = useAppLock();
  const { profile, user, signOut } = useAuth();

  const name =
    profile?.full_name?.trim() ||
    (user?.user_metadata?.full_name as string | undefined) ||
    'there';
  const initial = name.charAt(0).toUpperCase();

  useEffect(() => {
    void unlock();
  }, [unlock]);

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Ionicons name="infinite" size={40} color="#3d2e89" />
        </View>
        <Text style={styles.brandTitle}>Lifestyle OS</Text>
        <Text style={styles.brandSubtitle}>Your personal health companion</Text>
      </View>

      <View style={styles.middle}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.welcome}>Welcome back, {name}</Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => void unlock()}
          style={({ pressed }) => [styles.unlockButton, pressed && styles.pressed]}
        >
          <Ionicons name="finger-print" size={36} color="#ffffff" />
        </Pressable>
        <Text style={styles.unlockLabel}>
          Touch to unlock with {biometricLabel.toLowerCase()}
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={() => void signOut()}
          style={({ pressed }) => [styles.altButton, pressed && styles.pressed]}
        >
          <Text style={styles.altLabel}>Sign in with a different account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg,
    zIndex: 100,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  brand: { alignItems: 'center', paddingTop: 72 },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.accentContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#7c6fcd',
    marginBottom: spacing.sm,
  },
  brandSubtitle: { fontSize: 14, color: colors.textDim },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accentContainer,
    borderWidth: 4,
    borderColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  avatarText: { fontSize: 36, fontWeight: '700', color: '#3d2e89' },
  welcome: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  unlockButton: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#7c6fcd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  unlockLabel: {
    marginTop: spacing.lg,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  footer: { paddingBottom: spacing.lg },
  altButton: {
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  altLabel: { fontSize: 14, color: colors.textDim },
});
