import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, Pressable, ScrollView } from 'react-native';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import { spacing, radius } from '../../theme/colors';
import { TransactionsContext, Tx } from '../../store/transactions';
import { AuthContext } from '../../store/auth';
import { scaleHeight } from '../../constants/size';
import { ThemeContext } from '../../store/theme';
import { ProfileContext } from '../../store/profile';
import { CategoryService, Category } from '../../services/CategoryService';

const fallbackExpenseCategories = ['Food', 'Transport', 'Bills', 'Shopping', 'Other'];
const CURRENCY_OPTIONS = ['LKR', 'USD', 'EUR', 'GBP'];

export default function AddTransactionScreen({ navigation }: any) {
  const { addTx } = useContext(TransactionsContext);
  const { userId } = useContext(AuthContext);
  const { colors } = useContext(ThemeContext);
  const { currency: preferredCurrency } = useContext(ProfileContext);

  const [title, setTitle] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [category, setCategory] = useState<string>('Food');
  const [isIncome, setIsIncome] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateISO, setDateISO] = useState(() => new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState(preferredCurrency || 'LKR');

  const [catLoading, setCatLoading] = useState(false);
  const [cats, setCats] = useState<Category[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setCatLoading(true);
        const list = await CategoryService.list();
        setCats(list);
        const firstExpense = list.find((c) => c.type === 'expense' || c.type === 'both');
        if (firstExpense?.name) setCategory(firstExpense.name);
      } catch {
        // fall back to static
      } finally {
        setCatLoading(false);
      }
    })();
  }, []);

  const amount = useMemo(() => {
    const n = Number(amountRaw);
    return Number.isFinite(n) ? n : 0;
  }, [amountRaw]);

  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(dateISO);
  const canSave = title.trim().length >= 2 && amount > 0 && userId && dateOk;

  const save = async () => {
    if (!canSave) {
      Alert.alert('Missing info', 'Enter a title and amount.');
      return;
    }
    try {
      setSaving(true);
      await addTx(
        {
          title: title.trim(),
          category: isIncome ? 'Income' : category,
          amount: isIncome ? amount : -amount,
          currency,
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
  const Wrapper = isIncome ? View : ScrollView;

  return (
    <Wrapper style={[styles.wrap, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false} contentContainerStyle={!isIncome ? { paddingBottom: scaleHeight(50) } : undefined}>
      <View style={styles.topRow}>
        <AppText title>Add</AppText>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <AppText style={{ color: colors.accent, fontWeight: '600' }}>Close</AppText>
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

        <AppText muted style={{ marginBottom: 10, fontSize: 13 }}>
          Date (YYYY-MM-DD)
        </AppText>
        <AppInput value={dateISO} onChangeText={setDateISO} placeholder="2026-02-27" />

        <View style={{ height: 18 }} />

        <AppText muted style={{ marginBottom: 10, fontSize: 13 }}>
          Currency
        </AppText>
        <View style={styles.chipsRow}>
          {CURRENCY_OPTIONS.map((cur) => (
            <Pressable
              key={cur}
              onPress={() => setCurrency(cur)}
              style={[
                styles.currencyChip,
                { backgroundColor: colors.surface2, borderColor: colors.border },
                currency === cur && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
            >
              <AppText style={{ fontWeight: '700', fontSize: 13, color: currency === cur ? '#000' : colors.text }}>
                {cur}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 18 }} />
      
        <View style={styles.chipsRow}>
          <Pressable onPress={() => setIsIncome(false)} style={[styles.chip, { backgroundColor: colors.surface2, borderColor: colors.border }, !isIncome && { backgroundColor: colors.danger, borderColor: 'transparent' }]}>
            <AppText style={{ fontSize: 18, marginBottom: 2 }}>↙</AppText>
            <AppText style={{ fontWeight: '700', fontSize: 13, color: !isIncome ? '#FFF' : colors.text }}>Expense</AppText>
          </Pressable>
          <Pressable onPress={() => setIsIncome(true)} style={[styles.chip, { backgroundColor: colors.surface2, borderColor: colors.border }, isIncome && { backgroundColor: colors.success, borderColor: 'transparent' }]}>
            <AppText style={{ fontSize: 18, marginBottom: 2 }}>↗</AppText>
            <AppText style={{ fontWeight: '700', fontSize: 13, color: isIncome ? '#FFF' : colors.text }}>Income</AppText>
          </Pressable>
        </View>

        {!isIncome ? (
          <>
            <AppText muted style={{ marginTop: 16, marginBottom: 10, fontSize: 13 }}>
              Category
            </AppText>
            <View style={styles.catWrap}>
              {(cats.length
                ? cats
                    .filter((c) => c.type === 'expense' || c.type === 'both')
                    .map((c) => c.name)
                : fallbackExpenseCategories
              ).map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[styles.cat, { backgroundColor: colors.surface2, borderColor: colors.border }, category === c && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                  >
                    <AppText style={{ fontWeight: '600', fontSize: 14, color: category === c ? '#FFF' : colors.text }}>{c}</AppText>
                  </Pressable>
                ))}
            </View>
            {!cats.length && !catLoading ? (
              <AppText muted style={{ marginTop: 10, fontSize: 12 }}>
                Using built-in categories (could not load from server).
              </AppText>
            ) : null}
          </>
        ) : null}

        <AppButton title="Save Transaction" onPress={save} disabled={!canSave} loading={saving} style={{ marginTop: 20 }} />
      </Card>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: spacing.lg,
    marginTop: scaleHeight(30),
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
    borderRadius: radius.md,
    borderWidth: 1,
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
    borderWidth: 1,
  },
  currencyChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
