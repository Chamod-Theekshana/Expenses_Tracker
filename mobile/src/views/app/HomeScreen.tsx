import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, Pressable, Image, ScrollView, Dimensions } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
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

// ── Tiny sparkline ─────────────────────────────────────────────
function MiniSparkline({
  data,
  color,
  width = 80,
  height = 36,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
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

// ── Circular progress ring ──────────────────────────────────────
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
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
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

// ── "Due in X days" helper ─────────────────────────────────────
function getDueLabel(nextRunISO: string): { label: string; isOverdue: boolean; isToday: boolean } {
  const now = new Date();
  const due = new Date(nextRunISO);
  // Compare calendar days only
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffMs = dueMidnight.getTime() - todayMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: `Overdue by ${Math.abs(diffDays)}d`, isOverdue: true, isToday: false };
  if (diffDays === 0) return { label: 'Due today', isOverdue: false, isToday: true };
  if (diffDays === 1) return { label: 'Due tomorrow', isOverdue: false, isToday: false };
  if (diffDays <= 7) return { label: `Due in ${diffDays} days`, isOverdue: false, isToday: false };
  return {
    label: `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    isOverdue: false,
    isToday: false,
  };
}

// ─────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: any) {
  const { items } = useContext(TransactionsContext);
  const { userEmail } = useContext(AuthContext);
  const { name, profilePhoto, currency: preferredCurrency } = useContext(ProfileContext);
  const { colors } = useContext(ThemeContext);
  const { matchesFilter, year, month, filterLabel } = useContext(DateFilterContext);
  const { openSidebar } = useContext(SidebarContext);

  // ── Remote data ──
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [upcomingBills, setUpcomingBills] = useState<RecurringRule[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  // Track last-fetched filter so we only re-fetch when the date filter changes,
  // NOT every time a transaction is added (fixes the race-condition / N-fetch bug).
  const lastFetchKey = useRef<string>('');

  // ── Exchange rates (once per preferred currency) ──
  useEffect(() => {
    (async () => {
      try {
        const r = await ExchangeRateService.getRates(preferredCurrency);
        setRates(r && typeof r === 'object' ? r : {});
      } catch { /* fallback */ }
    })();
  }, [preferredCurrency]);

  // ── Remote fetch: budgets / recurring / goals ──
  const fetchRemote = useCallback(async () => {
    const fetchKey = `${year ?? 'all'}-${month ?? 'all'}`;
    if (lastFetchKey.current === fetchKey) return; // nothing changed
    lastFetchKey.current = fetchKey;

    // FIX: Budget always uses current month — never a year/day range.
    // Passing year+month or null+null (current month default) keeps it meaningful.
    const budgetYear = year ?? undefined;
    const budgetMonth = month ?? undefined;

    try {
      const statuses = await BudgetService.getStatus(
        budgetMonth ? budgetYear : undefined,
        budgetMonth ?? undefined,
        undefined, // never pass a day to budget — daily vs monthly comparison is meaningless
      );
      setBudgets(statuses);
    } catch { /* keep previous */ }

    try {
      const rules = await RecurringService.list();
      // Show ALL active recurring rules (both income + expense), sorted by next_run,
      // capped at 4 entries. Date filter does not apply — recurring is always forward-looking.
      const active = rules
        .filter(r => r.is_active)
        .sort((a, b) => new Date(a.next_run).getTime() - new Date(b.next_run).getTime())
        .slice(0, 4);
      setUpcomingBills(active);
    } catch { /* keep previous */ }

    try {
      const allGoals = await GoalService.list();
      // FIX: Show all incomplete goals regardless of date filter.
      // A goal created in 2023 is still active in 2025 — never hide it by filter.
      setGoals(allGoals.filter(g => !g.is_completed));
    } catch { /* keep previous */ }
  }, [year, month]);

  // Re-fetch only when screen focused AND filter actually changed
  useFocusEffect(useCallback(() => {
    lastFetchKey.current = ''; // force refresh on focus
    fetchRemote();
  }, [fetchRemote]));

  // ── Derived: filter transactions ──
  const filteredItems = useMemo(
    () => items.filter(t => matchesFilter(t.dateISO)),
    [items, matchesFilter],
  );

  // ── Currency conversion helper (uses cached rates) ──
  const convertAmount = useCallback((amount: number, txCurrency: string): number => {
    if (!txCurrency || txCurrency === preferredCurrency) return amount;
    if (!rates || Object.keys(rates).length === 0) return amount;
    const rateToTx = rates[txCurrency.toUpperCase()];
    if (!rateToTx || rateToTx === 0) return amount;
    return Math.round((amount / rateToTx) * 100) / 100;
  }, [rates, preferredCurrency]);

  // ── Stats ──
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredItems.forEach(t => {
      const c = convertAmount(t.amount, t.currency || 'LKR');
      if (c > 0) income += c;
      else expense += Math.abs(c);
    });
    return {
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      balance: Math.round((income - expense) * 100) / 100,
    };
  }, [filteredItems, convertAmount]);

  // ── Sparkline (running balance, last 10 points) ──
  const sparklineData = useMemo(() => {
    if (filteredItems.length === 0) return [0, 0];
    const sorted = [...filteredItems].sort(
      (a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime(),
    );
    let running = 0;
    const points: number[] = sorted.map(t => { running += t.amount; return running; });
    return points.length > 10 ? points.slice(-10) : points;
  }, [filteredItems]);

  // ── Recent 5 transactions ──
  const recent = useMemo(
    () =>
      [...filteredItems]
        .sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime())
        .slice(0, 5),
    [filteredItems],
  );

  // ── Top spending category (with amount) ──
  const topCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredItems
      .filter(t => t.amount < 0)
      .forEach(t => {
        const cat = t.category || 'Other';
        totals[cat] = (totals[cat] || 0) + convertAmount(Math.abs(t.amount), t.currency || preferredCurrency);
      });
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? { category: sorted[0][0], amount: sorted[0][1] } : null;
  }, [filteredItems, preferredCurrency, convertAmount]);

  // ── Greeting ──
  const { greetingText, greetingEmoji } = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return { greetingText: 'Good Morning', greetingEmoji: '☀️' };
    if (h < 18) return { greetingText: 'Good Afternoon', greetingEmoji: '🌤️' };
    return { greetingText: 'Good Evening', greetingEmoji: '🌙' };
  }, []);

  // ── Budget label: always shows which month it represents ──
  const budgetPeriodLabel = useMemo(() => {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    if (year && month) return `${MONTHS[month - 1]} ${year}`;
    const now = new Date();
    return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  }, [year, month]);

  // ─────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={[styles.wrap, { backgroundColor: colors.bg }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Profile Header ── */}
      <View style={[styles.profileHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable onPress={openSidebar} style={{ marginRight: 12, padding: 4 }}>
          <Icon name="menu" size={24} color={colors.text} />
        </Pressable>
        {profilePhoto ? (
          <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
        ) : (
          <View style={[styles.profilePlaceholder, { backgroundColor: colors.accent }]}>
            <AppText style={styles.profileInitial}>{(name || userEmail || 'U').charAt(0).toUpperCase()}</AppText>
          </View>
        )}
        <View style={styles.profileInfo}>
          <AppText style={[styles.greeting, { color: colors.text }]}>
            {greetingText} {greetingEmoji}
          </AppText>
          <AppText style={[styles.email, { color: colors.muted }]}>{name || userEmail}</AppText>
        </View>
      </View>

      {/* ── Balance Card ── */}
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
            <MiniSparkline
              data={sparklineData}
              color={stats.balance >= 0 ? colors.success : colors.danger}
              width={90}
              height={40}
            />
          </View>
        </View>

        {/* Income / Expense pills */}
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

        {/* FIX: Top category now shows amount too */}
        {topCategory && (
          <View style={[styles.topCategoryRow, { borderTopColor: colors.border }]}>
            <AppText muted style={{ fontSize: 12 }}>Top spending</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.miniCatDot, { backgroundColor: getCategoryMeta(topCategory.category).color }]} />
              <AppText style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                {topCategory.category}
              </AppText>
              <AppText style={{ fontSize: 13, fontWeight: '700', color: colors.danger }}>
                {formatMoney(topCategory.amount, preferredCurrency)}
              </AppText>
            </View>
          </View>
        )}
      </View>

      {/* ── Budget Overview ── */}
      <View style={styles.sectionRow}>
        <View>
          <AppText style={styles.sectionTitle}>Budget Overview</AppText>
          {/* FIX: clear label showing which month the budget data represents */}
          <AppText muted style={{ fontSize: 11, marginTop: 2 }}>{budgetPeriodLabel}</AppText>
        </View>
        <Pressable onPress={() => navigation.getParent()?.navigate('Budgets')} hitSlop={10}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <AppText style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }}>Manage</AppText>
            <Icon name="chevron-right" size={14} color={colors.accent} />
          </View>
        </Pressable>
      </View>

      {budgets.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {budgets.map(b => {
            const isOver = b.percentage >= 100;
            const isWarning = b.percentage >= 80;
            const ringColor = isOver ? colors.danger : isWarning ? colors.warning : colors.success;
            const catMeta = getCategoryMeta(b.category);

            return (
              <View
                key={b.id}
                style={[styles.hCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.hCardHeader}>
                  <View style={[styles.miniIconWrap, { backgroundColor: catMeta.color + '20' }]}>
                    <Icon name={catMeta.icon} size={14} color={catMeta.color} />
                  </View>
                  <AppText style={{ fontWeight: '600', fontSize: 13, flex: 1, marginLeft: 8 }} numberOfLines={1}>
                    {b.category}
                  </AppText>
                  {isOver && <Icon name="alert-triangle" size={14} color={colors.danger} />}
                </View>
                <View style={styles.ringRow}>
                  <CircularProgress
                    percentage={Math.min(b.percentage, 100)}
                    size={56}
                    strokeWidth={6}
                    trackColor={colors.surface2}
                    progressColor={ringColor}
                  />
                  <View style={{ marginLeft: 10 }}>
                    <AppText style={{ fontWeight: '800', fontSize: 18, color: ringColor }}>
                      {b.percentage}%
                    </AppText>
                    <AppText muted style={{ fontSize: 10, marginTop: 1 }}>
                      {isOver ? 'Overspent' : 'Used'}
                    </AppText>
                  </View>
                </View>
                <AppText muted style={{ fontSize: 10, marginTop: 10 }}>
                  {formatMoney(b.spent, b.currency)} / {formatMoney(b.amount, b.currency)}
                </AppText>
                {b.conversion_error && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                    <Icon name="alert-triangle" size={11} color={colors.warning} />
                    <AppText style={{ fontSize: 10, color: colors.warning, fontWeight: '600' }}>
                      Multi-currency — partial data
                    </AppText>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Pressable onPress={() => navigation.getParent()?.navigate('Budgets')}>
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name="wallet" size={26} color={colors.accent} />
            <AppText style={{ fontWeight: '600', fontSize: 14, marginTop: 8 }}>No budgets set</AppText>
            <AppText muted style={{ fontSize: 12, marginTop: 4, textAlign: 'center' }}>
              Set monthly limits per category to track spending
            </AppText>
            <AppText style={{ color: colors.accent, fontWeight: '600', fontSize: 13, marginTop: 10 }}>
              + Set Budget
            </AppText>
          </View>
        </Pressable>
      )}

      {/* ── Savings Goals ── */}
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {goals.map(g => {
            const pct = Math.min(g.progress_percentage || 0, 100);
            const isDone = pct >= 100;

            // Deadline urgency
            let deadlineLabel = '';
            let deadlineColor = colors.muted;
            if (g.deadline) {
              const { label, isOverdue, isToday } = getDueLabel(g.deadline);
              deadlineLabel = label;
              deadlineColor = isOverdue ? colors.danger : isToday ? colors.warning : colors.muted;
            }

            return (
              <View
                key={g.id}
                style={[styles.hCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.hCardHeader}>
                  <AppText style={{ fontWeight: '600', fontSize: 13, flex: 1 }} numberOfLines={1}>
                    {g.name}
                  </AppText>
                  {isDone && <Icon name="party-popper" size={14} color={colors.success} />}
                </View>
                <View style={styles.ringRow}>
                  <CircularProgress
                    percentage={pct}
                    size={56}
                    strokeWidth={6}
                    trackColor={colors.surface2}
                    progressColor={isDone ? colors.success : colors.accent}
                  />
                  <View style={{ marginLeft: 10 }}>
                    <AppText style={{ fontWeight: '800', fontSize: 18, color: isDone ? colors.success : colors.accent }}>
                      {Math.round(pct)}%
                    </AppText>
                    <AppText muted style={{ fontSize: 10, marginTop: 1 }}>Saved</AppText>
                  </View>
                </View>
                <AppText muted style={{ fontSize: 10, marginTop: 10 }}>
                  {formatMoney(g.current_amount, g.currency)} / {formatMoney(g.target_amount, g.currency)}
                </AppText>
                {deadlineLabel ? (
                  <AppText style={{ fontSize: 10, marginTop: 4, fontWeight: '600', color: deadlineColor }}>
                    {deadlineLabel}
                  </AppText>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Pressable onPress={() => navigation.getParent()?.navigate('Goals')}>
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name="target" size={26} color={colors.accent} />
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

      {/* ── Upcoming / Recurring ── */}
      <View style={styles.sectionRow}>
        <View>
          <AppText style={styles.sectionTitle}>Recurring</AppText>
          <AppText muted style={{ fontSize: 11, marginTop: 2 }}>Upcoming scheduled entries</AppText>
        </View>
        <Pressable onPress={() => navigation.getParent()?.navigate('Recurring')} hitSlop={10}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <AppText style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }}>Manage</AppText>
            <Icon name="chevron-right" size={14} color={colors.accent} />
          </View>
        </Pressable>
      </View>

      {upcomingBills.length > 0 ? (
        <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
          {upcomingBills.map((bill, idx) => {
            const isIncome = bill.amount >= 0;
            const { label: dueLabel, isOverdue, isToday } = getDueLabel(bill.next_run);
            const dueColor = isOverdue ? colors.danger : isToday ? colors.warning : colors.muted;
            const catMeta = getCategoryMeta(bill.category);
            const freqLabel: Record<string, string> = {
              daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly',
            };
            const isLast = idx === upcomingBills.length - 1;

            return (
              <View
                key={bill.id}
                style={[styles.listRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
              >
                <View style={[styles.listIcon, { backgroundColor: catMeta.color + '20' }]}>
                  <Icon name={catMeta.icon} size={16} color={catMeta.color} />
                </View>
                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <AppText style={{ fontWeight: '600', fontSize: 14, color: colors.text }}>
                    {bill.title}
                  </AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <AppText style={{ fontSize: 11, fontWeight: '600', color: dueColor }}>
                      {dueLabel}
                    </AppText>
                    <AppText muted style={{ fontSize: 11 }}>
                      · {freqLabel[bill.frequency] ?? bill.frequency}
                    </AppText>
                  </View>
                </View>
                <AppText
                  mono
                  style={{
                    fontWeight: '700',
                    fontSize: 14,
                    color: isIncome ? colors.success : colors.danger,
                  }}
                >
                  {isIncome ? '+' : '-'}{formatMoney(Math.abs(bill.amount), bill.currency || preferredCurrency)}
                </AppText>
              </View>
            );
          })}
        </View>
      ) : (
        /* FIX: empty state with CTA — was missing before */
        <Pressable onPress={() => navigation.getParent()?.navigate('Recurring')}>
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name="repeat" size={26} color={colors.accent} />
            <AppText style={{ fontWeight: '600', fontSize: 14, marginTop: 8 }}>No recurring entries</AppText>
            <AppText muted style={{ fontSize: 12, marginTop: 4, textAlign: 'center' }}>
              Set up recurring bills, subscriptions, or salary to automate tracking
            </AppText>
            <AppText style={{ color: colors.accent, fontWeight: '600', fontSize: 13, marginTop: 10 }}>
              + Add Recurring
            </AppText>
          </View>
        </Pressable>
      )}

      {/* ── Recent Transactions ── */}
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
        recent.map(item => {
          const isIncome = item.amount > 0;
          const catMeta = getCategoryMeta(item.category);
          const dateObj = new Date(item.dateISO);
          const now = new Date();
          const isToday = now.toDateString() === dateObj.toDateString();
          const isYesterday = new Date(Date.now() - 86400000).toDateString() === dateObj.toDateString();
          const dayLabel = isToday
            ? 'Today'
            : isYesterday
            ? 'Yesterday'
            : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

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
              <View style={[styles.txIcon, { backgroundColor: catMeta.color + '20' }]}>
                <Icon name={catMeta.icon} size={18} color={catMeta.color} />
              </View>
              <View style={styles.txInfo}>
                <AppText style={{ fontWeight: '600', fontSize: 15, color: colors.text }}>{item.title}</AppText>
                <AppText muted style={{ fontSize: 12, marginTop: 2 }}>{item.category}</AppText>
                <AppText muted style={{ fontSize: 11, marginTop: 1 }}>{dayLabel}, {timeStr}</AppText>
              </View>
              <AppText
                mono
                style={{ fontWeight: '700', fontSize: 15, color: isIncome ? colors.success : colors.text }}
              >
                {formatMoney(item.amount, item.currency || preferredCurrency)}
              </AppText>
            </Pressable>
          );
        })
      ) : (
        <View style={[styles.emptyTxCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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

// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.lg, paddingTop: scaleHeight(55) },

  // Header
  profileHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth,
  },
  profileImage: { width: 46, height: 46, borderRadius: 23 },
  profilePlaceholder: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  profileInitial: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  profileInfo: { marginLeft: 14, flex: 1 },
  greeting: { fontSize: 18, fontWeight: '700' },
  email: { fontSize: 12, marginTop: 2 },

  // Balance
  balanceCard: {
    marginTop: 18, padding: 20,
    borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth,
  },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  balanceAmount: {
    fontSize: 32, fontWeight: '800', marginTop: 8, paddingVertical: 3,
    letterSpacing: -0.5, fontVariant: ['tabular-nums'] as any,
  },
  sparklineWrap: { marginTop: 8, opacity: 0.9 },
  filterBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  topCategoryRow: {
    marginTop: 18, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  miniCatDot: { width: 10, height: 10, borderRadius: 5 },
  pillRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: radius.md, flexWrap: 'wrap' },
  pillDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  pillAmount: { fontWeight: '700', fontSize: 14, marginTop: 4, width: '100%', paddingLeft: 28 },

  // Sections
  sectionRow: { marginTop: 26, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sectionTitle: { fontWeight: '700', fontSize: 18 },

  // Horizontal scroll cards
  hScroll: { paddingRight: 20, gap: 12 },
  hCard: {
    width: (SCREEN_WIDTH - 56) / 2, padding: 14,
    borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth,
  },
  hCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  miniIconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ringRow: { flexDirection: 'row', alignItems: 'center' },

  // Empty cards
  emptyCard: {
    alignItems: 'center', paddingVertical: 22, paddingHorizontal: 16,
    borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth,
  },

  // Recurring list
  listCard: { borderRadius: radius.lg, paddingHorizontal: 16 },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  listIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  // Transactions
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10, gap: 14,
  },
  txIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },

  // Empty tx state
  emptyTxCard: {
    alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24,
    borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, marginTop: 10,
  },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  emptyButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: radius.full, marginTop: 24, gap: 8,
  },
});
