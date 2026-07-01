import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { HabitHeatmapRow } from '@lifestyle-os/shared';

import { colors, spacing } from '../theme/tokens';

interface HabitHeatmapProps {
  rows: HabitHeatmapRow[];
}

export function HabitHeatmap({ rows }: HabitHeatmapProps) {
  if (rows.length === 0) {
    return <Text style={styles.empty}>Add habits to see your heatmap.</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.container}>
        {rows.map((row) => (
          <View key={row.habit_id} style={styles.habitRow}>
            <Text style={styles.habitName} numberOfLines={1}>
              {row.name}
            </Text>
            <View style={styles.cells}>
              {row.cells.map((cell) => (
                <View
                  key={cell.date}
                  style={[styles.cell, cell.completed ? styles.cellDone : styles.cellMiss]}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, fontSize: 14 },
  container: { gap: spacing.sm },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  habitName: { width: 72, color: colors.textMuted, fontSize: 11 },
  cells: { flexDirection: 'row', gap: 2 },
  cell: { width: 10, height: 10, borderRadius: 2 },
  cellDone: { backgroundColor: colors.success },
  cellMiss: { backgroundColor: colors.border },
});
