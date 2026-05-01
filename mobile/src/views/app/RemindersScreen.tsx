import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import Icon from '../../components/Icon';
import { ThemeContext } from '../../store/theme';
import { ProfileContext } from '../../store/profile';
import { CategoryService, Category } from '../../services/CategoryService';
import { ReminderItem, ReminderService } from '../../services/ReminderService';
import { getCategoryMeta } from '../../constants/categories';
import { formatMoney } from '../../utils/money';
import { radius, spacing } from '../../theme/colors';
import { scaleHeight } from '../../constants/size';

const DAY_OPTIONS = [0, 1, 2, 3, 5, 7, 10, 14] as const;

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseDateISO(value: string): Date | null {
  const clean = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null;
  const d = new Date(clean);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function getDueLabel(dueDateISO: string): { label: string; colorKind: 'danger' | 'warning' | 'muted' } {
  const now = new Date();
  const due = new Date(dueDateISO);
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffMs = dueMidnight.getTime() - todayMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: `Overdue by ${Math.abs(diffDays)}d`, colorKind: 'danger' };
  if (diffDays === 0) return { label: 'Due today', colorKind: 'warning' };
  if (diffDays === 1) return { label: 'Due tomorrow', colorKind: 'warning' };
  if (diffDays <= 7) return { label: `Due in ${diffDays} days`, colorKind: 'muted' };

  return {
    label: `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    colorKind: 'muted',
  };
}

export default function RemindersScreen({ navigation }: any) {
  const { colors, theme } = useContext(ThemeContext);
  const { currency: preferredCurrency } = useContext(ProfileContext);

  const [items, setItems] = useState<ReminderItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [dueDate, setDueDate] = useState(() => isoDaysFromNow(7));
  const [selectedCategory, setSelectedCategory] = useState('Bills');
  const [remindDaysBefore, setRemindDaysBefore] = useState<number>(3);

  const amount = useMemo(() => {
    const n = Number(amountRaw);
    return Number.isFinite(n) ? n : 0;
  }, [amountRaw]);

  const dateIsValid = !!parseDateISO(dueDate);
  const canCreate = title.trim().length > 0 && amount > 0 && !!selectedCategory && dateIsValid;

  const expenseCategories = useMemo(() => {
    const list = categories
      .filter((c) => c.type === 'expense' || c.type === 'both')
      .map((c) => c.name);

    return list.length > 0 ? list : ['Bills', 'Rent', 'Utilities', 'Other'];
  }, [categories]);

  const load = async () => {
    try {
      setLoading(true);
      const [reminders, cats] = await Promise.all([ReminderService.list(), CategoryService.list()]);
      setItems(reminders.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
      setCategories(cats);

      if (!selectedCategory && cats.length > 0) {
        const firstExpense = cats.find((c) => c.type === 'expense' || c.type === 'both');
        if (firstExpense?.name) setSelectedCategory(firstExpense.name);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedCategory) {
      setSelectedCategory(expenseCategories[0] || 'Bills');
    }
  }, [expenseCategories, selectedCategory]);

  const createReminder = async () => {
    if (!canCreate) {
      Alert.alert('Missing info', 'Enter a title, amount, category and valid due date.');
      return;
    }

    try {
      setLoading(true);
      await ReminderService.create({
        title: title.trim(),
        amount,
        category: selectedCategory,
        due_date: dueDate.trim(),
        remind_days_before: remindDaysBefore,
        currency: preferredCurrency || 'LKR',
        is_active: true,
      });

      setTitle('');
      setAmountRaw('');
      setDueDate(isoDaysFromNow(7));
      setRemindDaysBefore(3);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create reminder');
    } finally {
      setLoading(false);
    }
  };

  const toggleReminderActive = async (item: ReminderItem) => {
    try {
      await ReminderService.update(item.id, { is_active: !item.is_active });
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update reminder');
    }
  };

  const removeReminder = async (id: string, titleText: string) => {
    Alert.alert('Delete reminder', `Remove "${titleText}" reminder?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await ReminderService.remove(id);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to delete reminder');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const cardShadow = theme === 'light' ? styles.cardShadowLight : {};

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <View style={[styles.topIconWrap, { backgroundColor: colors.accent + '20' }]}>
            <Icon name="bell" size={20} color={colors.accent} />
          </View>
          <AppText title style={{ fontSize: 24 }}>Bill Reminders</AppText>
        </View>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ padding: 4 }}>
          <Icon name="x" size={24} color={colors.text} />
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scaleHeight(50) }}
        ListHeaderComponent={
          <Card style={[cardShadow, { marginBottom: 24, padding: 20, backgroundColor: colors.surface }]}> 
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Icon name="plus-circle" size={18} color={colors.accent} />
              <AppText style={{ fontWeight: '700', fontSize: 16, color: colors.text, marginLeft: 8 }}>
                New Bill Reminder
              </AppText>
            </View>

            <AppInput
              value={title}
              onChangeText={setTitle}
              placeholder="Title (e.g., House Rent)"
            />
            <View style={{ height: 12 }} />

            <AppInput
              value={amountRaw}
              onChangeText={setAmountRaw}
              keyboardType="decimal-pad"
              placeholder="Amount"
              left={
                <AppText style={{ fontSize: 13, fontWeight: '700', color: colors.muted }}>
                  {preferredCurrency || 'LKR'}
                </AppText>
              }
            />
            <View style={{ height: 12 }} />

            <AppInput
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="Due Date (YYYY-MM-DD)"
              right={<Icon name="calendar" size={18} color={colors.muted} />}
            />

            {!dateIsValid ? (
              <AppText style={{ color: colors.danger, fontSize: 12, marginTop: 6 }}>
                Please use valid date format: YYYY-MM-DD
              </AppText>
            ) : null}

            <View style={{ height: 16 }} />
            <AppText muted style={styles.formLabel}>Remind me before</AppText>
            <View style={styles.optionRow}>
              {DAY_OPTIONS.map((dayCount) => {
                const active = remindDaysBefore === dayCount;
                return (
                  <Pressable
                    key={dayCount}
                    onPress={() => setRemindDaysBefore(dayCount)}
                    style={[
                      styles.dayChip,
                      {
                        backgroundColor: active ? colors.accent : colors.surface2,
                        borderColor: active ? colors.accent : colors.border,
                      },
                    ]}
                  >
                    <AppText style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFF' : colors.text }}>
                      {dayCount}d
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ height: 16 }} />
            <AppText muted style={styles.formLabel}>Category</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catWrap}>
              {expenseCategories.map((categoryName) => {
                const meta = getCategoryMeta(categoryName);
                const active = selectedCategory === categoryName;
                return (
                  <Pressable
                    key={categoryName}
                    onPress={() => setSelectedCategory(categoryName)}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: active ? meta.color : colors.surface2,
                        borderColor: active ? meta.color : colors.border,
                      },
                    ]}
                  >
                    <Icon name={meta.icon} size={14} color={active ? '#FFF' : meta.color} />
                    <AppText style={{ fontWeight: '600', fontSize: 13, marginLeft: 6, color: active ? '#FFF' : colors.text }}>
                      {categoryName}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <AppButton
              title="Add Reminder"
              onPress={createReminder}
              disabled={!canCreate}
              loading={loading}
              style={{ marginTop: 20 }}
            />
          </Card>
        }
        ListEmptyComponent={
          <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
            <Icon name="bell" size={32} color={colors.muted} />
            <AppText style={{ fontWeight: '700', fontSize: 16, marginTop: 12, color: colors.text }}>No bill reminders yet</AppText>
            <AppText muted style={{ marginTop: 4, textAlign: 'center', fontSize: 13 }}>
              Add reminders to get notified before your bills are due.
            </AppText>
          </View>
        }
        renderItem={({ item }) => {
          const meta = getCategoryMeta(item.category);
          const dueState = getDueLabel(item.due_date);
          const dueColor = dueState.colorKind === 'danger'
            ? colors.danger
            : dueState.colorKind === 'warning'
              ? colors.warning
              : colors.muted;

          return (
            <Pressable onLongPress={() => removeReminder(item.id, item.title)}>
              <View
                style={[
                  styles.rowCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  !item.is_active && { opacity: 0.5 },
                  cardShadow,
                ]}
              >
                <View style={styles.rowHeader}>
                  <View style={[styles.txIcon, { backgroundColor: meta.color + '20' }]}>
                    <Icon name={meta.icon} size={20} color={meta.color} />
                  </View>

                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <AppText style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>{item.title}</AppText>
                    <AppText style={{ marginTop: 4, fontSize: 13, color: dueColor }}>
                      {dueState.label}
                    </AppText>
                    <AppText style={{ marginTop: 4, fontSize: 12, color: colors.muted }}>
                      Remind {item.remind_days_before} day{item.remind_days_before === 1 ? '' : 's'} before
                    </AppText>
                  </View>

                  <AppText style={{ fontWeight: '800', fontSize: 15, color: colors.text }}>
                    {formatMoney(Math.abs(item.amount), item.currency || preferredCurrency || 'LKR')}
                  </AppText>
                </View>

                <View style={[styles.rowFooter, { borderTopColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="calendar" size={14} color={colors.muted} />
                    <AppText muted style={{ marginLeft: 6, fontSize: 12 }}>
                      Due {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </AppText>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppText muted style={{ fontSize: 12, fontWeight: '600' }}>
                      {item.is_active ? 'Active' : 'Paused'}
                    </AppText>
                    <Switch
                      value={item.is_active}
                      onValueChange={() => toggleReminderActive(item)}
                      trackColor={{ false: colors.surface2, true: colors.accent + '40' }}
                      thumbColor={item.is_active ? colors.accent : colors.muted}
                    />
                  </View>
                </View>
              </View>
            </Pressable>
          );
        }}
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
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formLabel: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  rowCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  rowHeader: {
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
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  cardShadowLight: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
});
