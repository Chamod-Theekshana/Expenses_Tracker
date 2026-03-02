import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, Image, ScrollView } from 'react-native';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import { spacing, radius } from '../../theme/colors';
import { TransactionsContext } from '../../store/transactions';
import { AuthContext } from '../../store/auth';
import { ProfileContext } from '../../store/profile';
import { formatMoney } from '../../utils/money';
import TransactionItem from '../../components/TransactionItem';
import { scaleHeight } from '../../constants/size';
import { ThemeContext } from '../../store/theme';
import { images } from '../../constants/images';
import { BudgetService, BudgetStatus } from '../../services/BudgetService';

export default function HomeScreen({ navigation }: any) {
  const { items } = useContext(TransactionsContext);
  const { userEmail } = useContext(AuthContext);
  const { name, profilePhoto } = useContext(ProfileContext);
  const { colors } = useContext(ThemeContext);

  const [allBudgets, setAllBudgets] = useState<BudgetStatus[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetStatus[]>([]);

  const stats = useMemo(() => {
    const income = items.filter(t => t.amount > 0).reduce((a, b) => a + b.amount, 0);
    const expense = items.filter(t => t.amount < 0).reduce((a, b) => a + b.amount, 0);
    const balance = income + expense;
    return { income, expense, balance };
  }, [items]);

  const recent = items.slice(0, 5);

  // Load budget statuses
  useEffect(() => {
    (async () => {
      try {
        const statuses = await BudgetService.getStatus();
        setAllBudgets(statuses);
        setBudgetAlerts(statuses.filter(b => b.percentage >= 70));
      } catch {
        // silently fail — budgets are supplementary
      }
    })();
  }, [items]); // Re-fetch when transactions change

  return (
    <ScrollView style={[styles.wrap, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.profileHeader, { backgroundColor: colors.surface }]}>
        {profilePhoto ? (
          <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
        ) : (
          <View style={[styles.profilePlaceholder, { backgroundColor: colors.accent }]}>
            <AppText style={[styles.profileInitial, { color: colors.bg }]}>{name.charAt(0).toUpperCase() || 'U'}</AppText>
          </View>
        )}
        <View style={styles.profileInfo}>
          <AppText style={[styles.greeting, { color: colors.text }]}>Hi, {name || 'User'}!</AppText>
          <AppText style={[styles.email, { color: colors.muted }]}>{userEmail}</AppText>
        </View>
      </View>

      <Card elevated style={{ marginTop: 20 }}>
        <AppText muted style={{ fontSize: 13 }}>Total Balance</AppText>
        <AppText title mono style={{ marginTop: 10, fontSize: 36 }}>
          {formatMoney(stats.balance)}
        </AppText>

        <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 12, marginTop: 20 }}>
          <View style={[styles.pill, { backgroundColor: 'rgba(77,255,136,0.12)', borderColor: 'rgba(77,255,136,0.3)' }]}>

            <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
              <View style={styles.pillIcon}>
                <Image source={images.income} style={styles.Image} />
              </View>
              <AppText muted style={{ fontSize: 12 }}>Income</AppText>
            </View>

            <AppText mono style={{ marginTop: 4, fontWeight: '800', fontSize: 16, color: colors.success }}>
              {formatMoney(stats.income)}
            </AppText>

          </View>
          <View style={[styles.pill, { backgroundColor: 'rgba(255,77,77,0.10)', borderColor: 'rgba(255,77,77,0.3)' }]}>

            <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
              <View style={styles.pillIcon}>
                <Image source={images.expense} style={styles.Image} />
              </View>
              <AppText muted style={{ fontSize: 12 }}>Expense</AppText>
            </View>

            <AppText mono style={{ marginTop: 4, fontWeight: '800', fontSize: 16 }}>
              {formatMoney(stats.expense)}
            </AppText>

          </View>
        </View>
      </Card>

      {/* Budgets Section — always visible */}
      <View style={styles.sectionRow}>
        <AppText style={{ fontWeight: '800', fontSize: 17 }}>Budgets</AppText>
        <Pressable onPress={() => navigation.getParent()?.navigate('Budgets')} hitSlop={10}>
          <AppText style={{ color: colors.accent, fontWeight: '800', fontSize: 14 }}>Manage →</AppText>
        </Pressable>
      </View>

      {allBudgets.length > 0 ? (
        budgetAlerts.length > 0 ? (
          <>
            {budgetAlerts.map((b) => {
              const barColor = b.percentage >= 100 ? colors.danger : b.percentage >= 80 ? '#FFAA00' : colors.success;
              const clampedPct = Math.min(b.percentage, 100);
              return (
                <Card key={b.id} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText style={{ fontWeight: '700', fontSize: 14 }}>{b.category}</AppText>
                    <AppText style={{ fontWeight: '800', fontSize: 13, color: barColor }}>
                      {b.percentage}%
                    </AppText>
                  </View>
                  <View style={[styles.budgetTrack, { backgroundColor: colors.surface2, marginTop: 8 }]}>
                    <View
                      style={{
                        height: '100%',
                        width: `${clampedPct}%`,
                        backgroundColor: barColor,
                        borderRadius: 4,
                      }}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                    <AppText muted style={{ fontSize: 11 }}>{formatMoney(b.spent)} spent</AppText>
                    <AppText muted style={{ fontSize: 11 }}>{formatMoney(b.amount)} limit</AppText>
                  </View>
                </Card>
              );
            })}
          </>
        ) : (
          <Card style={{ alignItems: 'center', paddingVertical: 16 }}>
            <AppText style={{ fontSize: 14, color: colors.success, fontWeight: '700' }}>✅ All budgets on track</AppText>
            <AppText muted style={{ fontSize: 12, marginTop: 4 }}>{allBudgets.length} budget{allBudgets.length > 1 ? 's' : ''} within limits</AppText>
          </Card>
        )
      ) : (
        <Pressable onPress={() => navigation.getParent()?.navigate('Budgets')}>
          <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
            <AppText style={{ fontSize: 28, marginBottom: 6 }}>💰</AppText>
            <AppText style={{ fontWeight: '700', fontSize: 14 }}>No budgets set yet</AppText>
            <AppText muted style={{ fontSize: 12, marginTop: 4, textAlign: 'center' }}>
              Set monthly limits per category to track your spending
            </AppText>
            <AppText style={{ color: colors.accent, fontWeight: '800', fontSize: 13, marginTop: 10 }}>
              + Set Budget
            </AppText>
          </Card>
        </Pressable>
      )}

      {/* Recurring Section */}
      <View style={styles.sectionRow}>
        <AppText style={{ fontWeight: '800', fontSize: 17 }}>Recurring</AppText>
        <Pressable onPress={() => navigation.getParent()?.navigate('Recurring')} hitSlop={10}>
          <AppText style={{ color: colors.accent, fontWeight: '800', fontSize: 14 }}>Manage →</AppText>
        </Pressable>
      </View>
      <Pressable onPress={() => navigation.getParent()?.navigate('Recurring')}>
        <Card style={{ alignItems: 'center', paddingVertical: 16 }}>
          <AppText style={{ fontSize: 24, marginBottom: 4 }}>🔄</AppText>
          <AppText style={{ fontWeight: '700', fontSize: 13 }}>Auto-repeat transactions</AppText>
          <AppText muted style={{ fontSize: 12, marginTop: 4, textAlign: 'center' }}>
            Set up daily, weekly, monthly or yearly recurring expenses & income
          </AppText>
          <AppText style={{ color: colors.accent, fontWeight: '800', fontSize: 13, marginTop: 8 }}>
            + Add Recurring
          </AppText>
        </Card>
      </Pressable>

      <View style={styles.sectionRow}>
        <AppText style={{ fontWeight: '800', fontSize: 17 }}>Recent Transactions</AppText>
        <Pressable onPress={() => navigation.navigate('Transactions')} hitSlop={10}>
          <AppText style={{ color: colors.accent, fontWeight: '800', fontSize: 14 }}>View all →</AppText>
        </Pressable>
      </View>

      {recent.map((item) => (
        <View key={item.id} style={{ marginBottom: 10 }}>
          <TransactionItem item={item} onPress={() => navigation.navigate('Transactions')} />
        </View>
      ))}

      <View style={{ height: 28 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: spacing.lg,
    marginTop: scaleHeight(50),
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleHeight(20),
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  profilePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  profileInitial: {
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
  },
  email: {
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  pillIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionRow: {
    marginTop: 24,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  Image: {
    width: 38,
    height: 38,
    tintColor: '#FFFF',
    resizeMode: 'contain'
  }
});
