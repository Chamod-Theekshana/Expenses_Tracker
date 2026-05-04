import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View, Image, Pressable, ActivityIndicator, Modal, TextInput } from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import Screen from '../../components/Screen';
import IconButton from '../../components/IconButton';
import Icon from '../../components/Icon';
import { ThemeContext } from '../../store/theme';
import { TransactionsContext, Tx } from '../../store/transactions';
import { AuthContext } from '../../store/auth';
import { TransactionService } from '../../services/TransactionService';
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import { radius } from '../../theme/colors';
import { scaleHeight } from '../../constants/size';
import { mergeTags, parseTagInput } from '../../utils/tags';

export default function TransactionDetailScreen({ route, navigation }: any) {
  const routeTx = route.params?.tx as Tx | undefined;
  const txIdParam = route.params?.txId as string | undefined;

  const { colors } = useContext(ThemeContext);
  const { updateTx, removeTx } = useContext(TransactionsContext);
  const { userId } = useContext(AuthContext);

  const [resolvedTx, setResolvedTx] = useState<Tx | null>(routeTx ?? null);
  const [txLoading, setTxLoading] = useState(() => !routeTx && Boolean(txIdParam));
  const [txError, setTxError] = useState<string | null>(null);

  useEffect(() => {
    if (routeTx) {
      setResolvedTx(routeTx);
      setTxLoading(false);
      return;
    }
    if (!txIdParam) {
      setTxError('Missing transaction');
      setTxLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setTxLoading(true);
      setTxError(null);
      try {
        const t = await TransactionService.getTransactionById(txIdParam);
        if (cancelled) return;
        if (t) setResolvedTx(t);
        else setTxError('Transaction not found');
      } catch (e: any) {
        if (!cancelled) setTxError(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setTxLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeTx, txIdParam]);

  const [title, setTitle] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [category, setCategory] = useState('');
  const [dateISO, setDateISO] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    if (!resolvedTx) return;
    setTitle(resolvedTx.title);
    setAmountRaw(String(Math.abs(resolvedTx.amount)));
    setCategory(resolvedTx.category);
    setDateISO(resolvedTx.dateISO?.slice(0, 10) || new Date().toISOString().slice(0, 10));
    setNotes(resolvedTx.notes || '');
    setTags(mergeTags([], resolvedTx.tags || []));
    setReceiptUri(resolvedTx.receiptUrl || null);
    setReceiptUrl(resolvedTx.receiptUrl || null);
  }, [resolvedTx]);

  const hasSplits = (resolvedTx?.splits?.length || 0) > 0;

  const isIncome = (resolvedTx?.amount ?? 0) > 0;
  const amount = useMemo(() => {
    const n = Number(amountRaw);
    return Number.isFinite(n) ? n : 0;
  }, [amountRaw]);

  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(dateISO);
  const canSave = title.trim().length >= 2 && amount > 0 && dateOk && userId;

  const buildUpdatedSplits = () => {
    if (!hasSplits || !resolvedTx) return undefined;

    const originalSplits = (resolvedTx.splits || []).filter((split) => String(split.category || '').trim().length > 0);
    if (originalSplits.length < 2) {
      return undefined;
    }

    const totalAbs = amount;
    const absAmounts = originalSplits.map((split) => Math.abs(Number(split.amount) || 0));
    const weightsTotal = absAmounts.reduce((sum, value) => sum + value, 0);

    const normalizedBase = absAmounts.map((value) => {
      if (weightsTotal <= 0) return totalAbs / originalSplits.length;
      return (totalAbs * value) / weightsTotal;
    });

    let allocated = 0;
    let allocatedPct = 0;
    return originalSplits.map((split, index) => {
      const isLast = index === originalSplits.length - 1;
      const nextAmount = isLast
        ? Math.round((totalAbs - allocated) * 100) / 100
        : Math.round(normalizedBase[index] * 100) / 100;
      const nextPct = isLast
        ? Math.round((100 - allocatedPct) * 100) / 100
        : Math.round(((nextAmount / totalAbs) * 100) * 100) / 100;

      allocated = Math.round((allocated + nextAmount) * 100) / 100;
      allocatedPct = Math.round((allocatedPct + nextPct) * 100) / 100;

      return {
        category: String(split.category || '').trim(),
        amount: nextAmount,
        percentage: nextPct,
      };
    });
  };

  const pickReceipt = () => {
    Alert.alert('Attach Receipt', 'Choose source', [
      { text: 'Camera', onPress: () => ImagePicker.launchCamera({ mediaType: 'photo', quality: 0.85 as ImagePicker.PhotoQuality }, handleImageResponse) },
      { text: 'Photo Library', onPress: () => ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.85 as ImagePicker.PhotoQuality, selectionLimit: 1 }, handleImageResponse) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleImageResponse = async (response: ImagePicker.ImagePickerResponse) => {
    if (response.didCancel) return;
    if (response.errorCode) { Alert.alert('Error', response.errorMessage || 'Image picker error'); return; }
    const uri = response.assets?.[0]?.uri;
    if (!uri) return;
    setReceiptUri(uri);
    try {
      setUploadingReceipt(true);
      const url = await uploadImageToCloudinary(uri);
      setReceiptUrl(url);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Could not upload receipt');
      setReceiptUri(null); setReceiptUrl(null);
    } finally {
      setUploadingReceipt(false);
    }
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
    if (!canSave) { Alert.alert('Missing info', 'Check title, amount and date.'); return; }
    if (hasSplits && isIncome) {
      Alert.alert('Invalid split transaction', 'Split transactions are supported for expenses only.');
      return;
    }
    try {
      setSaving(true);
      const splitPayload = buildUpdatedSplits();
      const effectiveCategory = splitPayload?.[0]?.category || category.trim() || 'Other';
      const finalTags = mergeTags(tags, parseTagInput(tagInput));
      const cleanedNotes = notes.trim();

      if (tagInput.trim().length > 0) {
        setTagInput('');
      }
      if (finalTags.length !== tags.length) {
        setTags(finalTags);
      }

      if (!resolvedTx) return;
      await updateTx(
        resolvedTx.id,
        {
          title: title.trim(),
          category: effectiveCategory,
          amount: isIncome ? amount : -amount,
          currency: resolvedTx.currency || 'LKR',
          dateISO,
          notes: cleanedNotes.length > 0 ? cleanedNotes : null,
          tags: finalTags,
          receiptUrl: receiptUrl || null,
          splits: splitPayload,
        },
        userId!,
      );
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  const del = async () => {
    Alert.alert('Delete transaction', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
            setSaving(true);
            if (!resolvedTx) return;
            await removeTx(resolvedTx.id, userId!);
            navigation.goBack();
          }
        catch (e: any) { Alert.alert('Error', e?.message || 'Failed to delete'); }
        finally { setSaving(false); }
      }},
    ]);
  };

  if (txLoading) {
    return (
      <Screen preset="fixed" padded>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 }}>
          <ActivityIndicator color={colors.accent} />
          <AppText muted style={{ marginTop: 12 }}>Loading transaction…</AppText>
        </View>
      </Screen>
    );
  }

  if (txError || !resolvedTx) {
    return (
      <Screen preset="fixed" padded>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 }}>
          <AppText style={{ color: colors.text, textAlign: 'center' }}>{txError || 'Transaction not found'}</AppText>
          <View style={{ height: 16 }} />
          <AppButton title="Go back" onPress={() => navigation.goBack()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen preset="scroll" padded contentContainerStyle={{paddingBottom: scaleHeight(40),
 }}>
      <View style={styles.topRow}>
        <AppText title>Transaction</AppText>
        <IconButton icon="x" onPress={() => navigation.goBack()} accessibilityLabel="Close" />
      </View>

      <Card>
        <AppText muted style={{ marginBottom: 10, fontSize: 13 }}>Title</AppText>
        <AppInput value={title} onChangeText={setTitle} />
        <View style={{ height: 16 }} />
        <AppText muted style={{ marginBottom: 10, fontSize: 13 }}>Amount</AppText>
        <AppInput value={amountRaw} onChangeText={setAmountRaw} keyboardType="decimal-pad" />
        <View style={{ height: 16 }} />
        <AppText muted style={{ marginBottom: 10, fontSize: 13 }}>Category</AppText>
        <AppInput value={category} onChangeText={setCategory} editable={!hasSplits} />
        {hasSplits && (
          <AppText muted style={{ marginTop: 8, fontSize: 12 }}>
            This transaction uses split categories. Category is managed by split rows.
          </AppText>
        )}
        <View style={{ height: 16 }} />
        <AppText muted style={{ marginBottom: 10, fontSize: 13 }}>Date (YYYY-MM-DD)</AppText>
        <AppInput value={dateISO} onChangeText={setDateISO} />

        <View style={{ height: 16 }} />
        <AppText muted style={{ marginBottom: 10, fontSize: 13 }}>Notes (optional)</AppText>
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
        <AppText muted style={{ marginBottom: 10, fontSize: 13 }}>Tags (optional)</AppText>
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
          <AppText muted style={styles.tagsHint}>Add hashtags for easier filtering later.</AppText>
        )}

        {/* Receipt Section */}
        <View style={{ height: 18 }} />
        <AppText muted style={{ marginBottom: 10, fontSize: 13 }}>Receipt</AppText>
        {receiptUri ? (
          <View>
            <Pressable onPress={() => setPreviewVisible(true)} style={[styles.receiptPreview, { borderColor: colors.border }]}>
              <Image source={{ uri: receiptUri }} style={styles.receiptImg} resizeMode="cover" />
              {uploadingReceipt && (
                <View style={styles.receiptOverlay}>
                  <ActivityIndicator color="#FFF" />
                  <AppText style={{ color: '#FFF', fontSize: 12, marginTop: 4 }}>Uploading…</AppText>
                </View>
              )}
              {!uploadingReceipt && receiptUrl && (
                <View style={[styles.receiptBadge, { backgroundColor: colors.success + 'CC' }]}>
                  <Icon name="check" size={14} color="#FFF" />
                  <AppText style={{ color: '#FFF', fontSize: 11, marginLeft: 4 }}>Saved</AppText>
                </View>
              )}
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <Pressable onPress={pickReceipt} style={[styles.receiptAction, { borderColor: colors.border, flex: 1 }]}>
                <Icon name="camera" size={16} color={colors.accent} />
                <AppText style={{ color: colors.accent, fontSize: 13, marginLeft: 6 }}>Replace</AppText>
              </Pressable>
              <Pressable onPress={() => { setReceiptUri(null); setReceiptUrl(null); }} style={[styles.receiptAction, { borderColor: colors.danger + '50', flex: 1 }]}>
                <Icon name="trash" size={16} color={colors.danger} />
                <AppText style={{ color: colors.danger, fontSize: 13, marginLeft: 6 }}>Remove</AppText>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={pickReceipt} style={[styles.receiptPicker, { borderColor: colors.border, backgroundColor: colors.surface2 }]}>
            <Icon name="paperclip" size={18} color={colors.accent} />
            <AppText style={{ color: colors.accent, fontSize: 13, marginLeft: 8, fontWeight: '600' }}>Attach Receipt Photo</AppText>
          </Pressable>
        )}

        <AppButton title="Save" onPress={save} disabled={!canSave} loading={saving} style={{ marginTop: 18 }} />
        <AppButton title="Delete" onPress={del} loading={saving} variant="primary" style={{ marginTop: 10, backgroundColor: colors.danger, borderColor: 'transparent' }} />
      </Card>

      <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={() => setPreviewVisible(false)}>
        <View style={[styles.previewOverlay, { backgroundColor: 'rgba(0,0,0,0.93)' }]}>
          <Pressable style={styles.previewClose} onPress={() => setPreviewVisible(false)}>
            <Icon name="x" size={24} color="#FFF" />
          </Pressable>
          {receiptUri && <Image source={{ uri: receiptUri }} style={styles.previewImage} resizeMode="contain" />}
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
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
  receiptPicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed' },
  receiptPreview: { height: 180, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, position: 'relative' },
  receiptImg: { width: '100%', height: '100%' },
  receiptOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  receiptBadge: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  receiptAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: radius.md, borderWidth: 1 },
  previewOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  previewImage: { width: '100%', height: '80%' },
});
