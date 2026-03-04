import React, { useContext, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  PanResponder,
} from 'react-native';
import AppText from './AppText';
import Icon from './Icon';
import { DateFilterContext } from '../store/dateFilter';
import { TransactionsContext } from '../store/transactions';
import { ThemeContext } from '../store/theme';
import { radius } from '../theme/colors';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PANEL_HEIGHT = 240;
const DRAG_THRESHOLD = 30;

export default function DateFilterBar() {
  const {
    year, month, day,
    setYear, setMonth, setDay,
    clearFilter, hasActiveFilter, filterLabel,
    isOpen, setIsOpen,
  } = useContext(DateFilterContext);
  const { items } = useContext(TransactionsContext);
  const { colors } = useContext(ThemeContext);

  // Animate from 0 (closed) to PANEL_HEIGHT (open)
  const heightAnim = useRef(new Animated.Value(0)).current;
  const dragStartH = useRef(0);

  // Sync animation when isOpen changes externally (e.g., from floating button)
  const prevOpen = useRef(isOpen);
  if (prevOpen.current !== isOpen) {
    prevOpen.current = isOpen;
    Animated.spring(heightAnim, {
      toValue: isOpen ? PANEL_HEIGHT : 0,
      useNativeDriver: false,
      tension: 70,
      friction: 11,
    }).start();
  }

  // PanResponder ONLY on the drag handle area
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        heightAnim.stopAnimation((v) => { dragStartH.current = v; });
      },
      onPanResponderMove: (_, gs) => {
        // Drag DOWN from grip = no-op (already at bottom of panel)
        // Drag UP = shrink height (close)
        const h = dragStartH.current + gs.dy;
        heightAnim.setValue(Math.max(0, Math.min(PANEL_HEIGHT, h)));
      },
      onPanResponderRelease: (_, gs) => {
        // Drag up enough → close; drag down or small move → stay open
        if (gs.dy < -DRAG_THRESHOLD) {
          setIsOpen(false);
          Animated.spring(heightAnim, {
            toValue: 0,
            useNativeDriver: false,
            tension: 70,
            friction: 11,
          }).start();
        } else {
          Animated.spring(heightAnim, {
            toValue: PANEL_HEIGHT,
            useNativeDriver: false,
            tension: 80,
            friction: 11,
          }).start();
        }
      },
    }),
  ).current;

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

  // Opacity fades in as panel opens
  const contentOpacity = heightAnim.interpolate({
    inputRange: [0, 60, PANEL_HEIGHT],
    outputRange: [0, 0.3, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.outer,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          height: heightAnim,
        },
      ]}
    >
      {/* Panel content — fades in */}
      <Animated.View style={[styles.panel, { opacity: contentOpacity }]} pointerEvents={isOpen ? 'auto' : 'none'}>
        {/* Header */}
        <View style={styles.panelHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="calendar" size={16} color={colors.text} />
            <AppText style={{ fontWeight: '700', fontSize: 15, color: colors.text }}>
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
            <Pressable onPress={() => setIsOpen(false)} hitSlop={12}>
              <Icon name="x" size={20} color={colors.muted} />
            </Pressable>
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
      </Animated.View>

      {/* ── Bottom drag handle — for dragging UP to close ── */}
      <View
        style={[styles.handleArea, { borderTopColor: colors.border }]}
        {...panResponder.panHandlers}
      >
        <View style={[styles.dragHandle, { backgroundColor: colors.muted + '55' }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // ── Panel ──
  panel: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },

  // ── Drag Handle (bottom of panel) ──
  handleArea: {
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },

  // ── Sections ──
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
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
