import React, { useContext } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../../components/AppText';
import Icon from '../../components/Icon';
import { scaleHeight } from '../../constants/size';
import { AuthContext } from '../../store/auth';
import { ProfileContext } from '../../store/profile';
import { ThemeContext } from '../../store/theme';
import { radius, spacing } from '../../theme/colors';

type Option = { label: string; value: string };

const CURRENCY_OPTIONS: Option[] = [
  { label: 'Sri Lankan Rupees (LKR)', value: 'LKR' },
  { label: 'US Dollars (USD)', value: 'USD' },
  { label: 'Euros (EUR)', value: 'EUR' },
];

export default function DefaultCurrencyScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { userId } = useContext(AuthContext);
  const { colors } = useContext(ThemeContext);
  const { currency, updateCurrency } = useContext(ProfileContext);

  const handleSelect = async (value: string) => {
    if (value === currency) return;
    try {
      await updateCurrency(userId!, value);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update currency');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Icon name="arrow-left" size={26} color={colors.text} strokeWidth={2.4} />
        </Pressable>
        <AppText style={[styles.headerTitle, { color: colors.text }]}>Default Currency</AppText>
        <View style={styles.backBtn} />
      </View>

      {/* ── Subtitle ── */}
      <AppText muted style={[styles.subtitle, { color: colors.textSecondary }]}>
        Set your preferred currency for PulseSpend on this device.
      </AppText>

      {/* ── Radio List ── */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {CURRENCY_OPTIONS.map((opt, idx) => {
          const selected = opt.value === (currency || 'USD');
          const isLast = idx === CURRENCY_OPTIONS.length - 1;

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
