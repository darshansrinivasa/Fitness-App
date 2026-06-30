import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import * as Linking from 'expo-linking';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { handleAuthCallbackUrl } from './src/auth/googleSignIn';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { migrateLocalSchema } from './src/db/waterLogs';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SyncProvider } from './src/sync/SyncContext';
import { colors, spacing } from './src/theme/tokens';

function RootNavigator() {
  const { session, loading, authError, retryInit } = useAuth();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading account…</Text>
      </View>
    );
  }

  if (authError && !session) {
    return (
      <View style={styles.flex}>
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{authError}</Text>
          <Pressable onPress={retryInit}>
            <Text style={styles.errorBannerAction}>Retry</Text>
          </Pressable>
        </View>
        <AuthScreen />
      </View>
    );
  }

  if (authError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Could not load account</Text>
        <Text style={styles.errorText}>{authError}</Text>
        <Pressable style={styles.retryButton} onPress={retryInit}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <SyncProvider>
      <HomeScreen />
    </SyncProvider>
  );
}

function LoadingScreen({ message = 'Opening local database…' }: { message?: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

function AppTree() {
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="light" />
    </AuthProvider>
  );
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  if (dbError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Database error</Text>
        <Text style={styles.errorText}>{dbError}</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      {!dbReady ? <LoadingScreen /> : null}
      <SQLiteProvider
        databaseName="lifestyle.db"
        onInit={async (db) => {
          await migrateLocalSchema(db);
          setDbReady(true);
        }}
        onError={(error) => {
          console.error('SQLite init error:', error);
          setDbError(error.message);
        }}
      >
        {dbReady ? <AppTree /> : null}
      </SQLiteProvider>
    </ErrorBoundary>
  );
}

// OAuth deep link handler — must run once at app root
void Linking.getInitialURL().then((url) => {
  if (url) void handleAuthCallbackUrl(url).catch(console.error);
});
Linking.addEventListener('url', ({ url }) => {
  void handleAuthCallbackUrl(url).catch(console.error);
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  errorBannerText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
  },
  errorBannerAction: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 14,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  errorText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  retryText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: '600',
  },
});
