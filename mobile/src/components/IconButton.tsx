import React, { useContext } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { ThemeContext } from '../store/theme';
import Icon, { type IconName } from './Icon';
import { radius } from '../theme/colors';

type Props = {
  icon: IconName;
  onPress?: () => void;
  size?: number; // touch target size
  iconSize?: number;
  variant?: 'ghost' | 'surface';
  color?: string;
  style?: ViewStyle;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/**
 * Small, consistent icon button with subtle press feedback.
 * Designed to replace ad-hoc Pressable+Icon patterns.
 */
export default function IconButton({
  icon,
  onPress,
  size = 40,
  iconSize = 20,
  variant = 'ghost',
  color,
  style,
  disabled,
  accessibilityLabel,
}: Props) {
  const { colors } = useContext(ThemeContext);
  const isDisabled = !!disabled;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          backgroundColor: variant === 'surface' ? colors.surface : 'transparent',
          borderColor: variant === 'surface' ? colors.border : 'transparent',
        },
        pressed && !isDisabled && styles.pressed,
        isDisabled && { opacity: 0.45 },
        style,
      ]}
      hitSlop={10}
    >
      <Icon name={icon} size={iconSize as any} color={color || colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },
});
