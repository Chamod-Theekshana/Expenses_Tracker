import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, Pressable, Image, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import Icon from '../../components/Icon';
import Chip from '../../components/Chip';
import IconButton from '../../components/IconButton';
import { getCategoryMeta } from '../../constants/categories';
import { radius, spacing } from '../../theme/colors';
import { TransactionsContext } from '../../store/transactions';
import { AuthContext } from '../../store/auth';
import { scaleHeight } from '../../constants/size';
import { ThemeContext } from '../../store/theme';
import { ProfileContext } from '../../store/profile';
import { CategoryService, Category } from '../../services/CategoryService';
import { uploadImageToCloudinary } from '../../utils/cloudinary';

const fallbackExpenseCategories = ['Food', 'Transport', 'Bills', 'Shopping', 'Other'];

export default function AddTransactionScreen({ navigation }: any) {
  const { addTx } = useContext(TransactionsContext);
  const { userId } = useContext(AuthContext);
  const { colors, theme } = useContext(ThemeContext);
  const { currency: preferredCurrency } = useContext(ProfileContext);

  const [title, setTitle] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [category, setCategory] = useState<string>('Food');
  const [isIncome, setIsIncome] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateISO, setDateISO] = useState(() => new Date().toISOString().slice(0, 10));

  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

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

  const pickReceipt = () => {
    Alert.alert('Attach Receipt', 'Choose source', [
      {
        text: 'Camera',
        onPress: () => {
          ImagePicker.launchCamera({ mediaType: 'photo', quality: 0.85 as ImagePicker.PhotoQuality }, handleImageResponse);
        },
      },
      {
        text: 'Photo Library',
        onPress: () => {
          ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.85 as ImagePicker.PhotoQuality, selectionLimit: 1 }, handleImageResponse);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleImageResponse = async (response: ImagePicker.ImagePickerResponse) => {
    if (response.didCancel) return;
    if (response.errorCode) {
      Alert.alert('Error', response.errorMessage || 'Image picker error');
      return;
    }
    const uri = response.assets?.[0]?.uri;
    if (!uri) return;
    setReceiptUri(uri);
    try {
      setUploadingReceipt(true);
      const url = await uploadImageToCloudinary(uri);
      setReceiptUrl(url);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Could not upload receipt');
      setReceiptUri(null);
    } finally {
      setUploadingReceipt(false);
    }
  };

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
          currency: preferredCurrency || 'LKR',
          dateISO,
          receiptUrl: receiptUrl || null,
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

  // Date quick presets
  const setToday = () => setDateISO(new Date().toISOString().slice(0, 10));
  const setYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setDateISO(d.toISOString().slice(0, 10));
  };
  const isToday = dateISO === new Date().toISOString().slice(0, 10);
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  const isYesterday = dateISO === yesterdayStr;

  const cardShadow = theme === 'light' ? styles.cardShadowLight : {};

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <View style={styles.topRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent + '20', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={20} color={colors.accent} />
          </View>
          <AppText title style={{ fontSize: 24 }}>Transaction</AppText>
        </View>
        <IconButton icon="x" size={36} iconSize={24} onPress={() => navigation.goBack()} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Card style={[styles.formCard, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          
          <View style={styles.chipsRow}>
            <Pressable
              onPress={() => setIsIncome(false)}
              style={[
                styles.typeChip,
                { backgroundColor: colors.surface2, borderColor: colors.border },
                !isIncome && { backgroundColor: colors.danger, borderColor: 'transparent' },
              ]}
            >
              <Icon name="arrow-down-circle" size={18} color={!isIncome ? '#FFF' : colors.danger} />
              <AppText style={{ fontWeight: '700', fontSize: 14, color: !isIncome ? '#FFF' : colors.text, marginLeft: 8 }}>Expense</AppText>
            </Pressable>
            <Pressable
              onPress={() => setIsIncome(true)}
              style={[
                styles.typeChip,
                { backgroundColor: colors.surface2, borderColor: colors.border },
                isIncome && { backgroundColor: colors.success, borderColor: 'transparent' },
              ]}
            >
              <Icon name="arrow-up-circle" size={18} color={isIncome ? '#FFF' : colors.success} />
              <AppText style={{ fontWeight: '700', fontSize: 14, color: isIncome ? '#FFF' : colors.text, marginLeft: 8 }}>Income</AppText>
            </Pressable>
          </View>

          <View style={{ height: 24 }} />

          <AppText muted style={styles.label}>Amount</AppText>
          <AppInput
            value={amountRaw}
            onChangeText={setAmountRaw}
            keyboardType="decimal-pad"
            placeholder="0.00"
            style={[styles.amountInput, { color: isIncome ? colors.success : colors.text }]}
            left={<AppText style={{ fontSize: 24, fontWeight: '700', color: colors.muted, marginRight: 8 }}>{preferredCurrency}</AppText>}
          />

          <View style={{ height: 16 }} />

          <AppText muted style={styles.label}>Title</AppText>
          <AppInput value={title} onChangeText={setTitle} placeholder="What was this for?" />

          <View style={{ height: 16 }} />

          <AppText muted style={styles.label}>Date</AppText>
          <View style={styles.dateRow}>
            <Chip 
              label="Today" 
              selected={isToday} 
              onPress={setToday} 
              size="md" 
              style={{ backgroundColor: isToday ? colors.accent : colors.surface2 }}
            />
            <Chip 
              label="Yesterday" 
              selected={isYesterday} 
              onPress={setYesterday} 
              size="md" 
              style={{ backgroundColor: isYesterday ? colors.accent : colors.surface2 }}
            />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <AppInput
                value={dateISO}
                onChangeText={setDateISO}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          {!isIncome ? (
            <>
              <View style={{ height: 24 }} />
              <AppText muted style={styles.label}>Category</AppText>
              <View style={styles.catWrap}>
                {(cats.length
                  ? cats
                      .filter((c) => c.type === 'expense' || c.type === 'both')
                      .map((c) => c.name)
                  : fallbackExpenseCategories
                ).map((c) => {
                  const meta = getCategoryMeta(c);
                  const isActive = category === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setCategory(c)}
                      style={[
                        styles.catPill,
                        {
                          backgroundColor: isActive ? meta.color : colors.surface2,
                          borderColor: isActive ? meta.color : colors.border,
                        },
                      ]}
                    >
                      <Icon name={meta.icon} size={14} color={isActive ? '#FFF' : meta.color} />
                      <AppText style={{ fontSize: 13, fontWeight: '600', marginLeft: 6, color: isActive ? '#FFF' : colors.text }}>
                        {c}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
              {!cats.length && !catLoading ? (
                <AppText muted style={{ marginTop: 8, fontSize: 12 }}>
                  Using built-in categories.
                </AppText>
              ) : null}
            </>
          ) : null}

          <View style={{ height: 24 }} />
          <AppText muted style={styles.label}>Receipt (optional)</AppText>
          {receiptUri ? (
            <View style={[styles.receiptPreview, { borderColor: colors.border }]}>
              <Image source={{ uri: receiptUri }} style={styles.receiptImg} resizeMode="cover" />
              {uploadingReceipt && (
                <View style={styles.receiptOverlay}>
                  <ActivityIndicator color="#FFF" />
                  <AppText style={{ color: '#FFF', fontSize: 13, marginTop: 8, fontWeight: '600' }}>Uploading…</AppText>
                </View>
              )}
              {!uploadingReceipt && receiptUrl && (
                <View style={[styles.receiptBadge, { backgroundColor: colors.success + 'CC' }]}>
                  <Icon name="check" size={14} color="#FFF" />
                  <AppText style={{ color: '#FFF', fontSize: 11, marginLeft: 4, fontWeight: '700' }}>Uploaded</AppText>
                </View>
              )}
              <Pressable
                onPress={() => { setReceiptUri(null); setReceiptUrl(null); }}
                style={[styles.receiptRemove, { backgroundColor: colors.danger }]}
              >
                <Icon name="x" size={16} color="#FFF" />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={pickReceipt} style={[styles.receiptPicker, { borderColor: colors.border, backgroundColor: colors.surface2 }]}>
              <Icon name="camera" size={24} color={colors.accent} />
              <AppText style={{ color: colors.accent, fontSize: 14, marginLeft: 12, fontWeight: '600' }}>
                Tap to attach receipt
              </AppText>
            </Pressable>
          )}

          <AppButton 
            title="Save Transaction" 
            onPress={save} 
            disabled={!canSave} 
            loading={saving} 
            style={{ marginTop: 32 }} 
            size="lg"
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingTop: scaleHeight(55),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: scaleHeight(20),
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: scaleHeight(40),
  },
  formCard: {
    padding: 24,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeChip: {
    flex: 1,
    height: 52,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
  amountInput: {
    fontSize: 28,
    fontWeight: '800',
    height: 60,
  },
  catWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  receiptPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  receiptPreview: {
    height: 200,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: StyleSheet.hairlineWidth,
  },
  receiptImg: {
    width: '100%',
    height: '100%',
  },
  receiptOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  receiptRemove: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardShadowLight: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
});
