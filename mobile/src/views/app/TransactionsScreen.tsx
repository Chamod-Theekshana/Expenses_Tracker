import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Pressable, ScrollView, TextInput, SectionList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppText from '../../components/AppText';
import { spacing, radius } from '../../theme/colors';
import { TransactionsContext, Tx } from '../../store/transactions';
import { DateFilterContext } from '../../store/dateFilter';
import { AuthContext } from '../../store/auth';
import Icon from '../../components/Icon';
import IconButton from '../../components/IconButton';
import { ThemeContext } from '../../store/theme';
import { scaleHeight } from '../../constants/size';
import { formatMoney } from '../../utils/money';
import { getCategoryMeta } from '../../constants/categories';
import DateFilterSheet from '../../components/DateFilterSheet';

const TYPE_FILTERS = ['All', 'Expense', 'Income'] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

export default function TransactionsScreen() {
  const navigation: any = useNavigation();
  const { items, removeTx, fetchTransactions } = useContext(TransactionsContext);
  const { userId } = useContext(AuthContext);
  const { colors, theme } = useContext(ThemeContext);
  const { loading } = useContext(TransactionsContext);
  const { matchesFilter, hasActiveFilter, filterLabel } = useContext(DateFilterContext);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortNewest, setSortNewest] = useState(true);
  const [isDateFilterVisible, setIsDateFilterVisible] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchTransactions(userId);
    }
  }, [userId, fetchTransactions]);

  const categories = useMemo(() => {
    return [...new Set(items.map((t) => t.category))].sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items.filter(t => matchesFilter(t.dateISO));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    if (typeFilter === 'Expense') result = result.filter(t => t.amount < 0);
    else if (typeFilter === 'Income') result = result.filter(t => t.amount > 0);
    if (selectedCategory) result = result.filter(t => t.category === selectedCategory);

    result.sort((a, b) => {
      const da = new Date(a.dateISO).getTime();
      const db = new Date(b.dateISO).getTime();
      return sortNewest ? db - da : da - db;
    });

    return result;
  }, [items, search, typeFilter, selectedCategory, sortNewest, matchesFilter]);

  const groupedItems = useMemo(() => {
    const groups: { title: string; data: Tx[] }[] = [];
    filteredItems.forEach(item => {
      const dateObj = new Date(item.dateISO);
      const now = new Date();
      const isToday = now.toDateString() === dateObj.toDateString();
      const isYesterday = new Date(now.getTime() - 86400000).toDateString() === dateObj.toDateString();
      const dayLabel = isToday ? 'Today' : isYesterday ? 'Yesterday' : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const group = groups.find(g => g.title === dayLabel);
      if (group) group.data.push(item);
      else groups.push({ title: dayLabel, data: [item] });
    });
    return groups;
  }, [filteredItems]);

  const hasFilters = search.trim().length > 0 || typeFilter !== 'All' || selectedCategory !== '' || hasActiveFilter;

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('All');
    setSelectedCategory('');
  };

  const handleDelete = async (id: string) => {
    try {
      await removeTx(id, userId!);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to delete transaction');
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <AppText title style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>
          Transactions
        </AppText>
        <Pressable onPress={() => setIsDateFilterVisible(true)} style={[styles.dateFilterBtn, { backgroundColor: colors.surface2 }]}>
          <Icon name="calendar" size={18} color={hasActiveFilter ? colors.accent : colors.text} />
          {hasActiveFilter && <View style={[styles.activeFilterDot, { backgroundColor: colors.accent }]} />}
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
          {TYPE_FILTERS.map((type) => {
            const active = typeFilter === type;
            return (
              <Pressable
                key={type}
                onPress={() => setTypeFilter(active ? 'All' : type)}
                style={[
                  styles.chip,
                  { backgroundColor: active ? colors.accent : colors.surface2, borderColor: colors.border }
                ]}
              >
                <AppText style={{ fontWeight: '600', fontSize: 13, color: active ? '#FFF' : colors.text }}>{type}</AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ paddingTop: 30 }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}

      <SectionList
        sections={groupedItems}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={{ paddingTop: 30, alignItems: 'center' }}>
            {hasFilters ? (
              <>
                <Icon name="search" size={28} color={colors.muted} />
                <AppText style={{ marginTop: 8, color: colors.muted }}>No transactions match your filters.</AppText>
                <Pressable onPress={clearFilters} style={{ marginTop: 12 }}>
                  <AppText style={{ color: colors.accent, fontWeight: '600' }}>Clear filters</AppText>
                </Pressable>
              </>
            ) : (
              <>
                <Icon name="file-text" size={32} color={colors.muted} />
                <AppText style={{ color: colors.muted, marginTop: 12 }}>No transactions yet.</AppText>
              </>
            )}
          </View>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <AppText style={[styles.dateHeader, { color: colors.muted }]}>{title}</AppText>
        )}
        renderItem={({ item, index, section }) => {
          const isLast = index === section.data.length - 1;
          const isFirst = index === 0;
          const isIncome = item.amount > 0;
          const cur = item.currency || 'LKR';
          const catMeta = getCategoryMeta(item.category);
          const timeStr = new Date(item.dateISO).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

          return (
            <View style={[
               styles.txRowWrap,
               isFirst && { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
               isLast && { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
               { backgroundColor: colors.surface }
            ]}>
              <Pressable
                onPress={() => navigation.navigate('TxDetail', { tx: item })}
                onLongPress={() => {
                  Alert.alert('Transaction', 'Delete this item?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item.id) },
                  ]);
                }}
                delayLongPress={350}
                style={({ pressed }) => [
                  styles.txRow,
                  !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <View style={[styles.txIcon, { backgroundColor: catMeta.color + '20' }]}>
                  <Icon name={catMeta.icon} size={18} color={catMeta.color} />
                </View>
                <View style={styles.txInfo}>
                  <AppText style={{ fontWeight: '600', fontSize: 15, color: colors.text }}>{item.title}</AppText>
                  <AppText style={{ fontSize: 12, marginTop: 2, color: colors.muted }}>
                    {item.category} • {timeStr}
                  </AppText>
                </View>
                <AppText style={{ fontWeight: '700', fontSize: 15, color: isIncome ? colors.success : colors.danger }}>
                  {isIncome ? '+' : '-'}{formatMoney(Math.abs(item.amount), cur)}
                </AppText>
              </Pressable>
            </View>
          );
        }}
      />
      
      <DateFilterSheet visible={isDateFilterVisible} onClose={() => setIsDateFilterVisible(false)} />
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
    marginBottom: 20,
  },
  dateFilterBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilterDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dateHeader: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  txRowWrap: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  txInfo: {
    flex: 1,
  },
});
