import React, { ReactNode, useContext } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { ThemeContext } from '../store/theme';
import { spacing } from '../theme/colors';

type Preset = 'fixed' | 'scroll';

type Props = {
  children: ReactNode;
  preset?: Preset;
  /**
   * Standard horizontal padding.
   * Defaults to true to enforce layout rhythm.
   */
  padded?: boolean;
  /**
   * Include safe area top.
   * For tab screens that already account for top inset, pass false.
   */
  safeTop?: boolean;
  safeBottom?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  edges?: Edge[];
};

/**
 * A lightweight screen wrapper to enforce:
 * - consistent background
 * - safe area handling
 * - default content padding rhythm
 */
export default function Screen({
  children,
  preset = 'fixed',
  padded = true,
  safeTop = true,
  safeBottom = true,
  style,
  contentContainerStyle,
  edges,
}: Props) {
  const { colors } = useContext(ThemeContext);

  const resolvedEdges: Edge[] = edges
    ? edges
    : [
        ...(safeTop ? (['top'] as Edge[]) : []),
        ...(safeBottom ? (['bottom'] as Edge[]) : []),
      ];

  const base = [styles.base, { backgroundColor: colors.bg }, style];

  if (preset === 'scroll') {
    return (
      <SafeAreaView style={base} edges={resolvedEdges}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            padded && styles.padded,
            !padded && styles.unpadded,
            contentContainerStyle,
          ]}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={base} edges={resolvedEdges}>
      <View style={[padded ? styles.padded : styles.unpadded, contentContainerStyle]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  unpadded: {
    paddingTop: 0,
  },
});
