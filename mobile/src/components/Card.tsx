import React, { ReactNode, useContext } from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { radius } from '../theme/colors';
import { ThemeContext } from '../store/theme';

type Props = ViewProps & {
  children: ReactNode;
  padded?: boolean;
  elevated?: boolean;
};

export default function Card({ children, padded = true, elevated = false, style, ...props }: Props) {
  const { colors } = useContext(ThemeContext);

  return (
    <View
      {...props}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        padded && styles.padded,
        elevated && [styles.elevated, { shadowColor: colors.cardShadow }],
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  padded: {
    padding: 18,
  },
  elevated: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
});
