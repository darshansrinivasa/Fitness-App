import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '../theme/tokens';

interface WaterProgressRingProps {
  currentMl: number;
  goalMl: number;
  size?: number;
}

export function WaterProgressRing({
  currentMl,
  goalMl,
  size = 148,
}: WaterProgressRingProps) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goalMl > 0 ? Math.min(currentMl / goalMl, 1) : 0;
  const dashOffset = circumference * (1 - progress);
  const percent = Math.round(progress * 100);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progress >= 1 ? colors.success : colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.percent}>{percent}%</Text>
        <Text style={styles.sub}>{currentMl} ml</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  percent: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  sub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
});
