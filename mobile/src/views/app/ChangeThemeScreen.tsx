import React, { useContext } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../../components/AppText';
import Icon from '../../components/Icon';
import { scaleHeight } from '../../constants/size';
import { ProfileService } from '../../services/ProfileService';
import { AuthContext } from '../../store/auth';
import { ThemeContext } from '../../store/theme';
import { radius, spacing } from '../../theme/colors';

type Option = { label: string; value: 'light' | 'dark' };

const THEME_OPTIONS: Option[] = [
  { label: 'Light Mode', value: 'light' },
  { label: 'Dark Mode', value: 'dark' },
];

export default function ChangeThemeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { userId } = useContext(AuthContext);
  const { theme, colors, setTheme } = useContext(ThemeContext);

  const handleSelect = async (value: 'light' | 'dark') => {
    if (value === theme) return;
    try {
      await ProfileService.updateProfile(userId!, { theme: value });
      setTheme(value);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update theme');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Icon name="arrow-left" size={26} color={colors.text} strokeWidth={2.4} />
        </Pressable>
        <AppText style={[styles.headerTitle, { color: colors.text }]}>Change Theme</AppText>
        <View style={styles.backBtn} />
      </View>

      {/* ── Subtitle ── */}
      <AppText muted style={[styles.subtitle, { color: colors.textSecondary }]}>
        Choose how your PulseSpend experience looks for this device.
      </AppText>

      {/* ── Radio List ── */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {THEME_OPTIONS.map((opt, idx) => {
          const selected = opt.value === theme;
          const isLast = idx === THEME_OPTIONS.length - 1;

          return (
            <Pressable
              key={opt.value}
              onPress={() => handleSelect(opt.value)}
              style={({ pressed }) => [
                styles.row,
                { opacity: pressed ? 0.7 : 1 },
                !isLast && [styles.rowDivider, { borderBottomColor: colors.border }],
              ]}
            >
              <AppText style={[styles.rowLabel, { color: colors.text }]}>{opt.label}</AppText>
              <View
                style={[
                  styles.radio,
                  { borderColor: selected ? colors.accent : colors.muted },
                ]}
              >
                {selected && <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: scaleHeight(54),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  backBtn: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 14.5,
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
    marginBottom: 18,
  },
  card: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    fontSize: 15.5,
    fontWeight: '600',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
