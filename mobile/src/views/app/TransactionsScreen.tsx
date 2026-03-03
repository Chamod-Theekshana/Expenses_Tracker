import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, Alert, ActivityIndicator, Pressable, ScrollView, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppText from '../../components/AppText';
import { spacing, radius } from '../../theme/colors';
import { TransactionsContext } from '../../store/transactions';
import { DateFilterContext } from '../../store/dateFilter';
import { AuthContext } from '../../store/auth';
import TransactionItem from '../../components/TransactionItem';
import { ThemeContext } from '../../store/theme';
import { scaleHeight } from '../../constants/size';

const TYPE_FILTERS = ['All', 'Expense', 'Income'] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

export default function TransactionsScreen() {
  const navigation: any = useNavigation();
  const { items, removeTx, fetchTransactions } = useContext(TransactionsContext);
  const { userId } = useContext(AuthContext);
  const { colors } = useContext(ThemeContext);
  const { loading } = useContext(TransactionsContext);
  const { matchesFilter, hasActiveFilter, filterLabel } = useContext(DateFilterContext);

  // Filter state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortNewest, setSortNewest] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchTransactions(userId);
    }
  }, [userId, fetchTransactions]);

  // Get unique categories from transactions
  const categories = useMemo(() => {
    const cats = [...new Set(items.map((t) => t.category))].sort();
    return cats;
  }, [items]);

  // Apply all filters
  const filteredItems = useMemo(() => {
    // Apply global date filter first
    let result = items.filter(t => matchesFilter(t.dateISO));

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }

    // Type filter
    if (typeFilter === 'Expense') {
      result = result.filter((t) => t.amount < 0);
    } else if (typeFilter === 'Income') {
      result = result.filter((t) => t.amount > 0);
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter((t) => t.category === selectedCategory);
    }

    // Sort
    result.sort((a, b) => {
      const da = new Date(a.dateISO).getTime();
      const db = new Date(b.dateISO).getTime();
      return sortNewest ? db - da : da - db;
    });

    return result;
  }, [items, search, typeFilter, selectedCategory, sortNewest, matchesFilter]);

  const hasFilters = search.trim().length > 0 || typeFilter !== 'All' || selectedCategory !== '';

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('All');
    setSelectedCategory('');
  };

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
          Transactions
        </AppText>
        <AppText muted style={{ marginTop: 4, fontSize: 14 }}>
          {hasFilters
            ? `${filteredItems.length} of ${items.length} transactions`
            : `${items.length} total`}
        </AppText>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AppText style={{ fontSize: 16, color: colors.muted }}>🔍</AppText>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by title or category..."
          placeholderTextColor={colors.muted}
          style={[styles.searchInput, { color: colors.text }]}
          autoCorrect={false}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={10}>
            <AppText style={{ fontSize: 16, color: colors.muted }}>✕</AppText>
          </Pressable>
        )}
      </View>

      {/* Type Filter Row */}
      <View style={styles.filterRow}>
        {TYPE_FILTERS.map((type) => {
          const active = typeFilter === type;
          const chipColor =
            type === 'Expense' ? colors.danger : type === 'Income' ? colors.success : colors.accent;
          return (
            <Pressable
              key={type}
              onPress={() => setTypeFilter(active ? 'All' : type)}
              style={[
                styles.typeChip,
                { backgroundColor: colors.surface2, borderColor: colors.border },
                active && { backgroundColor: chipColor, borderColor: chipColor },
              ]}
            >
              <AppText
                style={{
                  fontWeight: '600',
                  fontSize: 13,
                  color: active ? '#FFF' : colors.text,
                }}
              >
                {type}
              </AppText>
            </Pressable>
          );
        })}

        {/* Sort Toggle */}
        <Pressable
          onPress={() => setSortNewest(!sortNewest)}
          style={[styles.sortBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
        >
          <AppText style={{ fontWeight: '600', fontSize: 12, color: colors.text }}>
            {sortNewest ? '↓ Newest' : '↑ Oldest'}
          </AppText>
        </Pressable>
      </View>

      {/* Category Chips */}
      {categories.length > 0 && (
        <View>
          <ScrollView horizontal style={styles.catWrap} showsHorizontalScrollIndicator={false}>
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(active ? '' : cat)}
                  style={[
                    styles.catChip,
                    { backgroundColor: colors.surface2, borderColor: colors.border },
                    active && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                >
                  <AppText
                    style={{
                      fontWeight: '600',
                      fontSize: 12,
                      color: active ? '#FFF' : colors.text,
                    }}
                  >
                    {cat}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Clear Filters */}
      {hasFilters && (
        <Pressable onPress={clearFilters} style={styles.clearBtn}>
          <AppText style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }}>
            ✕ Clear filters
          </AppText>
        </Pressable>
      )}

      {/* Action Row */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 }}>
        <Pressable onPress={() => navigation.navigate('Categories')} hitSlop={10}>
          <AppText style={{ color: colors.accent, fontWeight: '600' }}>Manage Categories</AppText>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ paddingTop: 30 }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}

      <FlatList
        data={filteredItems}
        keyExtractor={(i) => i.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={() => (
          <View style={{ paddingTop: 30, alignItems: 'center' }}>
            {hasFilters ? (
              <>
                <AppText style={{ fontSize: 28, marginBottom: 8 }}>🔍</AppText>
                <AppText muted>No transactions match your filters.</AppText>
                <Pressable onPress={clearFilters} style={{ marginTop: 12 }}>
                  <AppText style={{ color: colors.accent, fontWeight: '600' }}>Clear filters</AppText>
                </Pressable>
              </>
            ) : (
              <>
                <AppText muted>No transactions yet.</AppText>
                <AppText muted style={{ marginTop: 6 }}>
                  Tap + to add your first expense or income.
                </AppText>
              </>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <TransactionItem
            item={item}
            onPress={() => {
              navigation.navigate('TxDetail', { tx: item });
            }}
            onLongPress={() => {
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
    marginBottom: 16,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  sortBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  catWrap: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    marginRight: 8,
  },
  clearBtn: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
});
