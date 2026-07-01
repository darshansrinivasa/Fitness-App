import { StyleSheet, Text, View } from 'react-native';

import type { DailyWaterTotal } from '../db/waterLogs';
import { colors, spacing } from '../theme/tokens';

interface WaterChartProps {
  data: DailyWaterTotal[];
  goalMl: number;
}

function formatDayLabel(day: string): string {
  const [, month, date] = day.split('-');
  return `${Number(date)}/${Number(month)}`;
}

export function WaterChart({ data, goalMl }: WaterChartProps) {
  const maxValue = Math.max(goalMl, ...data.map((d) => d.total_ml), 1);
  const labelEvery = data.length > 14 ? 5 : 3;

  return (
    <View style={styles.container}>
      <View style={styles.bars}>
        {data.map((point, index) => {
          const heightPct = (point.total_ml / maxValue) * 100;
          const metGoal = point.total_ml >= goalMl;
          return (
            <View key={point.day} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.max(heightPct, point.total_ml > 0 ? 4 : 0)}%`,
                      backgroundColor: metGoal ? colors.success : colors.accent,
                    },
                  ]}
                />
              </View>
              {index % labelEvery === 0 || index === data.length - 1 ? (
                <Text style={styles.label}>{formatDayLabel(point.day)}</Text>
              ) : (
                <Text style={styles.labelSpacer}> </Text>
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
          <Text style={styles.legendText}>Under goal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={styles.legendText}>Goal met</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 120,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 3,
    minHeight: 0,
  },
  label: {
    marginTop: spacing.xs,
    fontSize: 9,
    color: colors.textDim,
  },
  labelSpacer: {
    marginTop: spacing.xs,
    fontSize: 9,
    color: 'transparent',
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
