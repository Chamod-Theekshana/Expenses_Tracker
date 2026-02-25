import React, { useContext, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import { spacing, radius } from '../../theme/colors';
import { TransactionsContext } from '../../store/transactions';
import { formatMoney } from '../../utils/money';
import { scaleHeight } from '../../constants/size';
import { ThemeContext } from '../../store/theme';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function ChartsScreen() {
  const { items } = useContext(TransactionsContext);
  const { colors } = useContext(ThemeContext);

  const categoryData = useMemo(() => {
    const expenses = items.filter(t => t.amount < 0);
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
  }, [items]);

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

    items.forEach(t => {
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
  }, [items]);

  const chartColors = ['#DBFF00', '#4DFF88', '#00D9FF', '#FF4D4D', '#FF9D00'];

  const renderPieChart = () => {
    const size = width - 80;
    const center = size / 2;
    const radius = size / 2 - 20;
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
          const endAngle = currentAngle + angle;
          
          const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
          const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
          const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
          const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);
          
          const largeArc = angle > 180 ? 1 : 0;
          const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
          
          currentAngle += angle;
          
          return (
            <Circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={chartColors[index % chartColors.length]}
              strokeWidth={40}
              strokeDasharray={`${(item.percentage / 100) * (2 * Math.PI * radius)} ${2 * Math.PI * radius}`}
              strokeDashoffset={-((startAngle + 90) / 360) * (2 * Math.PI * radius)}
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
        <AppText style={{ fontWeight: '800', fontSize: 16, marginBottom: 20 }}>Expense by Category</AppText>
        {renderPieChart()}
        <View style={{ marginTop: 20 }}>
          {categoryData.map((item, index) => (
            <View key={index} style={styles.categoryRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={[styles.colorDot, { backgroundColor: chartColors[index % chartColors.length] }]} />
                <AppText style={{ fontSize: 14 }}>{item.name}</AppText>
              </View>
              <AppText mono style={{ fontWeight: '700', fontSize: 14 }}>{formatMoney(item.value)}</AppText>
              <AppText muted style={{ fontSize: 12, width: 50, textAlign: 'right' }}>
                {item.percentage.toFixed(1)}%
              </AppText>
            </View>
          ))}
        </View>
      </Card>

      <Card elevated style={{ marginTop: 20 }}>
        <AppText style={{ fontWeight: '800', fontSize: 16, marginBottom: 20 }}>Monthly Overview</AppText>
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
    fontWeight: '800',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
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
