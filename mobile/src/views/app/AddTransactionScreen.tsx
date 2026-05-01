import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, Pressable, Image, ActivityIndicator, ScrollView, TextInput } from 'react-native';
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
import { TransactionsContext, TxSplit } from '../../store/transactions';
import { AuthContext } from '../../store/auth';
import { scaleHeight } from '../../constants/size';
import { ThemeContext } from '../../store/theme';
import { ProfileContext } from '../../store/profile';
import { CategoryService, Category } from '../../services/CategoryService';
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import { mergeTags, parseTagInput } from '../../utils/tags';

const fallbackExpenseCategories = ['Food', 'Transport', 'Bills', 'Shopping', 'Other'];

type SplitDraft = {
  id: string;
  category: string;
  amountRaw: string;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

function buildDefaultSplitRows(categories: string[], totalAmount: number): SplitDraft[] {
  const base = categories.length ? categories : fallbackExpenseCategories;
  const firstCategory = base[0] || 'Food';
  const secondCategory = base[1] || base[0] || 'Other';

  if (totalAmount > 0) {
    const firstAmount = round2(totalAmount / 2);
    const secondAmount = round2(totalAmount - firstAmount);
    return [
      { id: 'split-1', category: firstCategory, amountRaw: String(firstAmount) },
      { id: 'split-2', category: secondCategory, amountRaw: String(secondAmount) },
    ];
  }

  return [
    { id: 'split-1', category: firstCategory, amountRaw: '' },
    { id: 'split-2', category: secondCategory, amountRaw: '' },
  ];
}

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
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitRows, setSplitRows] = useState<SplitDraft[]>([]);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

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

  const expenseCategories = useMemo(() => {
    const dynamic = cats
      .filter((c) => c.type === 'expense' || c.type === 'both')
      .map((c) => c.name);
    return dynamic.length ? dynamic : fallbackExpenseCategories;
  }, [cats]);

  useEffect(() => {
    if (isIncome && splitEnabled) {
      setSplitEnabled(false);
      setSplitRows([]);
    }
  }, [isIncome, splitEnabled]);

  const splitPreview = useMemo(() => {
    const parsed = splitRows.map((row) => {
      const amountNum = Number(row.amountRaw);
      const amountAbs = Number.isFinite(amountNum) && amountNum > 0 ? round2(amountNum) : 0;
      return {
        ...row,
        category: row.category.trim(),
        amountAbs,
      };
    });

    const allocated = round2(parsed.reduce((sum, row) => sum + row.amountAbs, 0));
    const target = round2(amount);
    const remaining = round2(target - allocated);

    const duplicateCategorySet = new Set<string>();
    let hasDuplicateCategory = false;
    for (const row of parsed) {
      const key = row.category.toLowerCase();
      if (!key) continue;
      if (duplicateCategorySet.has(key)) {
        hasDuplicateCategory = true;
        break;
      }
      duplicateCategorySet.add(key);
    }

    const hasMissingCategory = parsed.some((row) => row.category.length === 0);
    const hasInvalidAmount = parsed.some((row) => row.amountAbs <= 0);
    const hasEnoughRows = parsed.length >= 2;
    const isTotalMatching = Math.abs(remaining) <= 0.01;

    const percentages = parsed.map((row) => (target > 0 ? round2((row.amountAbs / target) * 100) : 0));

    let splitPayload: TxSplit[] = [];
    if (hasEnoughRows && !hasMissingCategory && !hasInvalidAmount && !hasDuplicateCategory && isTotalMatching && target > 0) {
      let runningAmount = 0;
      let runningPercentage = 0;

      splitPayload = parsed.map((row, index) => {
        const isLast = index === parsed.length - 1;
        const amountAbs = isLast ? round2(target - runningAmount) : row.amountAbs;
        const percentage = isLast
          ? round2(100 - runningPercentage)
          : round2((amountAbs / target) * 100);

        runningAmount = round2(runningAmount + amountAbs);
        runningPercentage = round2(runningPercentage + percentage);

        return {
          category: row.category,
          amount: amountAbs,
          percentage,
        };
      });
    }

    const isValid = hasEnoughRows && !hasMissingCategory && !hasInvalidAmount && !hasDuplicateCategory && isTotalMatching && target > 0;

    return {
      percentages,
      allocated,
      target,
      remaining,
      hasEnoughRows,
      hasDuplicateCategory,
      hasMissingCategory,
      hasInvalidAmount,
      isTotalMatching,
      isValid,
      splitPayload,
    };
  }, [splitRows, amount]);

  const splitErrorMessage = useMemo(() => {
    if (!splitEnabled) return '';
    if (!splitPreview.hasEnoughRows) return 'Add at least two split rows.';
    if (splitPreview.hasMissingCategory) return 'Each split row needs a category.';
    if (splitPreview.hasDuplicateCategory) return 'Split categories must be unique.';
    if (splitPreview.hasInvalidAmount) return 'Each split row needs a positive amount.';
    if (!splitPreview.isTotalMatching) return 'Split amounts must add up to the full expense amount.';
    return '';
  }, [splitEnabled, splitPreview]);

  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(dateISO);
  const canSave = title.trim().length >= 2 && amount > 0 && userId && dateOk && (!splitEnabled || splitPreview.isValid);

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

  const toggleSplitMode = () => {
    if (splitEnabled) {
      setSplitEnabled(false);
      setSplitRows([]);
      return;
    }

    setSplitEnabled(true);
    setSplitRows((prev) => (prev.length > 0 ? prev : buildDefaultSplitRows(expenseCategories, amount)));
  };

  const addSplitRow = () => {
    const fallbackCategory = expenseCategories.find(
      (c) => !splitRows.some((row) => row.category.trim().toLowerCase() === c.trim().toLowerCase()),
    ) || 'Other';

    setSplitRows((prev) => [
      ...prev,
      {
        id: `split-${Date.now()}-${prev.length + 1}`,
        category: fallbackCategory,
        amountRaw: '',
      },
    ]);
  };

  const updateSplitCategory = (id: string, value: string) => {
    setSplitRows((prev) => prev.map((row) => (row.id === id ? { ...row, category: value } : row)));
  };

  const updateSplitAmount = (id: string, value: string) => {
    setSplitRows((prev) => prev.map((row) => (row.id === id ? { ...row, amountRaw: value } : row)));
  };

  const removeSplitRow = (id: string) => {
    setSplitRows((prev) => prev.filter((row) => row.id !== id));
  };

  const addTagsFromInput = () => {
    const parsed = parseTagInput(tagInput);
    if (parsed.length === 0) {
      if (tagInput.trim().length > 0) {
        Alert.alert('Invalid tag', 'Use tags like #food, #travel, #salary.');
      }
      setTagInput('');
      return;
    }

    setTags((prev) => mergeTags(prev, parsed));
    setTagInput('');
  };

  const removeTag = (value: string) => {
    setTags((prev) => prev.filter((tag) => tag !== value));
  };

  const save = async () => {
    if (!canSave) {
      if (splitEnabled && splitErrorMessage) {
        Alert.alert('Fix split allocation', splitErrorMessage);
      } else {
        Alert.alert('Missing info', 'Enter a title and amount.');
      }
      return;
    }
    try {
      setSaving(true);
      const splitPayload = splitEnabled ? splitPreview.splitPayload : undefined;
      const finalTags = mergeTags(tags, parseTagInput(tagInput));
      const cleanedNotes = notes.trim();

      if (tagInput.trim().length > 0) {
        setTagInput('');
      }
      if (finalTags.length !== tags.length) {
        setTags(finalTags);
      }

      await addTx(
        {
          title: title.trim(),
          category: isIncome ? 'Income' : splitPayload?.[0]?.category || category,
          amount: isIncome ? amount : -amount,
          currency: preferredCurrency || 'LKR',
          dateISO,
          notes: cleanedNotes.length > 0 ? cleanedNotes : null,
          tags: finalTags,
          receiptUrl: receiptUrl || null,
          splits: splitPayload,
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

          <AppText muted style={styles.label}>Notes (optional)</AppText>
          <View style={[styles.notesWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add details about this transaction"
              placeholderTextColor={colors.muted}
              multiline
              maxLength={2000}
              textAlignVertical="top"
              style={[styles.notesInput, { color: colors.text }]}
            />
          </View>

          <View style={{ height: 16 }} />

          <AppText muted style={styles.label}>Tags (optional)</AppText>
          <View style={styles.tagInputRow}>
            <View style={{ flex: 1 }}>
              <AppInput
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="#food #weekend"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={addTagsFromInput}
              />
            </View>
            <Pressable
              onPress={addTagsFromInput}
              style={[styles.tagAddBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
            >
              <Icon name="plus" size={16} color={colors.accent} />
            </Pressable>
          </View>

          {tags.length > 0 ? (
            <View style={styles.tagsWrap}>
              {tags.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => removeTag(tag)}
                  style={[styles.tagChip, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '55' }]}
                >
                  <Icon name="tag" size={12} color={colors.accent} />
                  <AppText style={{ marginLeft: 6, marginRight: 6, color: colors.accent, fontSize: 12, fontWeight: '700' }}>
                    #{tag}
                  </AppText>
                  <Icon name="x" size={12} color={colors.accent} />
                </Pressable>
              ))}
            </View>
          ) : (
            <AppText muted style={styles.tagsHint}>
              Add hashtags for easier filtering later.
            </AppText>
          )}

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
              <View style={styles.splitHeaderRow}>
                <AppText muted style={[styles.label, { marginBottom: 0 }]}>Category</AppText>
                <Pressable
                  onPress={toggleSplitMode}
                  style={[
                    styles.splitToggle,
                    {
                      backgroundColor: splitEnabled ? colors.accent + '20' : colors.surface2,
                      borderColor: splitEnabled ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Icon name="activity" size={14} color={splitEnabled ? colors.accent : colors.muted} />
                  <AppText
                    style={{
                      marginLeft: 6,
                      fontSize: 12,
                      fontWeight: '700',
                      color: splitEnabled ? colors.accent : colors.text,
                    }}
                  >
                    {splitEnabled ? 'Split On' : 'Split'}
                  </AppText>
                </Pressable>
              </View>

              {!splitEnabled ? (
                <>
                  <View style={styles.catWrap}>
                    {expenseCategories.map((c) => {
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
              ) : (
                <>
                  <AppText muted style={styles.splitHint}>
                    Allocate this expense across categories by amount.
                  </AppText>

                  <View style={styles.splitRowsWrap}>
                    {splitRows.map((row, index) => (
                      <View
                        key={row.id}
                        style={[
                          styles.splitCard,
                          {
                            backgroundColor: colors.surface2,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.splitCardTopRow}>
                          <AppText style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                            Split {index + 1}
                          </AppText>
                          <View style={styles.splitCardRightRow}>
                            <AppText style={{ fontSize: 12, color: colors.muted }}>
                              {splitPreview.percentages[index]?.toFixed(1) || '0.0'}%
                            </AppText>
                            <Pressable
                              onPress={() => removeSplitRow(row.id)}
                              disabled={splitRows.length <= 2}
                              style={[
                                styles.splitRemove,
                                { backgroundColor: splitRows.length <= 2 ? colors.border : colors.danger + '20' },
                              ]}
                            >
                              <Icon
                                name="trash"
                                size={14}
                                color={splitRows.length <= 2 ? colors.muted : colors.danger}
                              />
                            </Pressable>
                          </View>
                        </View>

                        <View style={{ height: 10 }} />
                        <AppText muted style={styles.splitFieldLabel}>Category</AppText>
                        <AppInput
                          value={row.category}
                          onChangeText={(value) => updateSplitCategory(row.id, value)}
                          placeholder="e.g. Food"
                        />

                        <View style={{ height: 10 }} />
                        <AppText muted style={styles.splitFieldLabel}>Amount</AppText>
                        <AppInput
                          value={row.amountRaw}
                          onChangeText={(value) => updateSplitAmount(row.id, value)}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          left={
                            <AppText style={{ fontSize: 13, fontWeight: '700', color: colors.muted }}>
                              {preferredCurrency || 'LKR'}
                            </AppText>
                          }
                        />
                      </View>
                    ))}
                  </View>

                  <Pressable
                    onPress={addSplitRow}
                    style={[styles.addSplitBtn, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  >
                    <Icon name="plus" size={16} color={colors.accent} />
                    <AppText style={{ marginLeft: 8, color: colors.accent, fontSize: 13, fontWeight: '700' }}>
                      Add Split
                    </AppText>
                  </Pressable>

                  <AppText muted style={styles.splitSummary}>
                    Allocated {preferredCurrency || 'LKR'} {splitPreview.allocated.toFixed(2)} / {splitPreview.target.toFixed(2)}
                  </AppText>
                  {splitErrorMessage ? (
                    <AppText style={[styles.splitError, { color: colors.danger }]}>
                      {splitErrorMessage}
                    </AppText>
                  ) : (
                    <AppText muted style={styles.splitSummarySecondary}>
                      Remaining {preferredCurrency || 'LKR'} {Math.max(0, splitPreview.remaining).toFixed(2)}
                    </AppText>
                  )}
                </>
              )}
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
  notesWrap: {
    borderWidth: 1,
    borderRadius: radius.sm,
    minHeight: 110,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  notesInput: {
    fontSize: 14,
    lineHeight: 20,
    minHeight: 90,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tagAddBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsWrap: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tagsHint: {
    marginTop: 8,
    fontSize: 12,
  },
  splitHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  splitToggle: {
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
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
  splitHint: {
    marginBottom: 10,
    fontSize: 12,
  },
  splitRowsWrap: {
    gap: 10,
  },
  splitCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  splitCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  splitCardRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  splitRemove: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitFieldLabel: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  addSplitBtn: {
    marginTop: 10,
    height: 42,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  splitSummary: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  splitSummarySecondary: {
    marginTop: 4,
    fontSize: 12,
  },
  splitError: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
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
