import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import Screen from '../../components/Screen';
import IconButton from '../../components/IconButton';
import Icon from '../../components/Icon';
import Chip from '../../components/Chip';
import { ThemeContext } from '../../store/theme';
import { GoalService, Goal } from '../../services/GoalService';
import { radius, spacing } from '../../theme/colors';
import { formatMoney } from '../../utils/money';

const CURRENCY_OPTIONS = ['LKR', 'USD', 'EUR', 'GBP'];

// ── Animated circular progress ring ────────────────────────────
function GoalRing({
  percentage,
  size = 80,
  strokeWidth = 8,
  color,
  trackColor,
  completed,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor: string;
  completed: boolean;
}) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const clampedPct = Math.min(percentage, 100);
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  const shimmer = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (completed) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmer, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
          Animated.timing(shimmer, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        ]),
      ).start();
    }
  }, [completed]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] });

  return (
    <Animated.View style={{ opacity: completed ? opacity : 1 }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx}, ${cy}`}
        />
      </Svg>
    </Animated.View>
  );
}

// ── Goal Card ────────────────────────────────────────────────
function GoalCard({
  goal,
  onContribute,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  onContribute: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors } = useContext(ThemeContext);
  const pct = Math.min(goal.progress_percentage, 100);
  const ringColor = goal.is_completed ? colors.success : colors.accent;
  const daysLeft = goal.deadline
    ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <Card style={{ marginBottom: 14 }}>
      <View style={styles.goalRow}>
        <View style={{ position: 'relative' }}>
          <GoalRing
            percentage={pct}
            color={ringColor}
            trackColor={colors.border}
            completed={goal.is_completed}
          />
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              {goal.is_completed ? (
                <Icon name="check" size={20} color={colors.success} />
              ) : (
                <AppText style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                  {Math.round(pct)}%
                </AppText>
              )}
            </View>
          </View>
        </View>

        <View style={{ flex: 1, marginLeft: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText style={{ fontWeight: '700', fontSize: 15, color: colors.text, flex: 1 }} numberOfLines={1}>
              {goal.name}
            </AppText>
            {goal.is_completed && (
              <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
                <AppText style={{ fontSize: 10, color: colors.success, fontWeight: '700' }}>DONE 🎉</AppText>
              </View>
            )}
          </View>

          <AppText style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
            {formatMoney(goal.current_amount, goal.currency)} / {formatMoney(goal.target_amount, goal.currency)}
          </AppText>

          {daysLeft !== null && !goal.is_completed && (
            <AppText style={{ color: daysLeft < 7 ? colors.danger : colors.muted, fontSize: 11, marginTop: 2 }}>
              {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? 'Due today' : 'Overdue'}
            </AppText>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 4 }}>
          {!goal.is_completed && (
            <IconButton icon="plus" size={18} onPress={onContribute} />
          )}
          <IconButton icon="edit" size={18} onPress={onEdit} />
          <IconButton icon="trash" size={18} onPress={onDelete} />
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border, marginTop: 12 }]}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${pct}%` as any,
              backgroundColor: goal.is_completed ? colors.success : colors.accent,
            },
          ]}
        />
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
  onSave: (name: string, target: number, currency: string, deadline: string | null) => Promise<void>;
}) {
  const { colors } = useContext(ThemeContext);
  const [name, setName] = useState(initial?.name || '');
  const [targetRaw, setTargetRaw] = useState(initial ? String(initial.target_amount) : '');
  const [currency, setCurrency] = useState(initial?.currency || 'LKR');
  const [deadline, setDeadline] = useState(initial?.deadline?.slice(0, 10) || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initial?.name || '');
      setTargetRaw(initial ? String(initial.target_amount) : '');
      setCurrency(initial?.currency || 'LKR');
      setDeadline(initial?.deadline?.slice(0, 10) || '');
    }
  }, [visible, initial]);

  const canSave = name.trim().length >= 2 && Number(targetRaw) > 0;

  const handle = async () => {
    if (!canSave) return;
    try {
      setSaving(true);
      await onSave(name.trim(), Number(targetRaw), currency, deadline || null);
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
            <IconButton icon="x" onPress={onClose} />
          </View>

          <AppText muted style={{ fontSize: 13, marginBottom: 8 }}>Goal Name</AppText>
          <AppInput value={name} onChangeText={setName} placeholder="e.g. Vacation, Emergency Fund" />

          <View style={{ height: 14 }} />
          <AppText muted style={{ fontSize: 13, marginBottom: 8 }}>Target Amount</AppText>
          <AppInput value={targetRaw} onChangeText={setTargetRaw} keyboardType="decimal-pad" placeholder="e.g. 50000" />

          <View style={{ height: 14 }} />
          <AppText muted style={{ fontSize: 13, marginBottom: 8 }}>Currency</AppText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {CURRENCY_OPTIONS.map((c) => (
              <View key={c} style={{ flex: 1 }}>
                <Chip label={c} selected={currency === c} onPress={() => setCurrency(c)} size="sm" style={{ justifyContent: 'center' }} />
              </View>
            ))}
          </View>

          <View style={{ height: 14 }} />
          <AppText muted style={{ fontSize: 13, marginBottom: 8 }}>Deadline (optional, YYYY-MM-DD)</AppText>
          <AppInput value={deadline} onChangeText={setDeadline} placeholder="e.g. 2025-12-31" />

          <AppButton title={initial ? 'Update Goal' : 'Create Goal'} onPress={handle} disabled={!canSave} loading={saving} style={{ marginTop: 20 }} />
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
            <IconButton icon="x" onPress={onClose} />
          </View>
          {goal && (
            <AppText muted style={{ fontSize: 13, marginBottom: 14 }}>
              {goal.name} · {formatMoney(goal.target_amount - goal.current_amount, goal.currency)} remaining
            </AppText>
          )}
          <AppText muted style={{ fontSize: 13, marginBottom: 8 }}>Amount ({goal?.currency})</AppText>
          <AppInput value={amountRaw} onChangeText={setAmountRaw} keyboardType="decimal-pad" placeholder="e.g. 1000" />
          <AppButton title="Add to Goal" onPress={handle} disabled={!canSave} loading={saving} style={{ marginTop: 20 }} />
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────
export default function GoalsScreen({ navigation }: any) {
  const { colors } = useContext(ThemeContext);
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

  const handleSave = async (name: string, target: number, currency: string, deadline: string | null) => {
    if (editTarget) {
      const updated = await GoalService.update(editTarget.id, name, target, currency, deadline);
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    } else {
      const created = await GoalService.create(name, target, currency, deadline);
      setGoals((prev) => [created, ...prev]);
    }
  };

  const handleContribute = async (id: string, amount: number) => {
    const updated = await GoalService.contribute(id, amount);
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

  return (
    <Screen preset="scroll" padded>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="target" size={24} color={colors.accent} />
          <AppText title>Savings Goals</AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton icon="plus" onPress={() => { setEditTarget(null); setFormVisible(true); }} accessibilityLabel="Add goal" />
          <IconButton icon="x" onPress={() => navigation.goBack()} accessibilityLabel="Close" />
        </View>
      </View>

      {/* Celebration banner */}
      {celebratingId && (
        <Card style={{ backgroundColor: colors.success + '20', borderColor: colors.success + '40', marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <AppText style={{ fontSize: 24 }}>🎉</AppText>
            <View>
              <AppText style={{ fontWeight: '700', color: colors.success }}>Goal Completed!</AppText>
              <AppText muted style={{ fontSize: 12 }}>Congratulations — you did it!</AppText>
            </View>
          </View>
        </Card>
      )}

      {/* Summary bar */}
      {goals.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <AppText style={{ fontSize: 22, fontWeight: '800', color: colors.accent }}>{active.length}</AppText>
              <AppText muted style={{ fontSize: 12 }}>Active</AppText>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <View style={{ alignItems: 'center' }}>
              <AppText style={{ fontSize: 22, fontWeight: '800', color: colors.success }}>{completed.length}</AppText>
              <AppText muted style={{ fontSize: 12 }}>Completed</AppText>
            </View>
          </View>
        </Card>
      )}

      {loading && (
        <AppText muted style={{ textAlign: 'center', marginTop: 20 }}>Loading goals…</AppText>
      )}

      {!loading && goals.length === 0 && (
        <View style={{ alignItems: 'center', marginTop: 60 }}>
          <Icon name="target" size={48} color={colors.muted} />
          <AppText style={{ color: colors.muted, marginTop: 14, fontSize: 16 }}>No savings goals yet</AppText>
          <AppText muted style={{ fontSize: 13, marginTop: 6, textAlign: 'center' }}>
            Tap + to set a savings target and track your progress
          </AppText>
          <AppButton title="Create First Goal" onPress={() => { setEditTarget(null); setFormVisible(true); }} style={{ marginTop: 20 }} />
        </View>
      )}

      {active.map((g) => (
        <GoalCard
          key={g.id}
          goal={g}
          onContribute={() => setContributeTarget(g)}
          onEdit={() => { setEditTarget(g); setFormVisible(true); }}
          onDelete={() => handleDelete(g.id, g.name)}
        />
      ))}

      {completed.length > 0 && (
        <>
          <AppText muted style={{ fontSize: 13, marginBottom: 10, marginTop: 4 }}>Completed 🏆</AppText>
          {completed.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onContribute={() => setContributeTarget(g)}
              onEdit={() => { setEditTarget(g); setFormVisible(true); }}
              onDelete={() => handleDelete(g.id, g.name)}
            />
          ))}
        </>
      )}

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
});
