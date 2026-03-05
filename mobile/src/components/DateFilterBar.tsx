import React, { useContext, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import AppText from './AppText';
import Icon from './Icon';
import { DateFilterContext } from '../store/dateFilter';
import { TransactionsContext } from '../store/transactions';
import { ThemeContext } from '../store/theme';
import { radius } from '../theme/colors';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function DateFilterBar() {
  const {
    year, month, day,
    setYear, setMonth, setDay,
    clearFilter, hasActiveFilter, filterLabel,
  } = useContext(DateFilterContext);
  const { items } = useContext(TransactionsContext);
  const { colors } = useContext(ThemeContext);

  // ── Data ──
  const availableYears = useMemo(() => {
    const s = new Set<number>();
    items.forEach((t) => {
      const d = new Date(t.dateISO);
      if (!isNaN(d.getTime())) s.add(d.getFullYear());
    });
    s.add(new Date().getFullYear());
    return [...s].sort((a, b) => b - a);
  }, [items]);

  const availableDays = useMemo(() => {
    if (year === null || month === null) return [];
    return Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1);
  }, [year, month]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.panelHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="calendar" size={16} color={colors.text} />
          <AppText style={{ fontWeight: '700', fontSize: 13, color: colors.text }}>
            {filterLabel}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {hasActiveFilter && (
            <Pressable onPress={clearFilter} hitSlop={12} style={[styles.clearBtn, { borderColor: colors.danger + '33' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="x" size={12} color={colors.danger} />
                <AppText style={{ fontSize: 11, fontWeight: '700', color: colors.danger }}>Clear</AppText>
              </View>
            </Pressable>
          )}
        </View>
      </View>

      {/* Year */}
      <View style={styles.filterSection}>
        <AppText style={[styles.sectionLabel, { color: colors.muted }]}>Year</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {availableYears.map((y) => {
            const active = year === y;
            return (
              <Pressable
                key={`y-${y}`}
                onPress={() => setYear(active ? null : y)}
                style={[
                  styles.chip,
                  { backgroundColor: colors.surface2, borderColor: colors.border },
                  active && { backgroundColor: colors.accent, borderColor: colors.accent },
                ]}
              >
                <AppText style={{ fontWeight: '700', fontSize: 12, color: active ? '#FFF' : colors.text }}>
                  {y}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Month */}
      {year !== null && (
        <View style={styles.filterSection}>
          <AppText style={[styles.sectionLabel, { color: colors.muted }]}>Month</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {MONTH_NAMES.map((m, idx) => {
              const mn = idx + 1;
              const active = month === mn;
              return (
                <Pressable
                  key={`m-${mn}`}
                  onPress={() => setMonth(active ? null : mn)}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.surface2, borderColor: colors.border },
                    active && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                >
                  <AppText style={{ fontWeight: '600', fontSize: 12, color: active ? '#FFF' : colors.text }}>
                    {m}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Day */}
      {month !== null && (
        <View style={styles.filterSection}>
          <AppText style={[styles.sectionLabel, { color: colors.muted }]}>Day</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {availableDays.map((d) => {
              const active = day === d;
              return (
                <Pressable
                  key={`d-${d}`}
                  onPress={() => setDay(active ? null : d)}
                  style={[
                    styles.chipSmall,
                    { backgroundColor: colors.surface2, borderColor: colors.border },
                    active && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                >
                  <AppText style={{ fontWeight: '600', fontSize: 11, color: active ? '#FFF' : colors.text }}>
                    {d}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 24,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    width: 42,
  },
  chipRow: {
    gap: 6,
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  chipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: 1,
    minWidth: 34,
    alignItems: 'center',
  },
});
