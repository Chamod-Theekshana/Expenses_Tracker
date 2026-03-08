import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import Icon from '../../components/Icon';
import { ThemeContext } from '../../store/theme';
import { radius, spacing } from '../../theme/colors';
import { BudgetService, BudgetStatus } from '../../services/BudgetService';
import { CategoryService, Category } from '../../services/CategoryService';
import { DateFilterContext } from '../../store/dateFilter';
import { ProfileContext } from '../../store/profile';
import { formatMoney, parseAmount } from '../../utils/money';
import { getCategoryMeta } from '../../constants/categories';
import { scaleHeight } from '../../constants/size';
import { useFocusEffect } from '@react-navigation/native';

// ── Progress Bar ──────────────────────────────────────────────────
function ProgressBar({ percentage, colors }: { percentage: number; colors: any }) {
  const clampedPct = Math.min(Math.max(percentage, 0), 100);
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animVal, {
      toValue: clampedPct,
      useNativeDriver: false,
      friction: 8,
    }).start();
  }, [clampedPct]);

  const barColor =
    percentage >= 100 ? colors.danger : percentage >= 80 ? colors.warning : colors.success;

  const width = animVal.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.surface2 }]}>
      <Animated.View style={[styles.progressFill, { width, backgroundColor: barColor }]} />
    </View>
  );
}

