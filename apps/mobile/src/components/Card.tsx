import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, elevation, radius, spacing } from '../theme/tokens';

export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...elevation.card,
  },
});
