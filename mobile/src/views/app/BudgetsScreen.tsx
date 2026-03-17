import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import Icon from '../../components/Icon';
import CircularProgress from '../../components/CircularProgress';
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
  const { colors, theme } = useContext(ThemeContext);
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

  useFocusEffect(useCallback(() => { load(); }, [load]));
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

  const cardShadow = theme === 'light' ? styles.cardShadowLight : {};

  // ── Render budget card ──
  const renderBudget = ({ item }: { item: BudgetStatus }) => {
    const isOver = item.percentage >= 100;
    const isWarning = item.percentage >= 80;
    const ringColor = isOver ? colors.danger : isWarning ? colors.warning : colors.accent;
    const catMeta = getCategoryMeta(item.category);
    
    // Calculate remaining percentage for the donut
    const remainingPct = isOver ? 0 : 100 - item.percentage;

    return (
      <View style={[styles.budgetCard, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.catIconWrap, { backgroundColor: catMeta.color + '20' }]}>
              <Icon name={catMeta.icon} size={18} color={catMeta.color} />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <AppText style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>
                {item.category}
              </AppText>
              <AppText muted style={{ fontSize: 12, marginTop: 2 }}>
                Monthly • {formatMoney(item.amount, item.currency)}
              </AppText>
            </View>
          </View>
          <View style={styles.cardActions}>
            <Pressable onPress={() => openEdit(item)} hitSlop={8} style={[styles.actionBtn, { backgroundColor: colors.surface2 }]}>
              <Icon name="edit" size={14} color={colors.accent} />
            </Pressable>
            <Pressable onPress={() => confirmDelete(item)} hitSlop={8} style={[styles.actionBtn, { backgroundColor: colors.surface2, marginLeft: 8 }]}>
              <Icon name="trash" size={14} color={colors.danger} />
            </Pressable>
          </View>
        </View>

        <View style={styles.contentRow}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <AppText muted style={{ fontSize: 12 }}>Spent</AppText>
            <AppText style={{ fontWeight: '700', fontSize: 20, color: colors.text, marginTop: 2 }}>
              {formatMoney(item.spent, item.currency)}
            </AppText>
            <View style={{ marginTop: 12 }}>
              <AppText muted style={{ fontSize: 12 }}>{isOver ? 'Over by' : 'Remaining'}</AppText>
              <AppText style={{ fontWeight: '600', fontSize: 15, color: isOver ? colors.danger : colors.success, marginTop: 2 }}>
                {isOver ? formatMoney(item.spent - item.amount, item.currency) : formatMoney(item.remaining, item.currency)}
              </AppText>
            </View>
          </View>
          
          <View style={styles.ringWrap}>
            <CircularProgress
              percentage={remainingPct}
              size={90}
              strokeWidth={12}
              trackColor={colors.surface2}
              progressColor={ringColor}
            />
            <View style={styles.ringTextAbs}>
              <AppText style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
                {Math.round(remainingPct)}%
              </AppText>
              <AppText style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>
                left
              </AppText>
            </View>
          </View>
        </View>

        {item.conversion_error && (
          <View style={[styles.warningBanner, { backgroundColor: colors.warning + '15', marginTop: 16 }]}>
            <Icon name="alert-triangle" size={14} color={colors.warning} />
            <AppText style={{ color: colors.warning, fontSize: 12, fontWeight: '600', marginLeft: 6, flex: 1 }}>
              Some transactions couldn't be converted.
            </AppText>
          </View>
        )}

        {isOver && (
          <View style={[styles.warningBanner, { backgroundColor: colors.danger + '15', marginTop: 16 }]}>
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
    <Card style={[{ marginBottom: 24, padding: 20 }, cardShadow, { backgroundColor: colors.surface }]}>
      <View style={styles.formHeader}>
        <Icon name="wallet" size={20} color={colors.accent} />
        <AppText style={{ fontWeight: '700', fontSize: 16, color: colors.text, marginLeft: 10 }}>
          Set Monthly Budget
        </AppText>
      </View>

      {loadingData && categories.length === 0 ? (
        <AppText muted style={{ fontSize: 13, paddingVertical: 8 }}>Loading categories…</AppText>
      ) : availableCategories.length === 0 ? (
        <View style={styles.allSetWrap}>
          <Icon name="check-circle" size={28} color={colors.success} />
          <AppText style={{ color: colors.success, fontWeight: '600', marginTop: 10, fontSize: 15 }}>
            All expenses budgeted!
          </AppText>
          <AppText muted style={{ fontSize: 13, marginTop: 6, textAlign: 'center' }}>
            Edit or delete an existing budget to make changes.
          </AppText>
        </View>
      ) : (
        <>
          <AppText muted style={{ fontSize: 13, marginBottom: 10, marginTop: 16 }}>
            Select Category
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
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
                  <Icon name={meta.icon} size={14} color={isSelected ? '#FFF' : meta.color} />
                  <AppText style={{ fontSize: 13, fontWeight: '600', marginLeft: 6, color: isSelected ? '#FFF' : colors.text }}>
                    {c.name}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>

          <AppText muted style={{ fontSize: 13, marginBottom: 8, marginTop: 20 }}>
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
              <AppText style={{ color: colors.muted, fontWeight: '600', fontSize: 15 }}>
                {preferredCurrency || 'LKR'}
              </AppText>
            }
          />

          <AppButton
            title={selectedCat ? `Save Budget` : 'Set Budget'}
            onPress={createBudget}
            disabled={!canAdd}
            loading={savingNew}
            style={{ marginTop: 20 }}
          />
        </>
      )}
    </Card>
  );

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <View style={styles.topRow}>
        <View>
          <AppText title style={{ fontSize: 24 }}>Budgets</AppText>
          {budgets.length > 0 && (
            <AppText muted style={{ fontSize: 13, marginTop: 4 }}>
              {budgets.filter((b) => b.percentage >= 100).length > 0
                ? `${budgets.filter((b) => b.percentage >= 100).length} budget(s) exceeded`
                : `${budgets.length} active budget${budgets.length === 1 ? '' : 's'}`}
            </AppText>
          )}
        </View>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ padding: 4 }}>
          <Icon name="x" size={24} color={colors.text} />
        </Pressable>
      </View>

      <FlatList
        data={budgets}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={renderAddForm}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        ListEmptyComponent={
          !loadingData ? (
            <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Icon name="wallet" size={32} color={colors.muted} />
              <AppText style={{ fontWeight: '600', fontSize: 16, marginTop: 12, color: colors.text }}>
                No active budgets
              </AppText>
              <AppText muted style={{ fontSize: 13, marginTop: 6, textAlign: 'center' }}>
                Create a budget above to stay on top of your spending.
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
    paddingTop: scaleHeight(55),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scaleHeight(24),
  },
  cardShadowLight: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  allSetWrap: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  // ── Budget card ──
  budgetCard: {
    padding: 20,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringTextAbs: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  // ── Empty state ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  // ── Edit Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    padding: 0,
  },
  modalCard: {
    width: '100%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 24,
    paddingBottom: 40,
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
    marginTop: 16,
  },
  modalCatIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
