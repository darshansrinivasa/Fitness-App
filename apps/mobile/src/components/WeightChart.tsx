import { StyleSheet, Text, View } from 'react-native';

import type { WeightTrendPoint } from '../db/body';
import { colors, spacing } from '../theme/tokens';

interface WeightChartProps {
  data: WeightTrendPoint[];
}

export function WeightChart({ data }: WeightChartProps) {
  if (data.length === 0) {
    return <Text style={styles.empty}>Log weight to see your trend.</Text>;
  }

  const weights = data.map((d) => d.weight_kg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = Math.max(max - min, 1);

  return (
    <View style={styles.container}>
      <View style={styles.bars}>
        {data.map((point) => {
          const heightPct = ((point.weight_kg - min) / range) * 80 + 20;
          return (
            <View key={point.day} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: `${heightPct}%` }]} />
              </View>
              <Text style={styles.label}>{point.day.slice(8)}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.range}>
        {min.toFixed(1)} – {max.toFixed(1)} kg
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  empty: { color: colors.textMuted, fontSize: 14 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 100 },
  barColumn: { flex: 1, alignItems: 'center', height: '100%' },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  barFill: { width: '100%', backgroundColor: colors.accent, borderRadius: 3 },
  label: { marginTop: spacing.xs, fontSize: 9, color: colors.textDim },
  range: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
});
