import { ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme/tokens';

export const screenStyles = {
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
};

export function useScreenContentStyle() {
  return {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
  };
}

export function ScreenScroll({
  contentContainerStyle,
  style,
  children,
  ...rest
}: ScrollViewProps) {
  const contentStyle = useScreenContentStyle();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={[styles.scroll, style]}
        contentContainerStyle={[contentStyle, contentContainerStyle]}
        {...rest}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
