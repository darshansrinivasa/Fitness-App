import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { colors, radius, spacing } from '../theme/tokens';

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textDim}
      autoCapitalize="none"
      style={[styles.input, props.style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
});