// ── Edit Budget Modal ────────────────────────────────────────────
function EditBudgetModal({
  budget,
  visible,
  onClose,
  onSave,
  colors,
}: {
  budget: BudgetStatus | null;
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, amount: number) => Promise<void>;
  colors: any;
}) {
  const [amountRaw, setAmountRaw] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (budget) setAmountRaw(String(budget.amount));
  }, [budget]);

  const parsedAmount = parseAmount(amountRaw);
  const canSave = parsedAmount !== null && parsedAmount > 0 && parsedAmount !== budget?.amount;

  const handleSave = async () => {
    if (!budget || !canSave || parsedAmount === null) return;
    try {
      setSaving(true);
      await onSave(budget.id, parsedAmount);
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update budget');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.modalCard, { backgroundColor: colors.surface }]}
          onPress={Keyboard.dismiss}
        >
          <View style={styles.modalHeader}>
            <AppText style={{ fontWeight: '700', fontSize: 17, color: colors.text }}>
              Edit Budget
            </AppText>
            <Pressable onPress={onClose} hitSlop={10}>
              <Icon name="x" size={20} color={colors.muted} />
            </Pressable>
          </View>

          {budget && (
            <>
              <View style={styles.modalCatRow}>
                <View
                  style={[
                    styles.modalCatIcon,
                    { backgroundColor: getCategoryMeta(budget.category).color + '20' },
                  ]}
                >
                  <Icon
                    name={getCategoryMeta(budget.category).icon}
                    size={18}
                    color={getCategoryMeta(budget.category).color}
                  />
                </View>
                <AppText style={{ fontWeight: '600', fontSize: 15, color: colors.text, marginLeft: 10 }}>
                  {budget.category}
                </AppText>
              </View>

              <AppText muted style={{ fontSize: 12, marginBottom: 6, marginTop: 14 }}>
                New monthly limit ({budget.currency})
              </AppText>
              <AppInput
                value={amountRaw}
                onChangeText={setAmountRaw}
                keyboardType="decimal-pad"
                placeholder="e.g. 5000"
                autoFocus
                onSubmitEditing={handleSave}
                returnKeyType="done"
                left={
                  <AppText style={{ color: colors.muted, fontWeight: '600' }}>
                    {budget.currency}
                  </AppText>
                }
              />

              <AppButton
                title="Save Changes"
                onPress={handleSave}
                loading={saving}
                disabled={!canSave || saving}
                style={{ marginTop: 16 }}
              />
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Main Screen ──────────────────────────────────────────────────
export default function BudgetsScreen({ navigation }: any) {
  const { colors } = useContext(ThemeContext);
  const { year, month, day } = useContext(DateFilterContext);
  const { currency: preferredCurrency } = useContext(ProfileContext);

  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [savingNew, setSavingNew] = useState(false);

  const [selectedCat, setSelectedCat] = useState('');
  const [amountRaw, setAmountRaw] = useState('');

  const [editTarget, setEditTarget] = useState<BudgetStatus | null>(null);
  const [editVisible, setEditVisible] = useState(false);

  const parsedAmount = parseAmount(amountRaw);
  const canAdd = selectedCat.length > 0 && parsedAmount !== null && parsedAmount > 0;

  const load = useCallback(async () => {
    try {
      setLoadingData(true);
      const [statuses, cats] = await Promise.all([
        BudgetService.getStatus(year, month, day),
        CategoryService.list(),
      ]);
      setBudgets(statuses);
      setCategories(cats);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load budgets');
    } finally {
      setLoadingData(false);
    }
  }, [year, month, day]);

  // Reload when screen comes into focus
  useFocusEffect(useCallback(() => { load(); }, [load]));
  // Also reload when date filter changes
  useEffect(() => { load(); }, [load]);

  const availableCategories = useMemo(() => {
    const budgetedCats = new Set(budgets.map((b) => b.category));
    return categories.filter(
      (c) => (c.type === 'expense' || c.type === 'both') && !budgetedCats.has(c.name),
    );
  }, [categories, budgets]);

  const createBudget = async () => {
    if (!canAdd || parsedAmount === null) return;
    Keyboard.dismiss();
    try {
      setSavingNew(true);
      await BudgetService.create(selectedCat, parsedAmount, preferredCurrency || 'LKR');
      setSelectedCat('');
      setAmountRaw('');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create budget');
    } finally {
      setSavingNew(false);
    }
  };

  const handleEditSave = async (id: string, amount: number) => {
    await BudgetService.update(id, amount);
    await load();
  };

  const confirmDelete = (budget: BudgetStatus) => {
    Alert.alert(
      'Delete Budget',
      `Remove the ${formatMoney(budget.amount, budget.currency)} monthly budget for ${budget.category}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await BudgetService.remove(budget.id);
              await load();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to delete budget');
            }
          },
        },
      ],
    );
  };

  const openEdit = (budget: BudgetStatus) => {
    setEditTarget(budget);
    setEditVisible(true);
  };

  // ── Render budget card ──
  const renderBudget = ({ item }: { item: BudgetStatus }) => {
    const isOver = item.percentage >= 100;
    const isWarning = item.percentage >= 80;
    const statusColor = isOver ? colors.danger : isWarning ? colors.warning : colors.success;
    const catMeta = getCategoryMeta(item.category);

    return (
      <View style={[styles.budgetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.catIconWrap, { backgroundColor: catMeta.color + '20' }]}>
              <Icon name={catMeta.icon} size={18} color={catMeta.color} />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <AppText style={{ fontWeight: '700', fontSize: 15, color: colors.text }}>
                {item.category}
              </AppText>
              <AppText muted style={{ fontSize: 11, marginTop: 1 }}>
                Monthly
              </AppText>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.cardActions}>
            <Pressable
              onPress={() => openEdit(item)}
              hitSlop={8}
              style={[styles.actionBtn, { backgroundColor: colors.surface2 }]}
            >
              <Icon name="edit" size={14} color={colors.accent} />
            </Pressable>
            <Pressable
              onPress={() => confirmDelete(item)}
              hitSlop={8}
              style={[styles.actionBtn, { backgroundColor: colors.surface2, marginLeft: 8 }]}
            >
              <Icon name="trash" size={14} color={colors.danger} />
            </Pressable>
          </View>
        </View>

        {/* Progress bar */}
        <View style={{ marginTop: 14, marginBottom: 10 }}>
          <ProgressBar percentage={item.percentage} colors={colors} />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View>
            <AppText muted style={{ fontSize: 11 }}>Spent</AppText>
            <AppText style={{ fontWeight: '700', fontSize: 14, color: statusColor, marginTop: 2 }}>
              {formatMoney(item.spent, item.currency)}
            </AppText>
          </View>
          <View style={{ alignItems: 'center' }}>
            <AppText muted style={{ fontSize: 11 }}>Usage</AppText>
            <AppText style={{ fontWeight: '800', fontSize: 16, color: statusColor, marginTop: 2 }}>
              {item.percentage}%
            </AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText muted style={{ fontSize: 11 }}>{isOver ? 'Over by' : 'Remaining'}</AppText>
            <AppText
              style={{
                fontWeight: '700',
                fontSize: 14,
                color: isOver ? colors.danger : colors.success,
                marginTop: 2,
              }}
            >
              {isOver
                ? formatMoney(item.spent - item.amount, item.currency)
                : formatMoney(item.remaining, item.currency)}
            </AppText>
          </View>
        </View>

        {/* Limit label */}
        <View style={[styles.limitRow, { borderTopColor: colors.border }]}>
          <AppText muted style={{ fontSize: 11 }}>
            Monthly limit
          </AppText>
          <AppText style={{ fontWeight: '600', fontSize: 13, color: colors.text }}>
            {formatMoney(item.amount, item.currency)}
          </AppText>
        </View>

        {item.conversion_error && (
          <View style={[styles.warningBanner, { backgroundColor: colors.warning + '15', marginTop: 8 }]}>
            <Icon name="alert-triangle" size={14} color={colors.warning} />
            <AppText style={{ color: colors.warning, fontSize: 12, fontWeight: '600', marginLeft: 6, flex: 1 }}>
              Some transactions in other currencies couldn't be converted — spent amount may be understated
            </AppText>
          </View>
        )}

        {isOver && (
          <View style={[styles.warningBanner, { backgroundColor: colors.danger + '15' }]}>
            <Icon name="alert-triangle" size={14} color={colors.danger} />
            <AppText style={{ color: colors.danger, fontSize: 12, fontWeight: '600', marginLeft: 6 }}>
              Budget exceeded this period
            </AppText>
          </View>
        )}
      </View>
    );
  };

  // ── Add budget form ──
  const renderAddForm = () => (
    <Card style={{ marginBottom: 20 }}>
      <View style={styles.formHeader}>
        <Icon name="wallet" size={18} color={colors.accent} />
        <AppText style={{ fontWeight: '700', fontSize: 15, color: colors.text, marginLeft: 8 }}>
          Set Monthly Budget
        </AppText>
      </View>

      {loadingData && categories.length === 0 ? (
        <AppText muted style={{ fontSize: 13, paddingVertical: 8 }}>Loading categories…</AppText>
      ) : availableCategories.length === 0 ? (
        <View style={styles.allSetWrap}>
          <Icon name="check-circle" size={24} color={colors.success} />
          <AppText style={{ color: colors.success, fontWeight: '600', marginTop: 8, fontSize: 14 }}>
            All categories have budgets!
          </AppText>
          <AppText muted style={{ fontSize: 12, marginTop: 4, textAlign: 'center' }}>
            Delete or edit existing budgets to make changes.
          </AppText>
        </View>
      ) : (
        <>
          <AppText muted style={{ fontSize: 12, marginBottom: 8, marginTop: 12 }}>
            Choose category
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
          >
            {availableCategories.map((c) => {
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
                  <Icon
                    name={meta.icon}
                    size={14}
                    color={isSelected ? '#FFF' : meta.color}
                  />
                  <AppText
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      marginLeft: 6,
                      color: isSelected ? '#FFF' : colors.text,
                    }}
                  >
                    {c.name}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>

          <AppText muted style={{ fontSize: 12, marginBottom: 6, marginTop: 16 }}>
            Monthly limit
          </AppText>
          <AppInput
            value={amountRaw}
            onChangeText={setAmountRaw}
            keyboardType="decimal-pad"
            placeholder={`e.g. 5000`}
            returnKeyType="done"
            onSubmitEditing={createBudget}
            left={
              <AppText style={{ color: colors.muted, fontWeight: '600', fontSize: 14 }}>
                {preferredCurrency || 'LKR'}
              </AppText>
            }
          />
          {amountRaw.length > 0 && (parsedAmount === null || parsedAmount <= 0) && (
            <AppText style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>
              Enter a valid amount greater than zero
            </AppText>
          )}

          <AppButton
            title={selectedCat ? `Set Budget for ${selectedCat}` : 'Set Budget'}
            onPress={createBudget}
            disabled={!canAdd}
            loading={savingNew}
            style={{ marginTop: 14 }}
          />
        </>
      )}
    </Card>
  );

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.topRow}>
        <View>
          <AppText title>Budgets</AppText>
          {budgets.length > 0 && (
            <AppText muted style={{ fontSize: 12, marginTop: 2 }}>
              {budgets.filter((b) => b.percentage >= 100).length > 0
                ? `${budgets.filter((b) => b.percentage >= 100).length} budget(s) exceeded`
                : `${budgets.length} active budget${budgets.length === 1 ? '' : 's'}`}
            </AppText>
          )}
        </View>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Icon name="x" size={24} color={colors.muted} />
        </Pressable>
      </View>

      <FlatList
        data={budgets}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={renderAddForm}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          !loadingData ? (
            <View style={[styles.emptyState, { borderColor: colors.border }]}>
              <Icon name="wallet" size={32} color={colors.muted} />
              <AppText style={{ fontWeight: '600', fontSize: 15, marginTop: 12, color: colors.text }}>
                No budgets yet
              </AppText>
              <AppText muted style={{ fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                Set monthly limits above to track your spending by category.
              </AppText>
            </View>
          ) : null
        }
        renderItem={renderBudget}
        contentContainerStyle={{ paddingBottom: scaleHeight(40) }}
        showsVerticalScrollIndicator={false}
      />

      <EditBudgetModal
        budget={editTarget}
        visible={editVisible}
        onClose={() => { setEditVisible(false); setEditTarget(null); }}
        onSave={handleEditSave}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: scaleHeight(50),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scaleHeight(18),
  },

  // ── Add form ──
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  chipScroll: {
    paddingRight: 8,
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  allSetWrap: {
    alignItems: 'center',
    paddingVertical: 16,
  },

  // ── Budget card ──
  budgetCard: {
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  catIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },

  // ── Empty state ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
  },

  // ── Edit Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: radius.xl,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  modalCatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
