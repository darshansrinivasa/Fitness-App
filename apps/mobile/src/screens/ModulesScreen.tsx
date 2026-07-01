import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Card } from '../components/Card';
import { screenStyles } from '../components/ScreenLayout';
import type { ModulesStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme/tokens';

type Nav = NativeStackNavigationProp<ModulesStackParamList, 'ModulesList'>;

const MODULES = [
  { key: 'Water', title: 'Water', subtitle: 'Hydration & goals', emoji: '💧' },
  { key: 'Fitness', title: 'Fitness', subtitle: 'Workouts & sets', emoji: '🏋️' },
  { key: 'Nutrition', title: 'Nutrition', subtitle: 'Meals & macros', emoji: '🥗' },
  { key: 'Body', title: 'Body', subtitle: 'Weight & measurements', emoji: '📏' },
] as const;

export function ModulesScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Modules</Text>
        <Text style={screenStyles.subtitle}>Core lifestyle tracking</Text>
      </View>
      <View style={styles.grid}>
        {MODULES.map((mod) => (
          <Pressable
            key={mod.key}
            onPress={() => navigation.navigate(mod.key)}
            style={styles.tilePress}
          >
            <Card>
              <Text style={styles.emoji}>{mod.emoji}</Text>
              <Text style={styles.tileTitle}>{mod.title}</Text>
              <Text style={styles.tileSubtitle}>{mod.subtitle}</Text>
            </Card>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tilePress: { width: '47%' },
  emoji: { fontSize: 28, marginBottom: spacing.sm },
  tileTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  tileSubtitle: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
});
