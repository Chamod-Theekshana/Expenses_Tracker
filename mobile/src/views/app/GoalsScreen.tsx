import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import IconButton from '../../components/IconButton';
import Icon from '../../components/Icon';
import CircularProgress from '../../components/CircularProgress';
import { ThemeContext } from '../../store/theme';
import { ProfileContext } from '../../store/profile';
import { GoalService, Goal } from '../../services/GoalService';
import { NotificationsContext } from '../../store/notifications';
import { radius, spacing } from '../../theme/colors';
import { formatMoney } from '../../utils/money';
import { scaleHeight } from '../../constants/size';

// ── Goal Card ────────────────────────────────────────────────
function GoalCard({
  goal,
  onContribute,
  onEdit,
  onDelete,
  shadowStyle,
}: {
  goal: Goal;
  onContribute: () => void;
  onEdit: () => void;
  onDelete: () => void;
  shadowStyle: any;
}) {
  const { colors } = useContext(ThemeContext);
  const pct = Math.min(goal.progress_percentage, 100);
  const ringColor = goal.is_completed ? colors.success : colors.accent;
  const daysLeft = goal.deadline
    ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <Card style={[shadowStyle, { marginBottom: 16, backgroundColor: colors.surface }]}>
      <View style={styles.goalRow}>
        <View style={{ position: 'relative' }}>
          <CircularProgress
            percentage={pct}
            size={80}
            strokeWidth={8}
            progressColor={ringColor}
            trackColor={colors.surface2}
          />
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              {goal.is_completed ? (
                <Icon name="check" size={24} color={colors.success} />
              ) : (
                <AppText style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                  {Math.round(pct)}%
                </AppText>
              )}
            </View>
          </View>
        </View>

        <View style={{ flex: 1, marginLeft: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText style={{ fontWeight: '700', fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
              {goal.name}
            </AppText>
            {goal.is_completed && (
              <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
                <AppText style={{ fontSize: 10, color: colors.success, fontWeight: '800' }}>DONE 🎉</AppText>
              </View>
            )}
          </View>

          <AppText style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
            {formatMoney(goal.current_amount, goal.currency)} / {formatMoney(goal.target_amount, goal.currency)}
          </AppText>

          {daysLeft !== null && !goal.is_completed && (
            <AppText style={{ color: daysLeft < 7 ? colors.danger : colors.muted, fontSize: 12, marginTop: 4 }}>
              {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? 'Due today' : 'Overdue'}
            </AppText>
          )}

          <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
            {!goal.is_completed && (
              <IconButton icon="plus" size={20} iconSize={12} onPress={onContribute} style={{ backgroundColor: colors.surface2 }} />
            )}
            <IconButton icon="edit" size={20} iconSize={12} onPress={onEdit} style={{ backgroundColor: colors.surface2 }} />
            <IconButton icon="trash" size={20} iconSize={12} onPress={onDelete} style={{ backgroundColor: colors.surface2 }} color={colors.danger} />
          </View>
        </View>
      </View>
    </Card>
  );
}

// ── Add/Edit Goal Modal ────────────────────────────────────────
function GoalFormModal({
  visible,
  initial,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial?: Goal | null;
  onClose: () => void;
  onSave: (name: string, target: number, deadline: string | null) => Promise<void>;
}) {
  const { colors } = useContext(ThemeContext);
  const [name, setName] = useState(initial?.name || '');
  const [targetRaw, setTargetRaw] = useState(initial ? String(initial.target_amount) : '');
  const [deadline, setDeadline] = useState(initial?.deadline?.slice(0, 10) || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initial?.name || '');
      setTargetRaw(initial ? String(initial.target_amount) : '');
      setDeadline(initial?.deadline?.slice(0, 10) || '');
    }
  }, [visible, initial]);

  const isValidDate = () => {
    if (!deadline) return true;
    const d = new Date(deadline);
    if (isNaN(d.getTime())) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return d.getTime() >= today.getTime();
  };

  const isFormatCorrect = !deadline || /^\d{4}-\d{2}-\d{2}$/.test(deadline);

  const canSave = 
    name.trim().length >= 2 && 
    Number(targetRaw) > 0 && 
    isFormatCorrect && 
    isValidDate();

  const handle = async () => {
    if (!canSave) return;
    try {
      setSaving(true);
      await onSave(name.trim(), Number(targetRaw), deadline || null);
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <AppText style={{ fontWeight: '700', fontSize: 18, color: colors.text }}>
              {initial ? 'Edit Goal' : 'New Goal'}
            </AppText>
            <IconButton icon="x" size={24} onPress={onClose} />
          </View>

          <AppText muted style={{ fontSize: 13, marginBottom: 8 }}>Goal Name</AppText>
          <AppInput value={name} onChangeText={setName} placeholder="e.g. Vacation, Emergency Fund" />

          <View style={{ height: 16 }} />
          <AppText muted style={{ fontSize: 13, marginBottom: 8 }}>Target Amount</AppText>
          <AppInput value={targetRaw} onChangeText={setTargetRaw} keyboardType="decimal-pad" placeholder="e.g. 50000" />

          <View style={{ height: 16 }} />
          <AppText muted style={{ fontSize: 13, marginBottom: 8 }}>Deadline (optional, YYYY-MM-DD)</AppText>
          <AppInput 
            value={deadline} 
            onChangeText={setDeadline} 
            placeholder="e.g. 2026-12-31" 
            style={deadline && !isFormatCorrect ? { borderColor: colors.danger } : {}}
          />
          {deadline && !isValidDate() && isFormatCorrect && (
            <AppText style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>
              Deadline cannot be in the past
            </AppText>
          )}

          <AppButton title={initial ? 'Update Goal' : 'Create Goal'} onPress={handle} disabled={!canSave} loading={saving} style={{ marginTop: 24 }} />
        </View>
      </View>
    </Modal>
  );
}

// ── Contribute Modal ────────────────────────────────────────
function ContributeModal({
  visible,
  goal,
  onClose,
  onContribute,
}: {
  visible: boolean;
  goal: Goal | null;
  onClose: () => void;
  onContribute: (id: string, amount: number) => Promise<void>;
}) {
  const { colors } = useContext(ThemeContext);
  const [amountRaw, setAmountRaw] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setAmountRaw('');
  }, [visible]);

  const canSave = Number(amountRaw) > 0 && goal != null;

  const handle = async () => {
    if (!canSave || !goal) return;
    try {
      setSaving(true);
      await onContribute(goal.id, Number(amountRaw));
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to contribute');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <AppText style={{ fontWeight: '700', fontSize: 18, color: colors.text }}>Add Savings</AppText>
            <IconButton icon="x" size={24} onPress={onClose} />
          </View>
          {goal && (
            <AppText muted style={{ fontSize: 14, marginBottom: 16 }}>
              {goal.name} · {formatMoney(goal.target_amount - goal.current_amount, goal.currency)} remaining
            </AppText>
          )}
          <AppText muted style={{ fontSize: 13, marginBottom: 8 }}>Amount ({goal?.currency})</AppText>
          <AppInput value={amountRaw} onChangeText={setAmountRaw} keyboardType="decimal-pad" placeholder="e.g. 1000" />
          <AppButton title="Add to Goal" onPress={handle} disabled={!canSave} loading={saving} style={{ marginTop: 24 }} />
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────
export default function GoalsScreen({ navigation }: any) {
  const { colors, theme } = useContext(ThemeContext);
  const { currency: preferredCurrency } = useContext(ProfileContext);
  const { show } = useContext(NotificationsContext);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Goal | null>(null);
  const [contributeTarget, setContributeTarget] = useState<Goal | null>(null);
  const [celebratingId, setCelebratingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await GoalService.list();
      setGoals(data);
    } catch (e) {
      console.error('Failed to load goals:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (name: string, target: number, deadline: string | null) => {
    if (editTarget) {
      const updated = await GoalService.update(editTarget.id, name, target, preferredCurrency || 'LKR', deadline);
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    } else {
      const created = await GoalService.create(name, target, preferredCurrency || 'LKR', deadline);
      setGoals((prev) => [created, ...prev]);
      
      show({
        title: 'Goal Created!',
        body: `Your savings goal "${created.name}" has been set up successfully.`,
      });
    }
  };

  const handleContribute = async (id: string, amount: number) => {
    const goal = goals.find(g => g.id === id);
    const currency = goal?.currency || preferredCurrency || 'LKR';
    const updated = await GoalService.contribute(id, amount, currency);
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    if (updated.is_completed) {
      setCelebratingId(id);
      setTimeout(() => setCelebratingId(null), 3000);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Goal', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await GoalService.remove(id);
          setGoals((prev) => prev.filter((g) => g.id !== id));
        },
      },
    ]);
  };

  const active = goals.filter((g) => !g.is_completed);
  const completed = goals.filter((g) => g.is_completed);
  const cardShadow = theme === 'light' ? styles.cardShadowLight : {};

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent + '20', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="target" size={20} color={colors.accent} />
          </View>
          <AppText title style={{ fontSize: 24 }}>Savings</AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton icon="plus" size={36} onPress={() => { setEditTarget(null); setFormVisible(true); }} accessibilityLabel="Add goal" />
          <IconButton icon="x" size={36} onPress={() => navigation.goBack()} accessibilityLabel="Close" />
        </View>
      </View>

      {celebratingId && (
        <View style={[styles.celebrationBanner, { backgroundColor: colors.success + '20', borderColor: colors.success + '40' }]}>
          <AppText style={{ fontSize: 28 }}>🎉</AppText>
          <View style={{ marginLeft: 16 }}>
            <AppText style={{ fontWeight: '800', fontSize: 16, color: colors.success }}>Goal Completed!</AppText>
            <AppText muted style={{ fontSize: 13, marginTop: 2 }}>Congratulations — you did it!</AppText>
          </View>
        </View>
      )}

      {goals.length > 0 && (
        <View style={[styles.summaryCard, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <AppText style={{ fontSize: 28, fontWeight: '800', color: colors.accent }}>{active.length}</AppText>
            <AppText muted style={{ fontSize: 13, marginTop: 2 }}>Active Goals</AppText>
          </View>
          <View style={{ width: 1, backgroundColor: colors.border, height: 40 }} />
          <View style={{ alignItems: 'center', flex: 1 }}>
            <AppText style={{ fontSize: 28, fontWeight: '800', color: colors.success }}>{completed.length}</AppText>
            <AppText muted style={{ fontSize: 13, marginTop: 2 }}>Completed</AppText>
          </View>
        </View>
      )}

      <FlatList
        data={[...active, ...completed]}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scaleHeight(40) }}
        ListEmptyComponent={() => (
          !loading ? (
            <View style={[styles.emptyState, { borderColor: colors.border }]}>
              <Icon name="target" size={48} color={colors.muted} />
              <AppText style={{ color: colors.text, fontWeight: '700', marginTop: 16, fontSize: 18 }}>No savings goals yet</AppText>
              <AppText muted style={{ fontSize: 14, marginTop: 8, textAlign: 'center' }}>
                Tap the + button to set a savings target and track your progress toward your dreams.
              </AppText>
              <AppButton title="Create First Goal" onPress={() => { setEditTarget(null); setFormVisible(true); }} style={{ marginTop: 24, width: '100%' }} />
            </View>
          ) : (
            <AppText muted style={{ textAlign: 'center', marginTop: 40 }}>Loading goals…</AppText>
          )
        )}
        renderItem={({ item, index }) => {
          const isCompletedSectionHeader = index === active.length && completed.length > 0;
          return (
            <>
              {isCompletedSectionHeader && (
                <AppText style={{ fontSize: 14, fontWeight: '700', color: colors.muted, marginBottom: 12, marginTop: 8 }}>
                  Completed 🏆
                </AppText>
              )}
              <GoalCard
                goal={item}
                shadowStyle={cardShadow}
                onContribute={() => setContributeTarget(item)}
                onEdit={() => { setEditTarget(item); setFormVisible(true); }}
                onDelete={() => handleDelete(item.id, item.name)}
              />
            </>
          );
        }}
      />

      <GoalFormModal
        visible={formVisible}
        initial={editTarget}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
      />
      <ContributeModal
        visible={contributeTarget != null}
        goal={contributeTarget}
        onClose={() => setContributeTarget(null)}
        onContribute={handleContribute}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleHeight(24),
  },
  celebrationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 20,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 24,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 24,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardShadowLight: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
});
