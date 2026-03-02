import React, { useContext, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import { ThemeContext } from '../../store/theme';
import { TransactionsContext, Tx } from '../../store/transactions';
import { AuthContext } from '../../store/auth';
import { spacing } from '../../theme/colors';
import { scaleHeight } from '../../constants/size';

export default function TransactionDetailScreen({ route, navigation }: any) {
  const { tx }: { tx: Tx } = route.params;
  const { colors } = useContext(ThemeContext);
  const { updateTx, removeTx } = useContext(TransactionsContext);
  const { userId } = useContext(AuthContext);

  const [title, setTitle] = useState(tx.title);
  const [amountRaw, setAmountRaw] = useState(String(Math.abs(tx.amount)));
  const [category, setCategory] = useState(tx.category);
  const [dateISO, setDateISO] = useState(tx.dateISO?.slice(0, 10) || new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const isIncome = tx.amount > 0;
  const amount = useMemo(() => {
    const n = Number(amountRaw);
    return Number.isFinite(n) ? n : 0;
  }, [amountRaw]);

  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(dateISO);
  const canSave = title.trim().length >= 2 && amount > 0 && dateOk && userId;

  const save = async () => {
    if (!canSave) {
      Alert.alert('Missing info', 'Check title, amount and date.');
      return;
    }
    try {
      setSaving(true);
      await updateTx(
        tx.id,
        {
          title: title.trim(),
          category: category.trim() || 'Other',
          amount: isIncome ? amount : -amount,
          dateISO,
        },
        userId!,
      );
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    Alert.alert('Delete transaction', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setSaving(true);
            await removeTx(tx.id);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to delete');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}> 
      <View style={styles.topRow}>
        <AppText title>Transaction</AppText>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <AppText style={{ color: colors.accent, fontWeight: '800' }}>Close</AppText>
        </Pressable>
      </View>

      <Card>
        <AppText muted style={{ marginBottom: 10, fontSize: 13 }}>
          Title
        </AppText>
        <AppInput value={title} onChangeText={setTitle} />

        <View style={{ height: 16 }} />

        <AppText muted style={{ marginBottom: 10, fontSize: 13 }}>
          Amount
        </AppText>
        <AppInput value={amountRaw} onChangeText={setAmountRaw} keyboardType="decimal-pad" />

        <View style={{ height: 16 }} />

        <AppText muted style={{ marginBottom: 10, fontSize: 13 }}>
          Category
        </AppText>
        <AppInput value={category} onChangeText={setCategory} />

        <View style={{ height: 16 }} />

        <AppText muted style={{ marginBottom: 10, fontSize: 13 }}>
          Date (YYYY-MM-DD)
        </AppText>
        <AppInput value={dateISO} onChangeText={setDateISO} />

        <AppButton title="Save" onPress={save} disabled={!canSave} loading={saving} style={{ marginTop: 18 }} />
        <AppButton
          title="Delete"
          onPress={del}
          loading={saving}
          variant="primary"
          style={{ marginTop: 10, backgroundColor: colors.danger, borderColor: 'transparent' }}
        />
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
    marginBottom: scaleHeight(20),
  },
});
