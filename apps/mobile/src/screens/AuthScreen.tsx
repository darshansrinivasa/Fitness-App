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
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthContext';
import { colors, radius, spacing } from '../theme/tokens';

const FEATURES = [
  {
    icon: 'barbell-outline' as const,
    tint: '#e2e0fc',
    iconColor: '#1a1a2e',
    title: 'Fitness, nutrition, sleep & more',
    subtitle: 'Comprehensive daily health metrics.',
  },
  {
    icon: 'stats-chart-outline' as const,
    tint: '#e5deff',
    iconColor: '#190064',
    title: 'Analytics and progress tracking',
    subtitle: 'Visualize your evolution over time.',
  },
  {
    icon: 'sparkles-outline' as const,
    tint: '#f2e1b7',
    iconColor: '#231b02',
    title: 'Export reports for AI coaching',
    subtitle: 'Structured data ready for optimization.',
  },
];

export function AuthScreen() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submitGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="infinite" size={40} color="#ffffff" />
            </View>
            <Text style={styles.brandTitle}>Lifestyle OS</Text>
            <Text style={styles.brandSubtitle}>
              The holistic operating system for your high-performance life.
            </Text>
          </View>

          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Track everything that matters</Text>
            {FEATURES.map((feature) => (
              <View key={feature.title} style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: feature.tint }]}>
                  <Ionicons name={feature.icon} size={20} color={feature.iconColor} />
                </View>
                <View style={styles.featureCopy}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                </View>
              </View>
            ))}

            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={() => void submitGoogle()}
              style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
            >
              <Text style={styles.googleMark}>G</Text>
              <Text style={styles.googleLabel}>
                {loading ? 'Continuing…' : 'Continue with Google'}
              </Text>
            </Pressable>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.legal}>
              One Google account is one Lifestyle OS account on every device. A new Google
              account is created here, then you set up your profile.
            </Text>
            <Text style={styles.legal}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </Text>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1 },
  brand: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  brandTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.primaryContainer,
    marginBottom: spacing.sm,
  },
  brandSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textDim,
    textAlign: 'center',
    maxWidth: 240,
  },
  sheet: {
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.lg,
    paddingTop: 40,
    paddingBottom: spacing.xl,
  },
  sheetTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCopy: { flex: 1 },
  featureTitle: { fontSize: 16, lineHeight: 24, color: colors.text },
  featureSubtitle: { fontSize: 12, lineHeight: 16, color: colors.textDim, marginTop: 2 },
  googleButton: {
    marginTop: spacing.xl,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  pressed: { opacity: 0.85 },
  googleMark: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  googleLabel: { fontSize: 14, fontWeight: '600', color: colors.textDim },
  error: { color: colors.danger, marginTop: spacing.md, fontSize: 14, textAlign: 'center' },
  legal: {
    marginTop: spacing.lg,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textDim,
    textAlign: 'center',
  },
});
