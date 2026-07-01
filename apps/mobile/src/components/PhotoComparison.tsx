import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme/tokens';

interface PhotoComparisonProps {
  beforeUrl: string | null;
  afterUrl: string | null;
  beforeDate: string;
  afterDate: string;
}

export function PhotoComparison({
  beforeUrl,
  afterUrl,
  beforeDate,
  afterDate,
}: PhotoComparisonProps) {
  if (!beforeUrl && !afterUrl) {
    return <Text style={styles.empty}>Add progress photos in this period to compare.</Text>;
  }

  return (
    <View style={styles.row}>
      <View style={styles.slot}>
        <Text style={styles.label}>First · {beforeDate}</Text>
        {beforeUrl ? (
          <Image source={{ uri: beforeUrl }} style={styles.image} />
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
      <View style={styles.slot}>
        <Text style={styles.label}>Latest · {afterDate}</Text>
        {afterUrl ? (
          <Image source={{ uri: afterUrl }} style={styles.image} />
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, fontSize: 14 },
  row: { flexDirection: 'row', gap: spacing.md },
  slot: { flex: 1 },
  label: { color: colors.textMuted, fontSize: 11, marginBottom: spacing.xs, textAlign: 'center' },
  image: { width: '100%', aspectRatio: 3 / 4, borderRadius: 8, backgroundColor: colors.surface },
  placeholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
});
