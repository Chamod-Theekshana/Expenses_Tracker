import React, { useContext } from 'react';
import { Pressable, StyleSheet, View,Image } from 'react-native';
import AppText from './AppText';
import { radius } from '../theme/colors';
import { Tx } from '../store/transactions';
import { formatMoney } from '../utils/money';
import { ThemeContext } from '../store/theme';
import { images } from '../constants/images';

export default function TransactionItem({
  item,
  onPress,
}: {
  item: Tx;
  onPress?: () => void;
}) {
  const { colors } = useContext(ThemeContext);
  const isIncome = item.amount > 0;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]}>
      <View style={[styles.iconBox, { backgroundColor: isIncome ? 'rgba(77,255,136,0.15)' : 'rgba(255,77,77,0.15)' }]}>
        {isIncome ?  <Image source={images.income} style={styles.Image} /> :  <Image source={images.expense} style={styles.Image} />}
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontWeight: '700', fontSize: 15 }}>{item.title}</AppText>
        <AppText muted style={{ marginTop: 3, fontSize: 13 }}>
          {item.category} • {item.dateISO}
        </AppText>
      </View>
      <AppText mono style={{ fontWeight: '800', fontSize: 16, color: isIncome ? colors.success : colors.text }}>
        {formatMoney(item.amount)}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
   Image: {
    width: 38,
    height: 38,
    tintColor: '#FFFF',
    resizeMode: 'contain'
  }
});
