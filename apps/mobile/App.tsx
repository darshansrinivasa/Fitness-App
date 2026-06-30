import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { PILOT_SYNC_TABLES } from '@lifestyle-os/shared/sync';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lifestyle OS</Text>
      <Text style={styles.subtitle}>Slice 0 — Foundation</Text>
      <Text style={styles.meta}>
        Pilot sync tables: {PILOT_SYNC_TABLES.join(', ')}
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 16,
  },
  meta: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});
