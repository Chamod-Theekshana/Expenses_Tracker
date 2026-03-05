import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, Pressable, Image, ScrollView, Dimensions } from 'react-native';
import Svg, { Circle, Polyline, Defs, LinearGradient, Stop } from 'react-native-svg';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import { spacing, radius } from '../../theme/colors';
import { TransactionsContext } from '../../store/transactions';
import { AuthContext } from '../../store/auth';
import { ProfileContext } from '../../store/profile';
import { DateFilterContext } from '../../store/dateFilter';
import { SidebarContext } from '../../store/sidebar';
import { formatMoney } from '../../utils/money';
import { scaleHeight } from '../../constants/size';
import { ThemeContext } from '../../store/theme';
import Icon from '../../components/Icon';
import { getCategoryMeta } from '../../constants/categories';
import { BudgetService, BudgetStatus } from '../../services/BudgetService';
import { ExchangeRateService } from '../../services/ExchangeRateService';
import { RecurringService, RecurringRule } from '../../services/RecurringService';
import { GoalService, Goal } from '../../services/GoalService';

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
  return getCategoryMeta(category).color;
}

export default function HomeScreen({ navigation }: any) {
  const { items } = useContext(TransactionsContext);
  const { userEmail } = useContext(AuthContext);
  const { name, profilePhoto, currency: preferredCurrency } = useContext(ProfileContext);
  const { colors } = useContext(ThemeContext);
  const { matchesFilter, year, month, day, filterLabel, hasActiveFilter } = useContext(DateFilterContext);
  const { openSidebar } = useContext(SidebarContext);

  const [allBudgets, setAllBudgets] = useState<BudgetStatus[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [upcomingBills, setUpcomingBills] = useState<RecurringRule[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  // Fetch exchange rates for conversion
  useEffect(() => {
    (async () => {
      try {
        const r = await ExchangeRateService.getRates(preferredCurrency);
        setRates(r && typeof r === 'object' ? r : {});
      } catch { /* fallback: no conversion */ }
    })();
  }, [preferredCurrency]);

  // Apply global date filter
  const filteredItems = useMemo(
    () => items.filter(t => matchesFilter(t.dateISO)),
    [items, matchesFilter],
  );

  // Convert helper: convert amount from txCurrency to preferredCurrency
  const convertAmount = (amount: number, txCurrency: string) => {
    if (!txCurrency || txCurrency === preferredCurrency) return amount;
    if (!rates || Object.keys(rates).length === 0) return amount;
    const rateToTx = rates[txCurrency.toUpperCase()];
    if (!rateToTx || rateToTx === 0) return amount;
    return Math.round((amount / rateToTx) * 100) / 100;
  };

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredItems.forEach(t => {
      const converted = convertAmount(t.amount, t.currency || 'LKR');
      if (converted > 0) income += converted;
      else expense += Math.abs(converted);
    });
    const balance = income - expense;
    return {
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    };
  }, [filteredItems, rates, preferredCurrency]);

  // Build sparkline data from last 7 days of balances
  const sparklineData = useMemo(() => {
    if (filteredItems.length === 0) return [0, 0];
    const sorted = [...filteredItems].sort(
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
  }, [filteredItems]);

  const recent = useMemo(() => {
    // Ensure "Recent" is actually the newest by date, regardless of API ordering
    return [...filteredItems]
      .sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime())
      .slice(0, 5);
  }, [filteredItems]);

  const topCategory = useMemo(() => {
    const expenses = filteredItems.filter(t => t.amount < 0);
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(t => {
      const cat = t.category || 'Other';
      const converted = convertAmount(Math.abs(t.amount), t.currency || preferredCurrency);
      categoryTotals[cat] = (categoryTotals[cat] || 0) + converted;
    });

    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      return { category: sorted[0][0], amount: sorted[0][1] };
    }
    return null;
  }, [filteredItems, preferredCurrency, convertAmount]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const statuses = await BudgetService.getStatus(year, month, day);
          setAllBudgets(statuses);
        } catch {}

        try {
          const rules = await RecurringService.list();
          const activeBills = rules
            .filter(r => r.is_active && r.amount < 0)
            .sort((a, b) => new Date(a.next_run).getTime() - new Date(b.next_run).getTime())
            .slice(0, 3);
          setUpcomingBills(activeBills);
        } catch {}

        try {
          const goalsList = await GoalService.list();
          setGoals(goalsList.filter(g => !g.is_completed));
        } catch {}
      })();
    }, [filteredItems, year, month, day])
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', emoji: '☀️' };
    if (hour < 18) return { text: 'Good Afternoon', emoji: '🌤️' };
    return { text: 'Good Evening', emoji: '🌙' };
  };
  const { text: greetingText, emoji: greetingEmoji } = getGreeting();

  return (
    <ScrollView style={[styles.wrap, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false}>
      {/* ─── Profile Header ─── */}
      <View style={[styles.profileHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable onPress={openSidebar} style={{ marginRight: 12, padding: 4 }}>
          <Icon name="menu" size={24} color={colors.text} />
        </Pressable>
        {profilePhoto ? (
          <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
        ) : (
          <View style={[styles.profilePlaceholder, { backgroundColor: colors.accent }]}>
            <AppText style={styles.profileInitial}>{name.charAt(0).toUpperCase() || 'U'}</AppText>
          </View>
        )}
        <View style={styles.profileInfo}>
          <AppText style={[styles.greeting, { color: colors.text }]}>{greetingText} {greetingEmoji}</AppText>
          <AppText style={[styles.email, { color: colors.muted }]}>{name || userEmail}</AppText>
        </View>
      </View>

      {/* ─── Balance Card with Sparkline ─── */}
      <View style={[styles.balanceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.balanceTop}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText muted style={{ fontSize: 13, fontWeight: '500' }}>Total Balance</AppText>
              <View style={[styles.filterBadge, { backgroundColor: colors.bg }]}>
                <AppText style={{ fontSize: 10, color: colors.text, fontWeight: '600' }}>{filterLabel}</AppText>
              </View>
            </View>
            <AppText style={[styles.balanceAmount, { color: colors.text }]}>
              {formatMoney(stats.balance, preferredCurrency)}
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
              <Icon name="trending-up" size={12} color="#FFF" />
            </View>
            <AppText muted style={{ fontSize: 11, marginLeft: 6 }}>Income</AppText>
            <AppText mono style={[styles.pillAmount, { color: colors.success }]}>
              {formatMoney(stats.income, preferredCurrency)}
            </AppText>
          </View>
          <View style={[styles.pill, { backgroundColor: 'rgba(255,107,107,0.12)' }]}>
            <View style={[styles.pillDot, { backgroundColor: colors.danger }]}>
              <Icon name="trending-down" size={12} color="#FFF" />
            </View>
            <AppText muted style={{ fontSize: 11, marginLeft: 6 }}>Expense</AppText>
            <AppText mono style={[styles.pillAmount, { color: colors.danger }]}>
              {formatMoney(stats.expense, preferredCurrency)}
            </AppText>
          </View>
        </View>
        
        {/* Top Spending Category Indicator */}
        {topCategory && (
            <View style={[styles.topCategoryRow, { borderTopColor: colors.border }]}>
                <AppText muted style={{ fontSize: 12 }}>Top Spending Category: </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.miniCatDot, { backgroundColor: getCategoryColor(topCategory.category) }]} />
                  <AppText style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{topCategory.category}</AppText>
                </View>
            </View>
        )}
      </View>

      {/* ─── Budget Overview (horizontal scroll with rings) ─── */}
      <View style={styles.sectionRow}>
        <AppText style={styles.sectionTitle}>Budget Overview</AppText>
        <Pressable onPress={() => navigation.getParent()?.navigate('Budgets')} hitSlop={10}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <AppText style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }}>Manage</AppText>
            <Icon name="chevron-right" size={14} color={colors.accent} />
          </View>
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
                  {isOver && <Icon name="alert-triangle" size={16} color={colors.warning} />}
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
                  {formatMoney(b.spent, preferredCurrency)} / {formatMoney(b.amount, preferredCurrency)} limit
                </AppText>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Pressable onPress={() => navigation.getParent()?.navigate('Budgets')}>
          <View style={[styles.emptyBudgetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name="wallet" size={28} color={colors.accent} />
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

      {/* ─── Savings Goals Overview ─── */}
      <View style={styles.sectionRow}>
        <AppText style={styles.sectionTitle}>Savings Goals</AppText>
        <Pressable onPress={() => navigation.getParent()?.navigate('Goals')} hitSlop={10}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <AppText style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }}>Manage</AppText>
            <Icon name="chevron-right" size={14} color={colors.accent} />
          </View>
        </Pressable>
      </View>

      {goals.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.budgetScroll}
        >
          {goals.map((g) => {
            const clampedPct = Math.min(g.progress_percentage || 0, 100);
            return (
              <View
                key={g.id}
                style={[styles.budgetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.budgetCardHeader}>
                  <AppText style={{ fontWeight: '600', fontSize: 14, flex: 1 }} numberOfLines={1}>
                    {g.name}
                  </AppText>
                  {clampedPct >= 100 && <Icon name="party-popper" size={16} color={colors.success} />}
                </View>
                <View style={styles.budgetRingRow}>
                  <CircularProgress
                    percentage={clampedPct}
                    size={64}
                    strokeWidth={6}
                    trackColor={colors.surface2}
                    progressColor={colors.success}
                  />
                  <View style={styles.budgetStats}>
                    <AppText style={{ fontWeight: '800', fontSize: 16, color: colors.success }}>
                      {Math.round(clampedPct)}%
                    </AppText>
                  </View>
                </View>
                <AppText muted style={{ fontSize: 10, marginTop: 8 }}>
                  {formatMoney(g.current_amount, g.currency)} / {formatMoney(g.target_amount, g.currency)}
                </AppText>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Pressable onPress={() => navigation.getParent()?.navigate('Goals')}>
          <View style={[styles.emptyBudgetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name="target" size={28} color={colors.accent} />
            <AppText style={{ fontWeight: '600', fontSize: 14, marginTop: 8 }}>No active goals</AppText>
            <AppText muted style={{ fontSize: 12, marginTop: 4, textAlign: 'center' }}>
              Create a savings goal to track your progress
            </AppText>
            <AppText style={{ color: colors.accent, fontWeight: '600', fontSize: 13, marginTop: 10 }}>
              + Add Goal
            </AppText>
          </View>
        </Pressable>
      )}

      {/* ─── Upcoming Bills / Subscriptions ─── */}
      {upcomingBills.length > 0 && (
        <>
            <View style={styles.sectionRow}>
            <AppText style={styles.sectionTitle}>Upcoming Bills</AppText>
            <Pressable onPress={() => navigation.getParent()?.navigate('Recurring')} hitSlop={10}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <AppText style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }}>Manage</AppText>
                <Icon name="chevron-right" size={14} color={colors.accent} />
                </View>
            </Pressable>
            </View>
            <View style={[styles.billsContainer, { backgroundColor: colors.surface }]}>
               {upcomingBills.map(bill => {
                   const due = new Date(bill.next_run).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                   return (
                     <View key={bill.id} style={[styles.billRow, { borderBottomColor: colors.border }]}>
                        <View style={[styles.billIcon, { backgroundColor: getCategoryColor(bill.category) + '20' }]}>
                            <Icon name={getCategoryMeta(bill.category).icon} size={16} color={getCategoryColor(bill.category)} />
                        </View>
                        <View style={{ flex: 1, paddingLeft: 12 }}>
                            <AppText style={{ fontWeight: '600', fontSize: 14, color: colors.text }}>{bill.title}</AppText>
                            <AppText muted style={{ fontSize: 12, marginTop: 2 }}>Due {due}</AppText>
                        </View>
                        <AppText mono style={{ fontWeight: '700', fontSize: 14, color: colors.danger }}>
                            {formatMoney(Math.abs(bill.amount), bill.currency || preferredCurrency)}
                        </AppText>
                     </View>
                   )
               })}
            </View>
        </>
      )}

      {/* ─── Recent Transactions ─── */}
      <View style={styles.sectionRow}>
        <AppText style={styles.sectionTitle}>Recent Transactions</AppText>
        <Pressable onPress={() => navigation.navigate('Transactions')} hitSlop={10}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <AppText style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }}>View all</AppText>
            <Icon name="chevron-right" size={14} color={colors.accent} />
          </View>
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
                <Icon
                  name={getCategoryMeta(item.category).icon}
                  size={18}
                  color={catColor}
                />
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
                {formatMoney(item.amount, item.currency || preferredCurrency)}
              </AppText>
            </Pressable>
          );
        })
      ) : (
        <View style={[styles.emptyStateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.accent + '20' }]}>
            <Icon name="file-text" size={32} color={colors.accent} />
          </View>
          <AppText style={{ fontWeight: '700', fontSize: 16, marginTop: 12 }}>No transactions yet</AppText>
          <AppText muted style={{ fontSize: 13, marginTop: 4, textAlign: 'center', lineHeight: 20 }}>
             Start tracking your expenses and income to see your balance here.
          </AppText>
          <Pressable
            onPress={() => navigation.getParent()?.navigate('AddTx')}
            style={[styles.emptyButton, { backgroundColor: colors.accent }]}
          >
            <Icon name="plus" size={16} color="#FFF" />
            <AppText style={{ color: '#FFF', fontWeight: '600', fontSize: 14 }}>Add Transaction</AppText>
          </Pressable>
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
  filterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },

  // ── Top Category Indicator ──
  topCategoryRow: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniCatDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  
  // ── Upcoming Bills ──
  billsContainer: {
    borderRadius: radius.lg,
    paddingHorizontal: 16,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  billIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
  
  // ── Empty State ──
  emptyStateCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radius.full,
    marginTop: 24,
    gap: 8,
  },
});
