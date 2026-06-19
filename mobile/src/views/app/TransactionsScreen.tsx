import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Pressable, ScrollView, SectionList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AppText from '../../components/AppText';
import { spacing, radius } from '../../theme/colors';
import { TransactionsContext, Tx } from '../../store/transactions';
import { DateFilterContext } from '../../store/dateFilter';
import { AuthContext } from '../../store/auth';
import Icon from '../../components/Icon';
import { ThemeContext } from '../../store/theme';
import { scaleHeight, TAB_BAR_HEIGHT } from '../../constants/size';
import { formatMoney } from '../../utils/money';
import { getCategoryMeta } from '../../constants/categories';
import DateFilterSheet from '../../components/DateFilterSheet';
import { normalizeTag } from '../../utils/tags';

const TYPE_FILTERS = ['All', 'Expense', 'Income'] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

export default function TransactionsScreen() {
  const navigation: any = useNavigation();
  const insets = useSafeAreaInsets();
  const {
    items,
    removeTx,
    fetchTransactions,
    loadMoreTransactions,
    hasMoreTransactions,
    loadingMore,
    txTotal,
    loading,
  } = useContext(TransactionsContext);
  const { userId } = useContext(AuthContext);
  const { colors } = useContext(ThemeContext);
  const { matchesFilter, hasActiveFilter } = useContext(DateFilterContext);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [sortNewest, setSortNewest] = useState(true);
  const [isDateFilterVisible, setIsDateFilterVisible] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchTransactions(userId);
    }
  }, [userId, fetchTransactions]);

  const availableTags = useMemo(() => {
    const counts = new Map<string, number>();

    items.forEach((tx) => {
      const uniqueTags = new Set(
        (tx.tags || [])
          .map((tag) => normalizeTag(String(tag || '')))
          .filter((tag) => tag.length > 0),
      );

      uniqueTags.forEach((tag) => {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      });
    });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag);
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items.filter(t => matchesFilter(t.dateISO));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((t) => {
        const inTitle = t.title.toLowerCase().includes(q);
        const inCategory = t.category.toLowerCase().includes(q);
        const inSplitCategory = (t.splits || []).some((split) => split.category.toLowerCase().includes(q));
        return inTitle || inCategory || inSplitCategory;
      });
    }
    if (typeFilter === 'Expense') result = result.filter(t => t.amount < 0);
    else if (typeFilter === 'Income') result = result.filter(t => t.amount > 0);
    if (selectedTag) {
      result = result.filter((t) => {
        const tags = (t.tags || []).map((tag) => normalizeTag(String(tag || '')));
        return tags.includes(selectedTag);
      });
    }

    result.sort((a, b) => {
      const da = new Date(a.dateISO).getTime();
      const db = new Date(b.dateISO).getTime();
      return sortNewest ? db - da : da - db;
    });

    return result;
  }, [items, search, typeFilter, selectedTag, sortNewest, matchesFilter]);

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

  const hasFilters = search.trim().length > 0 || typeFilter !== 'All' || selectedTag !== '' || hasActiveFilter;

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('All');
    setSelectedTag('');
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

      {availableTags.length > 0 ? (
        <View style={styles.tagFilterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
            <Pressable
              onPress={() => setSelectedTag('')}
              style={[
                styles.chip,
                { backgroundColor: selectedTag === '' ? colors.accent : colors.surface2, borderColor: colors.border },
              ]}
            >
              <AppText style={{ fontWeight: '600', fontSize: 12, color: selectedTag === '' ? '#FFF' : colors.text }}>
                All Tags
              </AppText>
            </Pressable>

            {availableTags.map((tag) => {
              const active = selectedTag === tag;
              return (
                <Pressable
                  key={tag}
                  onPress={() => setSelectedTag(active ? '' : tag)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.accent : colors.surface2,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <AppText style={{ fontWeight: '600', fontSize: 12, color: active ? '#FFF' : colors.text }}>
                    #{tag}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {loading ? (
        <View style={{ paddingTop: 30 }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}

      <SectionList
        sections={groupedItems}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + scaleHeight(60) }}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (!userId || !hasMoreTransactions || loadingMore) return;
          loadMoreTransactions(userId);
        }}
        onEndReachedThreshold={0.35}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : txTotal != null && items.length < txTotal ? (
            <AppText muted style={{ textAlign: 'center', paddingVertical: 12, fontSize: 12 }}>
              Showing {items.length} of {txTotal}. Scroll for more.
            </AppText>
          ) : null
        }
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
          const splitCategories = (item.splits || []).map((split) => split.category).filter(Boolean);
          const iconCategory = splitCategories.length > 0 ? splitCategories[0] : item.category;
          const catMeta = getCategoryMeta(iconCategory);
          const timeStr = new Date(item.dateISO).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          const categoryLabel = splitCategories.length > 0
            ? `Split: ${splitCategories.slice(0, 2).join(', ')}${splitCategories.length > 2 ? '…' : ''}`
            : item.category;
          const tagsLabel = (item.tags || []).slice(0, 2).map((tag) => `#${normalizeTag(String(tag || ''))}`).filter((tag) => tag !== '#').join(' ');
          const metaLabel = tagsLabel ? `${categoryLabel} • ${timeStr} • ${tagsLabel}` : `${categoryLabel} • ${timeStr}`;

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
                <View style={[styles.txIcon, { backgroundColor: colors.accent + '15' }]}>
                  <Icon name={catMeta.icon} size={20} color={colors.accent} />
                </View>
                <View style={styles.txInfo}>
                  <AppText style={{ fontWeight: '600', fontSize: 15, color: colors.text }}>{item.title}</AppText>
                  <AppText style={{ fontSize: 12, marginTop: 2, color: colors.muted }}>
                    {metaLabel}
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
    marginBottom: 10,
  },
  tagFilterRow: {
    flexDirection: 'row',
    marginBottom: 14,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  txInfo: {
    flex: 1,
  },
});
