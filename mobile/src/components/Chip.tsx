import React, { useContext } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { ThemeContext } from '../store/theme';
import { radius } from '../theme/colors';
import AppText from './AppText';
import Icon, { type IconName } from './Icon';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  iconLeft?: IconName;
  /**
   * Accent color used when selected.
   * If omitted, falls back to theme accent.
   */
  accentColor?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
  disabled?: boolean;
};

/**
 * Consistent pill/chip component used for filters, toggles, category tags, etc.
 */
export default function Chip({
  label,
  selected,
  onPress,
  iconLeft,
  accentColor,
  size = 'md',
  style,
  disabled,
}: Props) {
  const { colors } = useContext(ThemeContext);
  const isDisabled = !!disabled;
  const activeColor = accentColor || colors.accent;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: colors.surface2, borderColor: colors.border },
        selected && { backgroundColor: activeColor, borderColor: activeColor },
        pressed && !isDisabled && styles.pressed,
        isDisabled && { opacity: 0.45 },
        style,
      ]}
      hitSlop={8}
    >
      {iconLeft ? (
        <View style={styles.iconWrap}>
          <Icon
            name={iconLeft}
            size={(size === 'sm' ? 14 : 16) as any}
            color={selected ? '#FFF' : colors.text}
            strokeWidth={2.2}
          />
        </View>
      ) : null}
      <AppText
        numberOfLines={1}
        style={{
          fontWeight: '700',
          fontSize: size === 'sm' ? 12 : 13,
          color: selected ? '#FFF' : colors.text,
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  sm: {
    height: 36,
    paddingHorizontal: 12,
  },
  md: {
    height: 40,
    paddingHorizontal: 14,
  },
  iconWrap: {
    marginRight: 6,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
