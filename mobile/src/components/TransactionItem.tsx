import React, { useContext } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AppText from './AppText';
import Icon from './Icon';
import { radius } from '../theme/colors';
import { Tx } from '../store/transactions';
import { formatMoney } from '../utils/money';
import { ThemeContext } from '../store/theme';
import { getCategoryMeta } from '../constants/categories';

export default function TransactionItem({
  item,
  onPress,
  onLongPress,
}: {
  item: Tx;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const { colors } = useContext(ThemeContext);
  const isIncome = item.amount > 0;
  const cur = item.currency || 'LKR';
  const showBadge = cur !== 'LKR';
  const catMeta = getCategoryMeta(item.category);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: isIncome ? 'rgba(46,213,115,0.12)' : catMeta.bgAlpha }]}>
        <Icon
          name={isIncome ? 'trending-up' : catMeta.icon}
          size={20}
          color={isIncome ? colors.success : catMeta.color}
        />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontWeight: '600', fontSize: 15 }}>{item.title}</AppText>
        <AppText muted style={{ marginTop: 3, fontSize: 13 }}>
          {item.category} · {item.dateISO}
        </AppText>
      </View>
      <AppText mono style={{ fontWeight: '800', fontSize: 16, color: isIncome ? colors.success : colors.text }}>
        {formatMoney(item.amount, cur)}
      </AppText>
      {showBadge && (
        <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, marginLeft: 4 }}>
          <AppText style={{ fontSize: 10, fontWeight: '700', color: colors.muted }}>{cur}</AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
