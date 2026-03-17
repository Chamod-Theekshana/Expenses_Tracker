import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View, Switch, ScrollView } from 'react-native';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import { ThemeContext } from '../../store/theme';
import { spacing, radius } from '../../theme/colors';
import { RecurringService, RecurringRule } from '../../services/RecurringService';
import { CategoryService, Category } from '../../services/CategoryService';
import { DateFilterContext } from '../../store/dateFilter';
import { formatMoney } from '../../utils/money';
import { scaleHeight } from '../../constants/size';
import Icon from '../../components/Icon';
import { getCategoryMeta } from '../../constants/categories';

const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'] as const;

function FrequencyBadge({ frequency, colors }: { frequency: string; colors: any }) {
  const badgeColors: Record<string, string> = {
    daily: colors.danger,
    weekly: colors.success,
    monthly: colors.accent,
    yearly: colors.warning,
  };
  const bg = badgeColors[frequency] || colors.accent;

  return (
    <View style={[styles.badge, { backgroundColor: bg + '18', borderColor: bg + '33' }]}>
      <AppText style={{ fontSize: 10, fontWeight: '800', color: bg }}>
        {frequency.toUpperCase()}
      </AppText>
    </View>
  );
}

export default function RecurringScreen({ navigation }: any) {
  const { colors, theme } = useContext(ThemeContext);
  const { matchesFilter } = useContext(DateFilterContext);
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
  
  const cardShadow = theme === 'light' ? styles.cardShadowLight : {};

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <View style={styles.topRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent + '20', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="refresh-cw" size={20} color={colors.accent} />
          </View>
          <AppText title style={{ fontSize: 24 }}>Recurring</AppText>
        </View>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ padding: 4 }}>
          <Icon name="x" size={24} color={colors.text} />
        </Pressable>
      </View>

      <FlatList
        data={rules.filter(r => matchesFilter(r.next_run))}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={() => (
          <Card style={[cardShadow, { marginBottom: 24, padding: 20, backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Icon name="plus-circle" size={18} color={colors.accent} />
              <AppText style={{ fontWeight: '700', fontSize: 16, color: colors.text, marginLeft: 8 }}>
                New Recurring Entry
              </AppText>
            </View>

            <AppInput value={title} onChangeText={setTitle} placeholder="Title (e.g., Netflix, Rent)" />
            <View style={{ height: 12 }} />

            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
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
                  { backgroundColor: isIncome ? colors.success + '15' : colors.danger + '15',
                    borderColor: isIncome ? colors.success : colors.danger },
                ]}
              >
                <AppText style={{ fontWeight: '700', fontSize: 13, color: isIncome ? colors.success : colors.danger }}>
                  {isIncome ? 'Income' : 'Expense'}
                </AppText>
              </Pressable>
            </View>
            <View style={{ height: 16 }} />

            <AppText muted style={{ marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Frequency</AppText>
            <View style={styles.freqRow}>
              {FREQUENCIES.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFrequency(f)}
                  style={[
                    styles.freqChip,
                    { backgroundColor: frequency === f ? colors.accent : colors.surface2, borderColor: frequency === f ? colors.accent : colors.border },
                  ]}
                >
                  <AppText
                    style={{
                      fontWeight: '700',
                      fontSize: 12,
                      color: frequency === f ? '#FFF' : colors.text,
                    }}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <View style={{ height: 20 }} />

            <AppText muted style={{ marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Category</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catWrap}>
              {expenseCats.map((c) => {
                const meta = getCategoryMeta(c.name);
                const isSelected = selectedCat === c.name;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setSelectedCat(c.name)}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: isSelected ? meta.color : colors.surface2,
                        borderColor: isSelected ? meta.color : colors.border,
                      },
                    ]}
                  >
                    <Icon name={meta.icon} size={14} color={isSelected ? '#FFF' : meta.color} />
                    <AppText
                      style={{
                        fontWeight: '600',
                        fontSize: 13,
                        marginLeft: 6,
                        color: selectedCat === c.name ? '#FFF' : colors.text,
                      }}
                    >
                      {c.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <AppButton
              title="Add Recurring"
              onPress={createRule}
              disabled={!canAdd}
              loading={loading}
              style={{ marginTop: 24 }}
            />
          </Card>
        )}
        ListEmptyComponent={() => (
          <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Icon name="refresh-cw" size={32} color={colors.muted} />
            <AppText style={{ fontWeight: '700', fontSize: 16, marginTop: 12, color: colors.text }}>No recurring entries</AppText>
            <AppText muted style={{ marginTop: 4, textAlign: 'center', fontSize: 13 }}>
              Add your subscriptions and bills to track them automatically.
            </AppText>
          </View>
        )}
        renderItem={({ item, index }) => {
          const nextDateObj = new Date(item.next_run);
          const nextDate = Number.isNaN(nextDateObj.getTime())
            ? String(item.next_run)
            : nextDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const isExpense = item.amount < 0;
          const catMeta = getCategoryMeta(item.category);

          return (
            <Pressable onLongPress={() => deleteRule(item.id, item.title)}>
              <View
                style={[
                  styles.ruleRow,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  !item.is_active && { opacity: 0.5 },
                  cardShadow
                ]}
              >
                <View style={[styles.ruleHeader, { paddingBottom: 16 }]}>
                  <View style={[styles.txIcon, { backgroundColor: catMeta.color + '20' }]}>
                    <Icon name={catMeta.icon} size={20} color={catMeta.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <AppText style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>{item.title}</AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <AppText muted style={{ fontSize: 13 }}>{item.category}</AppText>
                      <AppText muted style={{ marginHorizontal: 6 }}>•</AppText>
                      <FrequencyBadge frequency={item.frequency} colors={colors} />
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                    <AppText
                      style={{
                        fontWeight: '800',
                        fontSize: 16,
                        color: isExpense ? colors.danger : colors.success,
                      }}
                    >
                      {formatMoney(Math.abs(item.amount), item.currency || 'LKR')}
                    </AppText>
                  </View>
                </View>

                <View style={[styles.ruleFooter, { borderTopColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="calendar" size={14} color={colors.muted} />
                    <AppText muted style={{ fontSize: 12, marginLeft: 6 }}>
                      Next: <AppText style={{ fontWeight: '600', color: colors.text }}>{nextDate}</AppText>
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppText muted style={{ fontSize: 12, fontWeight: '600' }}>
                      {item.is_active ? 'Active' : 'Paused'}
                    </AppText>
                    <Switch
                      value={item.is_active}
                      onValueChange={() => toggleActive(item)}
                      trackColor={{ false: colors.surface2, true: colors.accent + '40' }}
                      thumbColor={item.is_active ? colors.accent : colors.muted}
                    />
                  </View>
                </View>
              </View>
            </Pressable>
          );
        }}
        contentContainerStyle={{ paddingBottom: scaleHeight(40) }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: scaleHeight(55),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleHeight(24),
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  catWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ruleRow: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  cardShadowLight: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
});
