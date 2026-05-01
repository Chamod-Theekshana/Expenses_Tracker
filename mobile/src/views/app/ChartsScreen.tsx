import React, { useContext, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Pressable } from 'react-native';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import AppText from '../../components/AppText';
import { spacing, radius } from '../../theme/colors';
import { TransactionsContext } from '../../store/transactions';
import { DateFilterContext } from '../../store/dateFilter';
import { formatMoney } from '../../utils/money';
import { scaleHeight } from '../../constants/size';
import { ThemeContext } from '../../store/theme';
import { ProfileContext } from '../../store/profile';
import Icon from '../../components/Icon';
import DateFilterSheet from '../../components/DateFilterSheet';

const { width } = Dimensions.get('window');

export default function ChartsScreen() {
  const { items } = useContext(TransactionsContext);
  const { colors, theme } = useContext(ThemeContext);
  const { matchesFilter, hasActiveFilter } = useContext(DateFilterContext);
  const { currency: preferredCurrency } = useContext(ProfileContext);

  const [isDateFilterVisible, setIsDateFilterVisible] = useState(false);

  // Apply global date filter
  const filteredItems = useMemo(
    () => items.filter(t => matchesFilter(t.dateISO)),
    [items, matchesFilter],
  );

  const chartColors = ['#6C5CE7', '#2ED573', '#00D9FF', '#FF6B6B', '#FFAA00'];

  const categoryData = useMemo(() => {
    const expenses = filteredItems.filter(t => t.amount < 0);
    const categories: Record<string, number> = {};

    expenses.forEach(t => {
      const splitRows = (t.splits || []).filter(split => Number(split.amount) < 0);

      if (splitRows.length > 0) {
        splitRows.forEach((split) => {
          const cat = split.category || 'Other';
          categories[cat] = (categories[cat] || 0) + Math.abs(Number(split.amount));
        });
        return;
      }

      const cat = t.category || 'Other';
      categories[cat] = (categories[cat] || 0) + Math.abs(t.amount);
    });

    const total = Object.values(categories).reduce((a, b) => a + b, 0);

    return Object.entries(categories)
      .map(([name, value], index) => ({
        name,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
        color: chartColors[index % chartColors.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredItems]);

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; income: number; expense: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' });
      months.push({ key, label, income: 0, expense: 0 });
    }

    const byKey: Record<string, { income: number; expense: number }> = {};
    months.forEach(m => (byKey[m.key] = { income: 0, expense: 0 }));

    filteredItems.forEach(t => {
      const date = new Date(t.dateISO);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!byKey[key]) return; // outside last 6 months

      if (t.amount > 0) byKey[key].income += t.amount;
      if (t.amount < 0) byKey[key].expense += Math.abs(t.amount);
    });

    // Formatting for BarChart (react-native-gifted-charts)
    const barData: any[] = [];
    months.forEach(m => {
      const data = byKey[m.key];
      barData.push(
        {
          value: data.income,
          frontColor: colors.success,
          spacing: 8,
          label: m.label,
          labelWidth: 46,
          labelTextStyle: { color: colors.muted, fontSize: 11, textAlign: 'center' },
        },
        { value: data.expense, frontColor: colors.danger }
      );
    });
    return barData;
  }, [filteredItems, colors]);

  const monthlyGroupCount = Math.ceil(monthlyData.length / 2);
  const monthlyChartWidth = Math.max(width - 100, monthlyGroupCount * 84);

  const cardShadow = theme === 'light' ? styles.cardShadowLight : {};

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <AppText title style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>
          Analytics
        </AppText>
        <Pressable onPress={() => setIsDateFilterVisible(true)} style={[styles.dateFilterBtn, { backgroundColor: colors.surface2 }]}>
          <Icon name="calendar" size={18} color={hasActiveFilter ? colors.accent : colors.text} />
          {hasActiveFilter && <View style={[styles.activeFilterDot, { backgroundColor: colors.accent }]} />}
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: scaleHeight(160) }}>
        
        {/* Expense by Category */}
        <View style={[styles.card, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText style={{ fontWeight: '700', fontSize: 16, marginBottom: 24, color: colors.text }}>
            Expense by Category
          </AppText>
          
          <View style={{ alignItems: 'center', justifyContent: 'center', height: 250 }}>
            {categoryData.length > 0 ? (
              <PieChart
                donut
                data={categoryData}
                radius={130}
                innerRadius={80}
                backgroundColor={colors.surface}
                centerLabelComponent={() => {
                  const totalExp = categoryData.reduce((acc, curr) => acc + curr.value, 0);
                  return (
                    <View style={{justifyContent: 'center', alignItems: 'center'}}>
                      <AppText style={{fontSize: 22, color: colors.text, fontWeight: 'bold'}}>{formatMoney(totalExp, preferredCurrency)}</AppText>
                      <AppText style={{fontSize: 12, color: colors.muted}}>Total</AppText>
                    </View>
                  );
                }}
              />
            ) : (
              <AppText style={{ color: colors.muted }}>No expense data for this period</AppText>
            )}
          </View>

          <View style={{ marginTop: 24 }}>
            {categoryData.map((item, index) => (
              <View key={index} style={[styles.categoryRow, { borderBottomColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                  <AppText style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>{item.name}</AppText>
                </View>
                <AppText style={{ fontWeight: '700', fontSize: 14, color: colors.text }}>{formatMoney(item.value, preferredCurrency)}</AppText>
                <AppText style={{ fontSize: 12, width: 50, textAlign: 'right', color: colors.danger, fontWeight: '700' }}>
                  {item.percentage.toFixed(1)}%
                </AppText>
              </View>
            ))}
          </View>
        </View>

        {/* Monthly Overview */}
        <View style={[styles.card, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 24 }]}>
          <AppText style={{ fontWeight: '700', fontSize: 16, marginBottom: 24, color: colors.text }}>
            Monthly Overview
          </AppText>
          
          <View style={{ marginLeft: -20 }}>
            {monthlyData.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing.md }}>
                <BarChart
                  data={monthlyData}
                  width={monthlyChartWidth}
                  height={200}
                  barWidth={12}
                  spacing={20}
                  roundedTop
                  xAxisThickness={1}
                  yAxisThickness={0}
                  xAxisColor={colors.border}
                  xAxisTextNumberOfLines={1}
                  xAxisLabelsHeight={20}
                  yAxisTextStyle={{ color: colors.muted, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: colors.muted, fontSize: 11 }}
                  hideRules
                  noOfSections={4}
                />
              </ScrollView>
            ) : null}
          </View>
          
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
              <AppText style={{ fontSize: 12, color: colors.muted }}>Income</AppText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
              <AppText style={{ fontSize: 12, color: colors.muted }}>Expense</AppText>
            </View>
          </View>
        </View>

      </ScrollView>
      
      <DateFilterSheet visible={isDateFilterVisible} onClose={() => setIsDateFilterVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: scaleHeight(55),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateFilterBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilterDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  card: {
    borderRadius: radius.lg,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardShadowLight: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
