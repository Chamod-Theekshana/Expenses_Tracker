import React, { useContext } from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { ThemeContext } from '../store/theme';

type Props = TextProps & {
  muted?: boolean;
  title?: boolean;
  mono?: boolean;
};

export default function AppText({ style, muted, title, mono, ...props }: Props) {
  const { colors } = useContext(ThemeContext);
  
  return (
    <Text
      {...props}
      style={[
        styles.base,
        { color: colors.text },
        muted && { color: colors.muted },
        title && styles.title,
        mono && styles.mono,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontSize: 15,
    lineHeight: 20,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  mono: {
    fontVariant: ['tabular-nums'],
  },
});
