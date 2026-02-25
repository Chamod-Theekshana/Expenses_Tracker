import React, { useContext } from 'react';
import { View, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { radius } from '../theme/colors';
import { ThemeContext } from '../store/theme';

type Props = TextInputProps & {
  left?: React.ReactNode;
  right?: React.ReactNode;
};

export default function AppInput({ left, right, style, ...props }: Props) {
  const { colors } = useContext(ThemeContext);
  
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {left ? <View style={styles.side}>{left}</View> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        style={[styles.input, { color: colors.text }, style]}
      />
      {right ? <View style={styles.side}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    gap: 10,
  },
  side: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
});
