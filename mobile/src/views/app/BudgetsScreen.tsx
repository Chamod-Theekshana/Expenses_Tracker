import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import { ThemeContext } from '../../store/theme';
import { spacing, radius } from '../../theme/colors';
import { BudgetService, BudgetStatus } from '../../services/BudgetService';
import { CategoryService, Category } from '../../services/CategoryService';
import { formatMoney } from '../../utils/money';
import { scaleHeight } from '../../constants/size';

function ProgressBar({
  percentage,
  colors,
}: {
  percentage: number;
  colors: any;
}) {
  const clampedPct = Math.min(percentage, 100);
  const barColor =
    percentage >= 100
      ? colors.danger
      : percentage >= 80
      ? '#FFAA00'
      : colors.success;

  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.surface2 }]}>      
      <View
        style={[
          styles.progressFill,
          {
            width: `${clampedPct}%`,
            backgroundColor: barColor,
          },
        ]}
      />
    </View>
  );
}

export default function BudgetsScreen({ navigation }: any) {
  const { colors } = useContext(ThemeContext);
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCat, setSelectedCat] = useState('');
  const [amountRaw, setAmountRaw] = useState('');

  const amount = useMemo(() => {
    const n = Number(amountRaw);
    return Number.isFinite(n) ? n : 0;
  }, [amountRaw]);

  const canAdd = selectedCat.length > 0 && amount > 0;

  const load = async () => {
    try {
      setLoading(true);
      const [statuses, cats] = await Promise.all([
        BudgetService.getStatus(),
        CategoryService.list(),
      ]);
      setBudgets(statuses);
      setCategories(cats);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Filter to categories that don't already have a budget
  const availableCategories = useMemo(() => {
    const budgetedCats = new Set(budgets.map((b) => b.category));
    return categories
      .filter((c) => (c.type === 'expense' || c.type === 'both') && !budgetedCats.has(c.name));
  }, [categories, budgets]);

  const createBudget = async () => {
    if (!canAdd) return;
    try {
      setLoading(true);
      await BudgetService.create(selectedCat, amount);
      setSelectedCat('');
      setAmountRaw('');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create budget');
    } finally {
      setLoading(false);
    }
  };

  const deleteBudget = async (id: string, category: string) => {
    Alert.alert('Delete Budget', `Remove budget for ${category}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await BudgetService.remove(id);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to delete budget');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <View style={styles.topRow}>
        <AppText title>Budgets</AppText>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <AppText style={{ color: colors.accent, fontWeight: '800' }}>Close</AppText>
        </Pressable>
      </View>

      {/* Create Budget */}
      <Card>
        <AppText muted style={{ marginBottom: 10, fontSize: 13 }}>
          Set a monthly budget
        </AppText>

        {availableCategories.length > 0 ? (
          <>
            <AppText muted style={{ marginBottom: 8, fontSize: 12 }}>
              Category
            </AppText>
            <View style={styles.catWrap}>
              {availableCategories.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setSelectedCat(c.name)}
                  style={[
                    styles.cat,
                    { backgroundColor: colors.surface2, borderColor: colors.border },
                    selectedCat === c.name && {
                      backgroundColor: colors.accent,
                      borderColor: colors.accent,
                    },
                  ]}
                >
                  <AppText
                    style={{
                      fontWeight: '700',
                      fontSize: 13,
                      color: selectedCat === c.name ? colors.bg : colors.text,
                    }}
                  >
                    {c.name}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <View style={{ height: 14 }} />

            <AppText muted style={{ marginBottom: 8, fontSize: 12 }}>
              Monthly Limit
            </AppText>
            <AppInput
              value={amountRaw}
              onChangeText={setAmountRaw}
              keyboardType="decimal-pad"
              placeholder="e.g., 300"
            />

            <AppButton
              title="Set Budget"
              onPress={createBudget}
              disabled={!canAdd}
              loading={loading}
              style={{ marginTop: 14 }}
            />
          </>
        ) : (
          <AppText muted style={{ fontSize: 13 }}>
            {budgets.length > 0
              ? 'All categories have budgets set.'
              : 'Loading categories…'}
          </AppText>
        )}
      </Card>

      <View style={{ height: 14 }} />

      {/* Budget List */}
      <FlatList
        data={budgets}
        keyExtractor={(i) => i.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={() => (
          <Card>
            <AppText muted>No budgets yet. Set one above.</AppText>
          </Card>
        )}
        renderItem={({ item }) => {
          const statusColor =
            item.percentage >= 100
              ? colors.danger
              : item.percentage >= 80
              ? '#FFAA00'
              : colors.success;

          return (
            <Pressable onLongPress={() => deleteBudget(item.id, item.category)}>
              <View
                style={[
                  styles.budgetRow,
                  { backgroundColor: colors.surface2, borderColor: colors.border },
                ]}
              >
                <View style={styles.budgetHeader}>
                  <AppText style={{ fontWeight: '800', fontSize: 15 }}>
                    {item.category}
                  </AppText>
                  <AppText
                    style={{
                      fontWeight: '800',
                      fontSize: 14,
                      color: statusColor,
                    }}
                  >
                    {item.percentage}%
                  </AppText>
                </View>

                <ProgressBar percentage={item.percentage} colors={colors} />

                <View style={styles.budgetFooter}>
                  <AppText muted style={{ fontSize: 12 }}>
                    Spent: {formatMoney(item.spent)}
                  </AppText>
                  <AppText muted style={{ fontSize: 12 }}>
                    Limit: {formatMoney(item.amount)}
                  </AppText>
                </View>

                <AppText muted style={{ fontSize: 10, marginTop: 4 }}>
                  Long-press to delete
                </AppText>
              </View>
            </Pressable>
          );
        }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: spacing.lg,
    marginTop: scaleHeight(50),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleHeight(20),
  },
  catWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cat: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  budgetRow: {
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
});
