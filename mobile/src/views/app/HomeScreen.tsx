import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, Pressable, Image, ScrollView, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import AppText from '../../components/AppText';
import CircularProgress from '../../components/CircularProgress';
import NotificationsModal from '../../components/NotificationsModal';
import DateFilterSheet from '../../components/DateFilterSheet';
import { spacing, radius } from '../../theme/colors';
import { TransactionsContext } from '../../store/transactions';
import { AuthContext } from '../../store/auth';
import { ProfileContext } from '../../store/profile';
import { DateFilterContext } from '../../store/dateFilter';
import { SidebarContext } from '../../store/sidebar';
import { NotificationsContext } from '../../store/notifications';
import { formatMoney } from '../../utils/money';
import { scaleHeight } from '../../constants/size';
import { ThemeContext } from '../../store/theme';
import Icon from '../../components/Icon';
import { getCategoryMeta } from '../../constants/categories';
import { BudgetService, BudgetStatus } from '../../services/BudgetService';
import { ExchangeRateService } from '../../services/ExchangeRateService';
import { ReminderItem, ReminderService } from '../../services/ReminderService';
import { GoalService, Goal } from '../../services/GoalService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── "Due in X days" helper ─────────────────────────────────────
function getDueLabel(nextRunISO: string): { label: string; isOverdue: boolean; isToday: boolean; isFuture: boolean } {
  const now = new Date();
  const due = new Date(nextRunISO);
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffMs = dueMidnight.getTime() - todayMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: `Overdue by ${Math.abs(diffDays)}d`, isOverdue: true, isToday: false, isFuture: false };
  if (diffDays === 0) return { label: 'Due today', isOverdue: false, isToday: true, isFuture: false };
  if (diffDays === 1) return { label: 'Due tomorrow', isOverdue: false, isToday: false, isFuture: true };
  if (diffDays <= 7) return { label: `Due in ${diffDays} days`, isOverdue: false, isToday: false, isFuture: true };
  return {
    label: `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    isOverdue: false,
    isToday: false,
    isFuture: true,
  };
}

const PagingDots = ({
  colors,
  count,
  activeIndex,
}: {
  colors: any;
  count: number;
  activeIndex: number;
}) => {
  if (!count || count <= 1) return null;
  const safeActive = Math.max(0, Math.min(activeIndex, count - 1));
  return (
    <View style={styles.pagerWrap}>
      {Array.from({ length: count }).map((_, idx) => {
        const isActive = idx === safeActive;
        return (
          <View
            key={idx}
            style={[
              styles.pagerDot,
              {
                backgroundColor: isActive ? colors.accent : colors.accent + '50',
                width: isActive ? 24 : 6,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

export default function HomeScreen({ navigation }: any) {
  const { items } = useContext(TransactionsContext);
  const { userEmail } = useContext(AuthContext);
  const { name, profilePhoto, currency: preferredCurrency } = useContext(ProfileContext);
  const { colors, theme } = useContext(ThemeContext);
  const { matchesFilter, year, month, day, filterLabel, hasActiveFilter } = useContext(DateFilterContext);
  const { openSidebar } = useContext(SidebarContext);
  const { unreadCount } = useContext(NotificationsContext);

  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [upcomingBills, setUpcomingBills] = useState<ReminderItem[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const [isNotificationsVisible, setIsNotificationsVisible] = useState(false);
  const [isDateFilterVisible, setIsDateFilterVisible] = useState(false);

  const [budgetPage, setBudgetPage] = useState(0);
  const [goalsPage, setGoalsPage] = useState(0);

  const lastFetchKey = useRef<string>('');

  useEffect(() => {
    setBudgetPage(0);
  }, [budgets.length]);

  useEffect(() => {
    setGoalsPage(0);
  }, [goals.length]);

  useEffect(() => {
    (async () => {
      try {
        const r = await ExchangeRateService.getRates(preferredCurrency);
        setRates(r && typeof r === 'object' ? r : {});
      } catch { /* fallback */ }
    })();
  }, [preferredCurrency]);

  const fetchRemote = useCallback(async () => {
    const fetchKey = `${year ?? 'all'}-${month ?? 'all'}`;
    if (lastFetchKey.current === fetchKey) return;
    lastFetchKey.current = fetchKey;

    const budgetYear = year ?? undefined;
    const budgetMonth = month ?? undefined;

    try {
      const statuses = await BudgetService.getStatus(
        budgetMonth ? budgetYear : undefined,
        budgetMonth ?? undefined,
        undefined,
      );
      setBudgets(statuses);
    } catch { /* keep previous */ }

    try {
      const reminders = await ReminderService.list();
      const active = reminders
        .filter((r) => r.is_active)
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 4);
      setUpcomingBills(active);
    } catch { /* keep previous */ }

    try {
      const allGoals = await GoalService.list();
      setGoals(allGoals.filter(g => !g.is_completed));
    } catch { /* keep previous */ }
  }, [year, month]);

  useFocusEffect(useCallback(() => {
    lastFetchKey.current = '';
    fetchRemote();
  }, [fetchRemote]));

  const filteredItems = useMemo(
    () => items.filter(t => matchesFilter(t.dateISO)),
    [items, matchesFilter],
  );

  const convertAmount = useCallback((amount: number, txCurrency: string): number => {
    if (!txCurrency || txCurrency === preferredCurrency) return amount;
    if (!rates || Object.keys(rates).length === 0) return amount;
    const rateToTx = rates[txCurrency.toUpperCase()];
    if (!rateToTx || rateToTx === 0) return amount;
    return Math.round((amount / rateToTx) * 100) / 100;
  }, [rates, preferredCurrency]);

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

  const CARD_CHART_WIDTH = SCREEN_WIDTH - 40;
  const H_CARD_WIDTH = 190;
  const H_CARD_GAP = 16;
  const H_SNAP_INTERVAL = H_CARD_WIDTH + H_CARD_GAP;

  const chartData = useMemo(() => {
    if (filteredItems.length === 0) {
      return [{ value: 0, label: '' }, { value: 0, label: '' }];
    }

    const sorted = [...filteredItems].sort(
      (a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime(),
    );

    let running = 0;
    let lastLabel = '';

    let points: { value: number; label: string; dateISO: string }[] = sorted.map(t => {
      running += t.amount;
      const date = new Date(t.dateISO);
      let rawLabel = '';

      // Label strategy:
      // - All time / Yearly (year only): show month labels (Jan/Feb/...)
      // - Monthly (year+month): show day labels (01/02/...)
      // - Daily (year+month+day): show hour labels (09 AM / 10 AM ...)
      if (year !== null && month !== null && day !== null) {
        rawLabel = date.toLocaleTimeString('en-US', { hour: '2-digit' });
      } else if (year !== null && month !== null) {
        rawLabel = String(date.getDate()).padStart(2, '0');
      } else {
        rawLabel = date.toLocaleDateString('en-US', { month: 'short' });
      }

      // Only show label when it changes to avoid duplicates
      const showLabel = rawLabel !== lastLabel ? rawLabel : '';
      if (showLabel) lastLabel = rawLabel;
      return { value: running, label: showLabel, dateISO: t.dateISO };
    });

    if (points.length > 20) {
      const step = Math.ceil(points.length / 20);
      points = points.filter((_, idx) => idx % step === 0 || idx === points.length - 1);
    }

    if (points.length === 1) {
      points = [{ value: 0, label: '', dateISO: points[0].dateISO }, ...points];
    }

    const minVal = Math.min(...points.map(p => p.value));
    const offset = minVal < 0 ? Math.abs(minVal) : 0;

    return points.map(p => ({ ...p, value: p.value + offset }));
  }, [filteredItems, year, month, day]);

  const recent = useMemo(
    () =>
      [...filteredItems]
        .sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime())
        .slice(0, 4), // 4 items to match screenshot visually
    [filteredItems],
  );

  const topCategories = useMemo(() => {
    const totals: Record<string, number> = {};
    let totalExpense = 0;
    filteredItems
      .filter(t => t.amount < 0)
      .forEach(t => {
        const txCurrency = t.currency || preferredCurrency;
        const splitRows = (t.splits || []).filter(split => Number(split.amount) < 0);

        if (splitRows.length > 0) {
          splitRows.forEach((split) => {
            const cat = split.category || 'Other';
            const converted = convertAmount(Math.abs(Number(split.amount)), txCurrency);
            totals[cat] = (totals[cat] || 0) + converted;
            totalExpense += converted;
          });
          return;
        }

        const cat = t.category || 'Other';
        const converted = convertAmount(Math.abs(t.amount), txCurrency);
        totals[cat] = (totals[cat] || 0) + converted;
        totalExpense += converted;
      });

    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      }));
  }, [filteredItems, preferredCurrency, convertAmount]);

  const { greetingText, greetingEmoji } = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return { greetingText: 'Good Morning', greetingEmoji: '' };
    if (h < 18) return { greetingText: 'Good Afternoon', greetingEmoji: '' };
    return { greetingText: 'Good Evening', greetingEmoji: '!' };
  }, []);

  const displayDateLine = filterLabel || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

  return (
    <View style={[styles.mainWrap, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent]}
      >
        {/* ── 1 + 2. Header & Balance ── */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerLeftChild}>
              <View style={styles.headerRow}>
                <Pressable onPress={openSidebar} style={styles.avatarWrap}>
                  {profilePhoto ? (
                    <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
                  ) : (
                    <View style={[styles.profilePlaceholder, { backgroundColor: colors.surface2 }]}>
                      <AppText style={[styles.profileInitial, { color: colors.text }]}>
                        {(name || userEmail || 'U').charAt(0).toUpperCase()}
                      </AppText>
                    </View>
                  )}
                </Pressable>
                <View style={styles.headerInfo}>
                  <AppText style={[styles.greeting, { color: colors.text }]}>
                    {greetingText}{greetingEmoji}
                  </AppText>
                  <AppText style={[styles.email, { color: colors.muted }]}>{name || userEmail}</AppText>
                </View>
              </View>
            </View>
            <Pressable
              onPress={() => setIsNotificationsVisible(true)}
              style={[styles.iconButton, { backgroundColor: colors.surface }, theme === 'light' && styles.cardShadowLight]}
            >
              <Icon name="bell" size={24} color={colors.text} />
              {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                  <AppText style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</AppText>
                </View>
              )}
            </Pressable>
          </View>

          <View style={styles.headerBottomRow}>
            <View style={styles.headerLeftChild}>
              <View style={styles.balanceTop}>
                <AppText style={[styles.balanceTitle, { color: colors.text }]}>Total Balance</AppText>
                <AppText style={[styles.balanceSub, { color: colors.muted }]}>Amount as of {displayDateLine}</AppText>
                <AppText style={[styles.balanceAmount, { color: colors.text }]}>
                  {formatMoney(stats.balance, preferredCurrency)}
                </AppText>
              </View>
            </View>
            <Pressable
              onPress={() => setIsDateFilterVisible(true)}
              style={[styles.iconButton, { backgroundColor: colors.surface, marginTop: 4 }, theme === 'light' && styles.cardShadowLight]}
            >
              <Icon name="calendar" size={24} color={colors.accent} />
              {hasActiveFilter && <View style={[styles.activeFilterDot, { backgroundColor: colors.accent }]} />}
            </Pressable>
          </View>
        </View>

        {/* ── Chart Directly on BG ── */}
        <View style={styles.chartWrap}>
          <LineChart
            data={chartData}
            width={CARD_CHART_WIDTH}
            height={180}
            color={colors.accent}
            thickness={2}
            hideDataPoints={true}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={colors.accent + '30'}
            xAxisType="solid"
            rulesColor={colors.border}
            rulesType="solid"
            noOfSections={5}
            yAxisLabelWidth={0}
            hideYAxisText={true}
            xAxisTextNumberOfLines={1}
            xAxisLabelsHeight={28}
            xAxisLabelsVerticalShift={-2}
            xAxisLabelTextStyle={{ color: colors.muted, fontSize: 11, marginTop: 6, textAlign: 'center' }}
            areaChart
            startFillColor={colors.accent}
            endFillColor={colors.accent}
            startOpacity={0.15}
            endOpacity={0.0}
            initialSpacing={16}
            endSpacing={16}
            spacing={
              chartData.length > 1
                ? (CARD_CHART_WIDTH) / Math.max(chartData.length - 1, 1)
                : CARD_CHART_WIDTH
            }
            adjustToWidth={true}
            pointerConfig={{
              pointerStripColor: colors.border,
              pointerStripWidth: 1,
              pointerColor: colors.accent,
              pointerComponent: () => (
                <View style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: colors.surface,
                  borderWidth: 3,
                  borderColor: colors.accent,
                }} />
              ),
              radius: 6,
              pointerLabelWidth: 110,
              pointerLabelHeight: 50,
              autoAdjustPointerLabelPosition: true,
              pointerLabelComponent: (items: any) => {
                const d = items[0].dateISO
                  ? new Date(items[0].dateISO).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                  : displayDateLine;
                const minVal = Math.min(...chartData.map((p: any) => p.value));
                const realVal = items[0].value - minVal;
                return (
                  <View style={styles.tooltipContainer}>
                    <View style={[styles.tooltipCard, { backgroundColor: colors.surface }]}>
                      <AppText style={{ fontWeight: '700', fontSize: 13, color: colors.text }}>
                        {formatMoney(realVal, preferredCurrency)}
                      </AppText>
                      <AppText style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{d}</AppText>
                    </View>
                    <View style={[styles.tooltipArrow, { borderTopColor: colors.surface }]} />
                  </View>
                );
              },
            }}
          />
        </View>

        {/* ── Earnings & Spendings Cards ── */}
        <View style={styles.earningsSpendingsRow}>
          <View style={[styles.esCard, { backgroundColor: colors.surface }, theme === 'light' && styles.cardShadowLight]}>
            <View style={styles.esHeader}>
              <AppText style={[styles.esLabel, { color: colors.text }]}>Earnings</AppText>
              <View style={[styles.esIconTop, { backgroundColor: 'rgba(46,213,115,0.1)' }]}>
                <Icon name="trending-up" size={14} color={colors.success} />
              </View>
            </View>
            <AppText style={[styles.esAmount, { color: colors.text }]}>
              {formatMoney(stats.income, preferredCurrency)}
            </AppText>
            <View style={styles.esFooter}>
              <View style={[styles.esIconCir, { backgroundColor: colors.success }]}>
                <Icon name="arrow-up" size={10} color="#FFF" />
              </View>
              <AppText style={[styles.esSub, { color: colors.muted }]}>
                {filteredItems.filter(t => t.amount > 0).length} income entries
              </AppText>
            </View>
          </View>

          <View style={[styles.esCard, { backgroundColor: colors.surface }, theme === 'light' && styles.cardShadowLight]}>
            <View style={styles.esHeader}>
              <AppText style={[styles.esLabel, { color: colors.text }]}>Spendings</AppText>
              <View style={[styles.esIconTop, { backgroundColor: 'rgba(255,107,107,0.1)' }]}>
                <Icon name="trending-down" size={14} color={colors.danger} />
              </View>
            </View>
            <AppText style={[styles.esAmount, { color: colors.text }]}>
              {formatMoney(stats.expense, preferredCurrency)}
            </AppText>
            <View style={styles.esFooter}>
              <View style={[styles.esIconCir, { backgroundColor: colors.danger }]}>
                <Icon name="arrow-down" size={10} color="#FFF" />
              </View>
              <AppText style={[styles.esSub, { color: colors.muted }]}>
                {filteredItems.filter(t => t.amount < 0).length} expense entries
              </AppText>
            </View>
          </View>
        </View>

        {/* ── 3. Top Spending Categories ── */}
        {topCategories.length > 0 && (
          <View style={styles.sectionWrap}>
            <View style={[styles.cardWrap, { backgroundColor: colors.surface }, theme === 'light' && styles.cardShadowLight]}>
              <AppText style={[styles.sectionTitle, { color: colors.text }]}>Top Spending Categories</AppText>
              <AppText style={[styles.sectionSub, { color: colors.muted }]}>Highest categories as per {displayDateLine}</AppText>

              <View style={styles.categoryList}>
                {topCategories.map((cat, idx) => {
                  const isLast = idx === topCategories.length - 1;
                  return (
                    <View key={cat.name} style={[
                      styles.categoryRow,
                      !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }
                    ]}>
                      <AppText style={[styles.categoryName, { color: colors.text }]}>{cat.name}</AppText>
                      <AppText style={[styles.categoryAmount, { color: colors.text }]}>
                        {formatMoney(cat.amount, preferredCurrency)}
                      </AppText>
                      <AppText style={[styles.categoryPct, { color: colors.danger }]}>{cat.percentage}%</AppText>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* ── 4. Budget Overview ── */}
        <View style={styles.sectionHeader}>
          <View>
            <AppText style={[styles.sectionTitle, { color: colors.text }]}>Budget Overview</AppText>
            <AppText style={[styles.sectionSub, { color: colors.muted }]}>Budget Overview by Category</AppText>
          </View>
          <Pressable onPress={() => navigation.getParent()?.navigate('Budgets')}>
            <AppText style={[styles.manageLink, { color: colors.accent }]}>Manage &gt;</AppText>
          </Pressable>
        </View>

        {budgets.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
              snapToInterval={H_SNAP_INTERVAL}
              decelerationRate="fast"
              scrollEventThrottle={16}
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x || 0;
                const next = Math.round(x / H_SNAP_INTERVAL);
                setBudgetPage(next);
              }}
            >
              {budgets.map(b => {
                const remaining = b.amount - b.spent;
                const remainingPct = b.percentage >= 100 ? 0 : 100 - b.percentage;
                const isOver = b.percentage >= 100;
                const ringColor = isOver ? colors.danger : colors.accent;

                return (
                  <View
                    key={b.id}
                    style={[styles.budgetCard, { backgroundColor: colors.surface }, theme === 'light' && styles.cardShadowLight]}
                  >
                    <AppText style={[styles.budgetCatName, { color: colors.text }]} numberOfLines={1}>{b.category}</AppText>
                    <View style={styles.budgetRingWrap}>
                      <CircularProgress
                        percentage={remainingPct}
                        size={110}
                        strokeWidth={16}
                        trackColor={colors.surface2}
                        progressColor={ringColor}
                      />
                      <View style={styles.budgetRingTextAbs}>
                        <AppText style={[styles.budgetRingPct, { color: colors.text }]}>{Math.round(remainingPct)}%</AppText>
                        <AppText style={[styles.budgetRingSub, { color: colors.text }]}>remaining</AppText>
                      </View>
                    </View>
                    <View style={styles.budgetDetails}>
                      <AppText style={[styles.budgetDetailText, { color: colors.muted }]}>
                        {formatMoney(remaining > 0 ? remaining : 0, b.currency)} remaining
                      </AppText>
                      <AppText style={[styles.budgetDetailText, { color: colors.muted }]}>
                        {formatMoney(b.spent, b.currency)} spent
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <PagingDots colors={colors} count={Math.min(budgets.length, 6)} activeIndex={budgetPage} />
          </View>
        ) : (
          <View style={[styles.cardWrap, { backgroundColor: colors.surface, alignItems: 'center', padding: 20 }]}>
            <AppText style={{ color: colors.muted, fontSize: 14 }}>No budgets configured</AppText>
          </View>
        )}

        {/* ── 5. Savings Goals ── */}
        <View style={[styles.sectionHeader, { marginTop: 10 }]}>
          <View>
            <AppText style={[styles.sectionTitle, { color: colors.text }]}>Savings Goals</AppText>
            <AppText style={[styles.sectionSub, { color: colors.muted }]}>Savings Goals Categorization</AppText>
          </View>
          <Pressable onPress={() => navigation.getParent()?.navigate('Goals')}>
            <AppText style={[styles.manageLink, { color: colors.accent }]}>Manage &gt;</AppText>
          </Pressable>
        </View>

        {goals.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
              snapToInterval={H_SNAP_INTERVAL}
              decelerationRate="fast"
              scrollEventThrottle={16}
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x || 0;
                const next = Math.round(x / H_SNAP_INTERVAL);
                setGoalsPage(next);
              }}
            >
              {goals.map(g => {
                const pct = Math.min(g.progress_percentage || 0, 100);
                const remaining = g.target_amount - g.current_amount;

                return (
                  <View
                    key={g.id}
                    style={[styles.budgetCard, { backgroundColor: colors.surface }, theme === 'light' && styles.cardShadowLight]}
                  >
                    <AppText style={[styles.budgetCatName, { color: colors.text }]} numberOfLines={1}>{g.name}</AppText>
                    <View style={styles.budgetRingWrap}>
                      <CircularProgress
                        percentage={pct > 0 ? (100 - pct) : 100}
                        size={110}
                        strokeWidth={16}
                        trackColor={colors.surface2}
                        progressColor={colors.accent}
                      />
                      <View style={styles.budgetRingTextAbs}>
                        <AppText style={[styles.budgetRingPct, { color: colors.text }]}>{Math.round(100 - pct)}%</AppText>
                        <AppText style={[styles.budgetRingSub, { color: colors.text }]}>remaining</AppText>
                      </View>
                    </View>
                    <View style={styles.budgetDetails}>
                      <AppText style={[styles.budgetDetailText, { color: colors.muted }]}>
                        {formatMoney(remaining > 0 ? remaining : 0, g.currency)} remaining
                      </AppText>
                      <AppText style={[styles.budgetDetailText, { color: colors.muted }]}>
                        {formatMoney(g.current_amount, g.currency)} spent
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <PagingDots colors={colors} count={Math.min(goals.length, 6)} activeIndex={goalsPage} />
          </View>
        ) : (
          <View style={[styles.cardWrap, { backgroundColor: colors.surface, alignItems: 'center', padding: 20 }]}>
            <AppText style={{ color: colors.muted, fontSize: 14 }}>No active goals</AppText>
          </View>
        )}

        {/* ── 6. Upcoming Bills ── */}
        <View style={[styles.sectionHeader, { marginTop: 10 }]}>
          <View>
            <AppText style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Bills</AppText>
            <AppText style={[styles.sectionSub, { color: colors.muted }]}>Bills with active reminders</AppText>
          </View>
          <Pressable onPress={() => navigation.getParent()?.navigate('Reminders')} style={{ alignSelf: 'center' }}>
            <AppText style={[styles.manageLink, { color: colors.accent }]}>View All &gt;</AppText>
          </Pressable>
        </View>

        {upcomingBills.length > 0 ? (
          <View style={{ gap: 12 }}>
            {upcomingBills.map((bill) => {
              const catMeta = getCategoryMeta(bill.category);
              const { label: dueLabel, isOverdue, isToday } = getDueLabel(bill.due_date);
              const dueColor = isOverdue ? colors.danger : isToday ? colors.warning : colors.muted;

              return (
                <View key={bill.id} style={[styles.txCard, { backgroundColor: colors.surface }, theme === 'light' && styles.cardShadowLight]}>
                  <View style={[styles.txIcon, { backgroundColor: colors.accent + '15' }]}>
                    <Icon name={catMeta.icon} size={20} color={colors.accent} />
                  </View>
                  <View style={styles.txInfo}>
                    <AppText style={[styles.txName, { color: colors.text }]}>{bill.title}</AppText>
                    <AppText style={[styles.txSub, { color: dueColor }]}>
                      {dueLabel}
                    </AppText>
                  </View>
                  <View style={styles.txAmountRow}>
                    <AppText style={[styles.txAmount, { color: colors.text }]}>
                      Rs {formatMoney(Math.abs(bill.amount), '')}
                    </AppText>
                    <Icon name="trending-down" size={16} color={colors.danger} />
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.cardWrap, { backgroundColor: colors.surface, alignItems: 'center', padding: 20 }]}>
            <AppText style={{ color: colors.muted, fontSize: 14 }}>No upcoming bills</AppText>
          </View>
        )}

        {/* ── 7. Recent Transactions ── */}
        <View style={styles.sectionHeader}>
          <View>
            <AppText style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</AppText>
            <AppText style={[styles.sectionSub, { color: colors.muted }]}>Your Recent Earnings & Spendings</AppText>
          </View>
          <Pressable onPress={() => navigation.navigate('Transactions')} style={{ alignSelf: 'center' }}>
            <AppText style={[styles.manageLink, { color: colors.accent }]}>View All &gt;</AppText>
          </Pressable>
        </View>

        {recent.length > 0 ? (
          <View style={{ gap: 12 }}>
            {recent.map((item) => {
              const isIncome = item.amount > 0;
              const catMeta = getCategoryMeta(item.category);
              const dateObj = new Date(item.dateISO);
              const now = new Date();
              const isToday = now.toDateString() === dateObj.toDateString();
              const isYesterday = new Date(Date.now() - 86400000).toDateString() === dateObj.toDateString();
              const dayLabel = isToday ? 'Today' : isYesterday ? 'Yesterday' : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toUpperCase();

              return (
                <View key={item.id} style={[styles.txCard, { backgroundColor: colors.surface }, theme === 'light' && styles.cardShadowLight]}>
                  <View style={[styles.txIcon, { backgroundColor: colors.accent + '15' }]}>
                    <Icon name={catMeta.icon} size={20} color={colors.accent} />
                  </View>
                  <View style={styles.txInfo}>
                    <AppText style={[styles.txName, { color: colors.text }]}>{item.title}</AppText>
                    <AppText style={[styles.txSub, { color: colors.muted }]}>
                      {dayLabel}, {timeStr}
                    </AppText>
                  </View>
                  <View style={styles.txAmountRow}>
                    <AppText style={[styles.txAmount, { color: colors.text }]}>
                      {isIncome ? '' : ''}Rs {formatMoney(Math.abs(item.amount), '')}
                    </AppText>
                    <Icon name={isIncome ? "trending-up" : "trending-down"} size={16} color={isIncome ? colors.success : colors.danger} />
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.cardWrap, { backgroundColor: colors.surface, alignItems: 'center', padding: 20 }]}>
            <AppText style={{ color: colors.muted, fontSize: 14 }}>No transactions yet</AppText>
          </View>
        )}

        <View style={{ height: scaleHeight(60) }} />
      </ScrollView>

      {/* Modals */}
      <NotificationsModal visible={isNotificationsVisible} onClose={() => setIsNotificationsVisible(false)} />
      <DateFilterSheet visible={isDateFilterVisible} onClose={() => setIsDateFilterVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrap: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: scaleHeight(55),
    paddingBottom: scaleHeight(100),
  },
  cardShadowLight: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },

  // ── Header Layout ───────────────────────────────────────────
  headerContainer: {
    marginBottom: 16,
    gap: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeftChild: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: { marginRight: 12 },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  profilePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerInfo: { flex: 1 },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  activeFilterDot: {
    position: 'absolute',
    bottom: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Balance
  balanceTop: { marginBottom: 4 },
  balanceTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  balanceSub: {
    fontSize: 12,
    marginTop: 2,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: 8,
    paddingVertical: 4,
  },

  // Chart
  chartWrap: {
    marginTop: 10,
    marginBottom:10,
    // The LineChart renders X-axis labels below the chart area.
    // If this wrapper has a fixed height equal to the chart height, labels get clipped.
    minHeight: 100,
  },
  tooltipContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginLeft: -10,
    marginTop: -30,
  },
  tooltipCard: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'flex-start',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tooltipArrow: {
    marginTop: -1,
    marginLeft: 16,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },

  // Earnings & Spendings Cards
  earningsSpendingsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  esCard: {
    flex: 1,
    padding: 16,
    borderRadius: radius.lg,
  },
  esHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  esLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  esIconTop: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  esAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  esFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  esIconCir: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  esSub: {
    fontSize: 12,
  },

  // Section Defaults
  sectionWrap: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSub: {
    fontSize: 13,
    marginTop: 4,
  },
  manageLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardWrap: {
    borderRadius: radius.lg,
    padding: 16,
  },

  // Category List
  categoryList: {
    marginTop: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  categoryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: '500',
    marginRight: 16,
  },
  categoryPct: {
    fontSize: 15,
    fontWeight: '700',
    width: 40,
    textAlign: 'right',
  },

  // Horizontal Scrollers (Budgets / Goals)
  hScroll: {
    paddingRight: 20,
    gap: 16,
  },
  budgetCard: {
    width: 190,
    padding: 20,
    borderRadius: radius.xl,
    alignItems: 'center',
    marginVertical:5,
    marginLeft:5
  },
  budgetCatName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  budgetRingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  budgetRingTextAbs: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetRingPct: {
    fontSize: 24,
    fontWeight: '800',
  },
  budgetRingSub: {
    fontSize: 12,
    fontWeight: '600',
  },
  budgetDetails: {
    alignItems: 'center',
    gap: 4,
  },
  budgetDetailText: {
    fontSize: 12,
  },

  // Paging Dots
  pagerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  pagerDot: {
    height: 6,
    width: 6,
    borderRadius: 3,
  },

  // Transaction Lists
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: radius.xl,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  txInfo: {
    flex: 1,
  },
  txName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  txSub: {
    fontSize: 13,
  },
  txAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
});