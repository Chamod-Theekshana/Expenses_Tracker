import React, { useContext } from 'react';
import { Pressable, StyleSheet, View, Image } from 'react-native';
import AppText from './AppText';
import { radius } from '../theme/colors';
import { Tx } from '../store/transactions';
import { formatMoney } from '../utils/money';
import { ThemeContext } from '../store/theme';
import { images } from '../constants/images';

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
      <View style={[styles.iconBox, { backgroundColor: isIncome ? 'rgba(46,213,115,0.12)' : 'rgba(255,107,107,0.12)' }]}>
        {isIncome ? <Image source={images.income} style={[styles.Image, { tintColor: colors.success }]} /> : <Image source={images.expense} style={[styles.Image, { tintColor: colors.danger }]} />}
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontWeight: '600', fontSize: 15 }}>{item.title}</AppText>
        <AppText muted style={{ marginTop: 3, fontSize: 13 }}>
          {item.category} · {item.dateISO}
        </AppText>
      </View>
      <AppText mono style={{ fontWeight: '700', fontSize: 16, color: isIncome ? colors.success : colors.text }}>
        {formatMoney(item.amount)}
      </AppText>
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
  Image: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
});
