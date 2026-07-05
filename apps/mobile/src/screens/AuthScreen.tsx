import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthContext';
import { getOAuthRedirectUri } from '../auth/googleSignIn';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { screenStyles, useScreenContentStyle } from '../components/ScreenLayout';
import { colors, spacing } from '../theme/tokens';

export function AuthScreen() {
  const { signInWithGoogle, signIn, signUp } = useAuth();
  const screenPadding = useScreenContentStyle();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submitEmail = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signIn') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

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
    <SafeAreaView style={styles.flex} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, screenPadding]}
          keyboardShouldPersistTaps="handled"
        >
        <View style={screenStyles.header}>
          <Text style={screenStyles.title}>Lifestyle OS</Text>
          <Text style={screenStyles.subtitle}>Sign in to sync your health data</Text>
        </View>

        <Card>
          <Button
            label="Continue with Google"
            loading={loading}
            onPress={submitGoogle}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label={showEmailForm ? 'Hide email sign-in' : 'Sign in with email instead'}
            variant="ghost"
            onPress={() => {
              setShowEmailForm(!showEmailForm);
              setError(null);
            }}
          />
        </Card>

        {showEmailForm ? (
          <Card>
            <Input
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
            />
            <Input
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
            <Button
              label={mode === 'signIn' ? 'Sign in' : 'Sign up'}
              loading={loading}
              onPress={submitEmail}
            />
            <Button
              label={
                mode === 'signIn'
                  ? 'Need an account? Sign up'
                  : 'Already have an account? Sign in'
              }
              variant="ghost"
              onPress={() => {
                setMode(mode === 'signIn' ? 'signUp' : 'signIn');
                setError(null);
              }}
            />
          </Card>
        ) : null}

        {__DEV__ ? (
          <Text style={styles.hint}>
            Dev redirect URI (add to Supabase):{'\n'}
            {getOAuthRedirectUri()}
          </Text>
        ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  error: {
    color: colors.danger,
    marginTop: spacing.md,
    fontSize: 14,
  },
  hint: {
    marginTop: spacing.lg,
    color: colors.textDim,
    fontSize: 11,
    lineHeight: 16,
  },
});
