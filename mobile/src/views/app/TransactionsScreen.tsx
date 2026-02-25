import React, { useContext, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import AppText from '../../components/AppText';
import { spacing } from '../../theme/colors';
import { TransactionsContext } from '../../store/transactions';
import { AuthContext } from '../../store/auth';
import TransactionItem from '../../components/TransactionItem';
import { ThemeContext } from '../../store/theme';
import { scaleHeight } from '../../constants/size';

export default function TransactionsScreen() {
  const { items, removeTx, fetchTransactions } = useContext(TransactionsContext);
  const { userId } = useContext(AuthContext);
  const { colors } = useContext(ThemeContext);

  useEffect(() => {
    if (userId) {
      fetchTransactions(userId);
    }
  }, [userId, fetchTransactions]);

  const handleDelete = async (id: string) => {
    try {
      await removeTx(id);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to delete transaction');
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <AppText title style={{ fontSize: 28 }}>
          All Transactions
        </AppText>
        <AppText muted style={{ marginTop: 4, fontSize: 14 }}>
          {items.length} total
        </AppText>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <TransactionItem
            item={item}
            onPress={() => {
              Alert.alert('Transaction', 'Delete this item?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item.id) },
              ]);
            }}
          />
        )}
        contentContainerStyle={{ paddingBottom: 28 }}
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
  header: {
    marginBottom: 20,
  },
});
