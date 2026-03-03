import React, { useContext, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import { spacing, radius } from '../../theme/colors';
import { TransactionsContext } from '../../store/transactions';
import { DateFilterContext } from '../../store/dateFilter';
import { formatMoney } from '../../utils/money';
import { scaleHeight } from '../../constants/size';
import { ThemeContext } from '../../store/theme';
import { ProfileContext } from '../../store/profile';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function ChartsScreen() {
  const { items } = useContext(TransactionsContext);
  const { colors } = useContext(ThemeContext);
  const { matchesFilter, filterLabel, hasActiveFilter } = useContext(DateFilterContext);
  const { currency: preferredCurrency } = useContext(ProfileContext);

  // Apply global date filter
  const filteredItems = useMemo(
    () => items.filter(t => matchesFilter(t.dateISO)),
    [items, matchesFilter],
  );

  const categoryData = useMemo(() => {
    const expenses = filteredItems.filter(t => t.amount < 0);
    const categories: Record<string, number> = {};

    expenses.forEach(t => {
      const cat = t.category || 'Other';
      categories[cat] = (categories[cat] || 0) + Math.abs(t.amount);
    });

    const total = Object.values(categories).reduce((a, b) => a + b, 0);

    return Object.entries(categories)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredItems]);

  const monthlyData = useMemo(() => {
    // Build last 6 months (including current month) from real transactions
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

    return months.map(m => ({
      month: m.label,
      income: byKey[m.key].income,
      expense: byKey[m.key].expense,
    }));
  }, [filteredItems]);

  const chartColors = ['#6C5CE7', '#2ED573', '#00D9FF', '#FF6B6B', '#FFAA00'];

  const renderPieChart = () => {
    const size = width - 80;
    const center = size / 2;
    const r = size / 2 - 20;
    let currentAngle = -90;

    if (categoryData.length === 0) {
      return (
        <View style={{ height: size, justifyContent: 'center', alignItems: 'center' }}>
          <AppText muted>No expense data</AppText>
        </View>
      );
    }

    return (
      <Svg width={size} height={size}>
        {categoryData.map((item, index) => {
          const angle = (item.percentage / 100) * 360;
          const startAngle = currentAngle;

          currentAngle += angle;

          return (
            <Circle
              key={index}
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke={chartColors[index % chartColors.length]}
              strokeWidth={40}
              strokeDasharray={`${(item.percentage / 100) * (2 * Math.PI * r)} ${2 * Math.PI * r}`}
              strokeDashoffset={-((startAngle + 90) / 360) * (2 * Math.PI * r)}
            />
          );
        })}
      </Svg>
    );
  };

  const renderBarChart = () => {
    const chartHeight = 200;
    const chartWidth = width - 80;
    const barWidth = (chartWidth / monthlyData.length) / 2.5;
    const maxValue = Math.max(1, ...monthlyData.flatMap(d => [d.income, d.expense]));

    return (
      <View>
        <Svg width={chartWidth} height={chartHeight}>
          {monthlyData.map((data, index) => {
            const x = (index * chartWidth) / monthlyData.length + 10;
            const incomeHeight = (data.income / maxValue) * (chartHeight - 40);
            const expenseHeight = (data.expense / maxValue) * (chartHeight - 40);

            return (
              <React.Fragment key={index}>
                <Rect
                  x={x}
                  y={chartHeight - incomeHeight - 20}
                  width={barWidth}
                  height={incomeHeight}
                  fill={colors.success}
                  rx={4}
                />
                <Rect
                  x={x + barWidth + 4}
                  y={chartHeight - expenseHeight - 20}
                  width={barWidth}
                  height={expenseHeight}
                  fill={colors.danger}
                  rx={4}
                />
                <SvgText
                  x={x + barWidth}
                  y={chartHeight - 5}
                  fill={colors.muted}
                  fontSize="10"
                  textAnchor="middle"
                >
                  {data.month}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
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
    );
  };

  return (
    <ScrollView style={[styles.wrap, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false}>
      <AppText style={styles.title}>Analytics</AppText>

      <Card elevated style={{ marginTop: 20 }}>
        <AppText style={{ fontWeight: '700', fontSize: 16, marginBottom: 20 }}>Expense by Category</AppText>
        {renderPieChart()}
        <View style={{ marginTop: 20 }}>
          {categoryData.map((item, index) => (
            <View key={index} style={[styles.categoryRow, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={[styles.colorDot, { backgroundColor: chartColors[index % chartColors.length] }]} />
                <AppText style={{ fontSize: 14 }}>{item.name}</AppText>
              </View>
              <AppText mono style={{ fontWeight: '700', fontSize: 14 }}>{formatMoney(item.value, preferredCurrency)}</AppText>
              <AppText muted style={{ fontSize: 12, width: 50, textAlign: 'right' }}>
                {item.percentage.toFixed(1)}%
              </AppText>
            </View>
          ))}
        </View>
      </Card>

      <Card elevated style={{ marginTop: 20 }}>
        <AppText style={{ fontWeight: '700', fontSize: 16, marginBottom: 20 }}>Monthly Overview</AppText>
        {renderBarChart()}
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: spacing.lg,
    marginTop: scaleHeight(50),
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
    gap: 20,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
