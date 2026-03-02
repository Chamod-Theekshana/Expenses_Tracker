import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View, Switch } from 'react-native';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import { ThemeContext } from '../../store/theme';
import { spacing, radius } from '../../theme/colors';
import { RecurringService, RecurringRule } from '../../services/RecurringService';
import { CategoryService, Category } from '../../services/CategoryService';
import { formatMoney } from '../../utils/money';
import { scaleHeight } from '../../constants/size';

const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'] as const;

function FrequencyBadge({ frequency, colors }: { frequency: string; colors: any }) {
  const badgeColors: Record<string, string> = {
    daily: '#FF6B6B',
    weekly: '#2ED573',
    monthly: '#6C5CE7',
    yearly: '#00D9FF',
  };
  const bg = badgeColors[frequency] || colors.accent;

  return (
    <View style={[styles.badge, { backgroundColor: bg + '18', borderColor: bg + '33' }]}>
      <AppText style={{ fontSize: 11, fontWeight: '700', color: bg }}>
        {frequency.toUpperCase()}
      </AppText>
    </View>
  );
}

export default function RecurringScreen({ navigation }: any) {
  const { colors } = useContext(ThemeContext);
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [frequency, setFrequency] = useState<string>('monthly');
  const [isIncome, setIsIncome] = useState(false);

  const amount = useMemo(() => {
    const n = Number(amountRaw);
    return Number.isFinite(n) ? n : 0;
  }, [amountRaw]);

  const canAdd = title.trim().length > 0 && amount > 0 && selectedCat.length > 0;

  const load = async () => {
    try {
      setLoading(true);
      const [list, cats] = await Promise.all([
        RecurringService.list(),
        CategoryService.list(),
      ]);
      setRules(list);
      setCategories(cats);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load recurring transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createRule = async () => {
    if (!canAdd) return;
    try {
      setLoading(true);
      const finalAmount = isIncome ? amount : -amount;
      await RecurringService.create(title.trim(), finalAmount, selectedCat, frequency);
      setTitle('');
      setAmountRaw('');
      setSelectedCat('');
      setFrequency('monthly');
      setIsIncome(false);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create recurring transaction');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (rule: RecurringRule) => {
    try {
      await RecurringService.update(rule.id, { is_active: !rule.is_active });
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update');
    }
  };

  const deleteRule = async (id: string, ruleTitle: string) => {
    Alert.alert('Delete Recurring', `Remove "${ruleTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await RecurringService.remove(id);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to delete');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const expenseCats = useMemo(
    () => categories.filter((c) => c.type === 'expense' || c.type === 'both'),
    [categories]
  );

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <View style={styles.topRow}>
        <AppText title>Recurring</AppText>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <AppText style={{ color: colors.accent, fontWeight: '600' }}>Close</AppText>
        </Pressable>
      </View>

      {/* Create Form */}
      <Card>
        <AppText muted style={{ marginBottom: 10, fontSize: 13 }}>
          Add recurring transaction
        </AppText>

        <AppInput value={title} onChangeText={setTitle} placeholder="Title (e.g., Netflix, Rent)" />
        <View style={{ height: 10 }} />

        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <AppInput
              value={amountRaw}
              onChangeText={setAmountRaw}
              keyboardType="decimal-pad"
              placeholder="Amount"
            />
          </View>
          <Pressable
            onPress={() => setIsIncome(!isIncome)}
            style={[
              styles.toggleBtn,
              { backgroundColor: isIncome ? colors.success + '18' : colors.danger + '18',
                borderColor: isIncome ? colors.success : colors.danger },
            ]}
          >
            <AppText style={{ fontWeight: '700', fontSize: 12, color: isIncome ? colors.success : colors.danger }}>
              {isIncome ? 'Income' : 'Expense'}
            </AppText>
          </Pressable>
        </View>
        <View style={{ height: 10 }} />

        {/* Frequency Picker */}
        <AppText muted style={{ marginBottom: 8, fontSize: 12 }}>Frequency</AppText>
        <View style={styles.freqRow}>
          {FREQUENCIES.map((f) => (
            <Pressable
              key={f}
              onPress={() => setFrequency(f)}
              style={[
                styles.freqChip,
                { backgroundColor: colors.surface2, borderColor: colors.border },
                frequency === f && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
            >
              <AppText
                style={{
                  fontWeight: '600',
                  fontSize: 12,
                  color: frequency === f ? '#FFF' : colors.text,
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </AppText>
            </Pressable>
          ))}
        </View>
        <View style={{ height: 10 }} />

        {/* Category Picker */}
        <AppText muted style={{ marginBottom: 8, fontSize: 12 }}>Category</AppText>
        <View style={styles.catWrap}>
          {expenseCats.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setSelectedCat(c.name)}
              style={[
                styles.catChip,
                { backgroundColor: colors.surface2, borderColor: colors.border },
                selectedCat === c.name && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
            >
              <AppText
                style={{
                  fontWeight: '600',
                  fontSize: 12,
                  color: selectedCat === c.name ? '#FFF' : colors.text,
                }}
              >
                {c.name}
              </AppText>
            </Pressable>
          ))}
        </View>

        <AppButton
          title="Add Recurring"
          onPress={createRule}
          disabled={!canAdd}
          loading={loading}
          style={{ marginTop: 14 }}
        />
      </Card>

      <View style={{ height: 14 }} />

      {/* Rules List */}
      <FlatList
        data={rules}
        keyExtractor={(i) => i.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={() => (
          <Card>
            <AppText muted>No recurring transactions yet.</AppText>
          </Card>
        )}
        renderItem={({ item }) => {
          const nextDate = new Date().toLocaleDateString();
          const isExpense = item.amount < 0;

          return (
            <Pressable onLongPress={() => deleteRule(item.id, item.title)}>
              <View
                style={[
                  styles.ruleRow,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  !item.is_active && { opacity: 0.5 },
                ]}
              >
                <View style={styles.ruleHeader}>
                  <View style={{ flex: 1 }}>
                    <AppText style={{ fontWeight: '700', fontSize: 15 }}>{item.title}</AppText>
                    <AppText muted style={{ fontSize: 12, marginTop: 2 }}>{item.category}</AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText
                      style={{
                        fontWeight: '700',
                        fontSize: 15,
                        color: isExpense ? colors.danger : colors.success,
                      }}
                    >
                      {formatMoney(item.amount)}
                    </AppText>
                    <FrequencyBadge frequency={item.frequency} colors={colors} />
                  </View>
                </View>

                <View style={[styles.ruleFooter, { borderTopColor: colors.border }]}>
                  <AppText muted style={{ fontSize: 11 }}>
                    Next: {nextDate}
                  </AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppText muted style={{ fontSize: 11 }}>
                      {item.is_active ? 'Active' : 'Paused'}
                    </AppText>
                    <Switch
                      value={item.is_active}
                      onValueChange={() => toggleActive(item)}
                      trackColor={{ false: colors.surface2, true: colors.accent + '55' }}
                      thumbColor={item.is_active ? colors.accent : colors.muted}
                    />
                  </View>
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
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  catWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
  },
  ruleRow: {
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ruleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
