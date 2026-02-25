import React, { useContext, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, Pressable } from 'react-native';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import { spacing, radius } from '../../theme/colors';
import { TransactionsContext, Tx } from '../../store/transactions';
import { AuthContext } from '../../store/auth';
import { scaleHeight } from '../../constants/size';
import { ThemeContext } from '../../store/theme';

const categories: Tx['category'][] = ['Food', 'Transport', 'Bills', 'Shopping', 'Income', 'Other'];

export default function AddTransactionScreen({ navigation }: any) {
  const { addTx } = useContext(TransactionsContext);
  const { userId } = useContext(AuthContext);
  const { colors } = useContext(ThemeContext);

  const [title, setTitle] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [category, setCategory] = useState<Tx['category']>('Food');
  const [isIncome, setIsIncome] = useState(false);
  const [saving, setSaving] = useState(false);

  const amount = useMemo(() => {
    const n = Number(amountRaw);
    return Number.isFinite(n) ? n : 0;
  }, [amountRaw]);

  const canSave = title.trim().length >= 2 && amount > 0 && userId;

  const save = async () => {
    if (!canSave) {
      Alert.alert('Missing info', 'Enter a title and amount.');
      return;
    }
    try {
      setSaving(true);
      const dateISO = new Date().toISOString().slice(0, 10);
      await addTx(
        {
          title: title.trim(),
          category: isIncome ? 'Income' : category,
          amount: isIncome ? amount : -amount,
          dateISO,
        },
        userId!,
      );
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <View style={styles.topRow}>
        <AppText title>Add</AppText>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <AppText style={{ color: colors.accent, fontWeight: '800' }}>Close</AppText>
        </Pressable>
      </View>

      <Card style={{ marginTop: 14 }}>
        <AppText muted style={{ marginBottom: 10, fontSize: 13 }}>
          Title
        </AppText>
        <AppInput value={title} onChangeText={setTitle} placeholder="e.g., Uber, Rent, Groceries" />

        <View style={{ height: 16 }} />

        <AppText muted style={{ marginBottom: 10, fontSize: 13 }}>
          Amount
        </AppText>
        <AppInput
          value={amountRaw}
          onChangeText={setAmountRaw}
          keyboardType="decimal-pad"
          placeholder="e.g., 12.50"
        />

        <View style={{ height: 18 }} />

        <View style={styles.chipsRow}>
          <Pressable onPress={() => setIsIncome(false)} style={[styles.chip, { backgroundColor: colors.surface2, borderColor: colors.border }, !isIncome && { backgroundColor: colors.danger, borderColor: 'transparent' }]}>
            <AppText style={{ fontSize: 18, marginBottom: 2 }}>↙</AppText>
            <AppText style={{ fontWeight: '800', fontSize: 13, color: !isIncome ? '#fff' : colors.text }}>Expense</AppText>
          </Pressable>
          <Pressable onPress={() => setIsIncome(true)} style={[styles.chip, { backgroundColor: colors.surface2, borderColor: colors.border }, isIncome && { backgroundColor: colors.success, borderColor: 'transparent' }]}>
            <AppText style={{ fontSize: 18, marginBottom: 2 }}>↗</AppText>
            <AppText style={{ fontWeight: '800', fontSize: 13, color: isIncome ? '#fff' : colors.text }}>Income</AppText>
          </Pressable>
        </View>

        {!isIncome ? (
          <>
            <AppText muted style={{ marginTop: 16, marginBottom: 10, fontSize: 13 }}>
              Category
            </AppText>
            <View style={styles.catWrap}>
              {categories
                .filter((c) => c !== 'Income')
                .map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[styles.cat, { backgroundColor: colors.surface2, borderColor: colors.border }, category === c && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                  >
                    <AppText style={{ fontWeight: '700', fontSize: 14, color: category === c ? colors.bg : colors.text }}>{c}</AppText>
                  </Pressable>
                ))}
            </View>
          </>
        ) : null}

        <AppButton title="Save Transaction" onPress={save} disabled={!canSave} loading={saving} style={{ marginTop: 20 }} />
      </Card>
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
    marginBottom: scaleHeight(30),
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    flex: 1,
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cat: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
});
