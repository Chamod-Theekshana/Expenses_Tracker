import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Image, ScrollView, Dimensions } from 'react-native';
import Svg, { Circle, Polyline, Defs, LinearGradient, Stop } from 'react-native-svg';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import { spacing, radius } from '../../theme/colors';
import { TransactionsContext } from '../../store/transactions';
import { AuthContext } from '../../store/auth';
import { ProfileContext } from '../../store/profile';
import { formatMoney } from '../../utils/money';
import { scaleHeight } from '../../constants/size';
import { ThemeContext } from '../../store/theme';
import { images } from '../../constants/images';
import { BudgetService, BudgetStatus } from '../../services/BudgetService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Tiny sparkline component ──────────────────────────────────
function MiniSparkline({ data, color, width = 80, height = 36 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Circular progress ring ──────────────────────────────────
function CircularProgress({
  percentage,
  size = 70,
  strokeWidth = 7,
  trackColor,
  progressColor,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  trackColor: string;
  progressColor: string;
}) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const clampedPct = Math.min(percentage, 100);
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      {/* Track */}
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      {/* Progress */}
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={progressColor}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${cx}, ${cy}`}
      />
    </Svg>
  );
}

// ── Category color helper ─────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  Food: '#FF6B6B',
  Transport: '#6C5CE7',
  Bills: '#00D9FF',
  Shopping: '#FFAA00',
  Health: '#2ED573',
  Entertainment: '#FF9FF3',
  Education: '#54A0FF',
  Income: '#2ED573',
  Other: '#A29BFE',
  Groceries: '#FF9F43',
  Rent: '#EE5A24',
  Salary: '#2ED573',
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || '#6C5CE7';
}

export default function HomeScreen({ navigation }: any) {
  const { items } = useContext(TransactionsContext);
  const { userEmail } = useContext(AuthContext);
  const { name, profilePhoto } = useContext(ProfileContext);
  const { colors } = useContext(ThemeContext);

  const [allBudgets, setAllBudgets] = useState<BudgetStatus[]>([]);

  const stats = useMemo(() => {
    const income = items.filter(t => t.amount > 0).reduce((a, b) => a + b.amount, 0);
    const expense = items.filter(t => t.amount < 0).reduce((a, b) => a + b.amount, 0);
    const balance = income + expense;
    return { income, expense, balance };
  }, [items]);

  // Build sparkline data from last 7 days of balances
  const sparklineData = useMemo(() => {
    if (items.length === 0) return [0, 0];
    const sorted = [...items].sort(
      (a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime(),
    );
    let running = 0;
    const points: number[] = [];
    sorted.forEach((t) => {
      running += t.amount;
      points.push(running);
    });
    // Take last 8 points or all if fewer
    return points.length > 8 ? points.slice(-8) : points;
  }, [items]);

  const recent = items.slice(0, 5);

  // Load budget statuses
  useEffect(() => {
    (async () => {
      try {
        const statuses = await BudgetService.getStatus();
        setAllBudgets(statuses);
      } catch {
        // silently fail
      }
    })();
  }, [items]);

  return (
    <ScrollView style={[styles.wrap, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false}>
      {/* ─── Profile Header ─── */}
      <View style={[styles.profileHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {profilePhoto ? (
          <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
        ) : (
          <View style={[styles.profilePlaceholder, { backgroundColor: colors.accent }]}>
            <AppText style={styles.profileInitial}>{name.charAt(0).toUpperCase() || 'U'}</AppText>
          </View>
        )}
        <View style={styles.profileInfo}>
          <AppText style={[styles.greeting, { color: colors.text }]}>Hi, {name || 'User'}!</AppText>
          <AppText style={[styles.email, { color: colors.muted }]}>{userEmail}</AppText>
        </View>
      </View>

      {/* ─── Balance Card with Sparkline ─── */}
      <View style={[styles.balanceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.balanceTop}>
          <View>
            <AppText muted style={{ fontSize: 13, fontWeight: '500' }}>Total Balance</AppText>
            <AppText style={[styles.balanceAmount, { color: colors.text }]}>
              {formatMoney(stats.balance)}
            </AppText>
          </View>
          <View style={styles.sparklineWrap}>
            <MiniSparkline data={sparklineData} color={stats.balance >= 0 ? colors.success : colors.danger} width={90} height={40} />
          </View>
        </View>

        {/* Income / Expense Pills */}
        <View style={styles.pillRow}>
          <View style={[styles.pill, { backgroundColor: 'rgba(46,213,115,0.12)' }]}>
            <View style={[styles.pillDot, { backgroundColor: colors.success }]}>
              <AppText style={{ fontSize: 10, color: '#FFF' }}>↗</AppText>
            </View>
            <AppText muted style={{ fontSize: 11, marginLeft: 6 }}>Income</AppText>
            <AppText mono style={[styles.pillAmount, { color: colors.success }]}>
              {formatMoney(stats.income)}
            </AppText>
          </View>
          <View style={[styles.pill, { backgroundColor: 'rgba(255,107,107,0.12)' }]}>
            <View style={[styles.pillDot, { backgroundColor: colors.danger }]}>
              <AppText style={{ fontSize: 10, color: '#FFF' }}>↙</AppText>
            </View>
            <AppText muted style={{ fontSize: 11, marginLeft: 6 }}>Expense</AppText>
            <AppText mono style={[styles.pillAmount, { color: colors.danger }]}>
              {formatMoney(stats.expense)}
            </AppText>
          </View>
        </View>
      </View>

      {/* ─── Budget Overview (horizontal scroll with rings) ─── */}
      <View style={styles.sectionRow}>
        <AppText style={styles.sectionTitle}>Budget Overview</AppText>
        <Pressable onPress={() => navigation.getParent()?.navigate('Budgets')} hitSlop={10}>
          <AppText style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }}>Manage →</AppText>
        </Pressable>
      </View>

      {allBudgets.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.budgetScroll}
        >
          {allBudgets.map((b) => {
            const isOver = b.percentage >= 100;
            const isWarning = b.percentage >= 80;
            const ringColor = isOver ? colors.danger : isWarning ? colors.warning : colors.success;
            const clampedPct = Math.min(b.percentage, 100);

            return (
              <View
                key={b.id}
                style={[styles.budgetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.budgetCardHeader}>
                  <AppText style={{ fontWeight: '600', fontSize: 14, flex: 1 }} numberOfLines={1}>
                    {b.category}
                  </AppText>
                  {isOver && <AppText style={{ fontSize: 14 }}>⚠️</AppText>}
                </View>
                <View style={styles.budgetRingRow}>
                  <CircularProgress
                    percentage={clampedPct}
                    size={64}
                    strokeWidth={6}
                    trackColor={colors.surface2}
                    progressColor={ringColor}
                  />
                  <View style={styles.budgetStats}>
                    <AppText style={{ fontWeight: '800', fontSize: 16, color: ringColor }}>
                      {b.percentage}%
                    </AppText>
                    <AppText muted style={{ fontSize: 10, marginTop: 2 }}>
                      {isOver ? 'Overspend' : 'Used'}
                    </AppText>
                  </View>
                </View>
                <AppText muted style={{ fontSize: 10, marginTop: 8 }}>
                  {formatMoney(b.spent)} / {formatMoney(b.amount)} limit
                </AppText>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Pressable onPress={() => navigation.getParent()?.navigate('Budgets')}>
          <View style={[styles.emptyBudgetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText style={{ fontSize: 28, marginBottom: 6 }}>💰</AppText>
            <AppText style={{ fontWeight: '600', fontSize: 14 }}>No budgets set yet</AppText>
            <AppText muted style={{ fontSize: 12, marginTop: 4, textAlign: 'center' }}>
              Set monthly limits per category to track spending
            </AppText>
            <AppText style={{ color: colors.accent, fontWeight: '600', fontSize: 13, marginTop: 10 }}>
              + Set Budget
            </AppText>
          </View>
        </Pressable>
      )}

      {/* ─── Auto-repeat (Recurring) ─── */}
      <Pressable onPress={() => navigation.getParent()?.navigate('Recurring')}>
        <View style={[styles.recurringCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText style={{ fontSize: 28, marginBottom: 6 }}>🔄</AppText>
          <AppText style={{ fontWeight: '700', fontSize: 15 }}>Auto-repeat transactions</AppText>
          <AppText muted style={{ fontSize: 12, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
            Set up daily, weekly, monthly or yearly recurring expenses & income
          </AppText>
          <AppText style={{ color: colors.accent, fontWeight: '700', fontSize: 14, marginTop: 10 }}>
            + Add Recurring
          </AppText>
          <AppText muted style={{ fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
            e.g., Rent, Netflix, Gym
          </AppText>
        </View>
      </Pressable>

      {/* ─── Recent Transactions ─── */}
      <View style={styles.sectionRow}>
        <AppText style={styles.sectionTitle}>Recent Transactions</AppText>
        <Pressable onPress={() => navigation.navigate('Transactions')} hitSlop={10}>
          <AppText style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }}>View all →</AppText>
        </Pressable>
      </View>

      {recent.length > 0 ? (
        recent.map((item) => {
          const isIncome = item.amount > 0;
          const catColor = getCategoryColor(item.category);
          const dateObj = new Date(item.dateISO);
          const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          const isToday =
            new Date().toDateString() === dateObj.toDateString();
          const isYesterday =
            new Date(Date.now() - 86400000).toDateString() === dateObj.toDateString();
          const dayLabel = isToday
            ? 'Today'
            : isYesterday
            ? 'Yesterday'
            : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          return (
            <Pressable
              key={item.id}
              onPress={() => navigation.navigate('Transactions')}
              style={({ pressed }) => [
                styles.txRow,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              {/* Category icon circle */}
              <View style={[styles.txIcon, { backgroundColor: catColor + '20' }]}>
                <AppText style={{ fontSize: 14, fontWeight: '800', color: catColor }}>
                  {item.category.charAt(0).toUpperCase()}
                </AppText>
              </View>

              {/* Title + Category + Date */}
              <View style={styles.txInfo}>
                <AppText style={{ fontWeight: '600', fontSize: 15, color: colors.text }}>
                  {item.title}
                </AppText>
                <AppText muted style={{ fontSize: 12, marginTop: 2 }}>
                  {item.category}
                </AppText>
                <AppText muted style={{ fontSize: 11, marginTop: 1 }}>
                  {dayLabel}, {timeStr}
                </AppText>
              </View>

              {/* Amount */}
              <AppText
                mono
                style={{
                  fontWeight: '700',
                  fontSize: 15,
                  color: isIncome ? colors.success : colors.text,
                }}
              >
                {formatMoney(item.amount)}
              </AppText>
            </Pressable>
          );
        })
      ) : (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <AppText muted>No transactions yet. Tap + to add one.</AppText>
        </View>
      )}

      <View style={{ height: scaleHeight(60) }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: scaleHeight(55),
  },

  // ── Profile Header ──
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  profileImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  profilePlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  profileInfo: {
    marginLeft: 14,
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
  },
  email: {
    fontSize: 12,
    marginTop: 2,
  },

  // ── Balance Card ──
  balanceCard: {
    marginTop: 18,
    padding: 20,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 8,
    paddingVertical:3,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'] as any,
  },
  sparklineWrap: {
    marginTop: 8,
    opacity: 0.9,
  },

  // ── Income / Expense Pills ──
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    flexWrap: 'wrap',
  },
  pillDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillAmount: {
    fontWeight: '700',
    fontSize: 14,
    marginTop: 4,
    width: '100%',
    paddingLeft: 28,
  },

  // ── Section Headers ──
  sectionRow: {
    marginTop: 26,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 18,
  },

  // ── Budget Cards ──
  budgetScroll: {
    paddingRight: 20,
    gap: 12,
  },
  budgetCard: {
    width: (SCREEN_WIDTH - 56) / 2,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  budgetCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  budgetRingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  budgetStats: {
    flex: 1,
  },
  emptyBudgetCard: {
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },

  // ── Recurring Card ──
  recurringCard: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 18,
  },

  // ── Transaction Rows ──
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    gap: 14,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
  },
});
