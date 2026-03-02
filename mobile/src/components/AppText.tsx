import React, { useContext } from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { ThemeContext } from '../store/theme';
import { typography } from '../theme/colors';

type Props = TextProps & {
  muted?: boolean;
  title?: boolean;
  subtitle?: boolean;
  mono?: boolean;
};

export default function AppText({ style, muted, title, subtitle, mono, ...props }: Props) {
  const { colors } = useContext(ThemeContext);

  return (
    <Text
      {...props}
      style={[
        styles.base,
        { color: colors.text },
        muted && { color: colors.muted },
        title && styles.title,
        subtitle && styles.subtitle,
        mono && styles.mono,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  title: {
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight,
    fontWeight: typography.title.fontWeight,
    letterSpacing: typography.title.letterSpacing,
  },
  subtitle: {
    fontSize: typography.subtitle.fontSize,
    lineHeight: typography.subtitle.lineHeight,
    fontWeight: typography.subtitle.fontWeight,
  },
  mono: {
    fontVariant: ['tabular-nums'],
  },
});
