import React, { useContext, useMemo, useState } from 'react';
import { Alert, StyleSheet, View, Image, Pressable, ActivityIndicator, Modal } from 'react-native';
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
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import { radius } from '../../theme/colors';

export default function TransactionDetailScreen({ route, navigation }: any) {
  const { tx }: { tx: Tx } = route.params;
  const { colors } = useContext(ThemeContext);
  const { updateTx, removeTx } = useContext(TransactionsContext);
  const { userId } = useContext(AuthContext);

  const [title, setTitle] = useState(tx.title);
  const [amountRaw, setAmountRaw] = useState(String(Math.abs(tx.amount)));
  const [category, setCategory] = useState(tx.category);
  const [dateISO, setDateISO] = useState(tx.dateISO?.slice(0, 10) || new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const [receiptUri, setReceiptUri] = useState<string | null>(tx.receiptUrl || null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(tx.receiptUrl || null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  const isIncome = tx.amount > 0;
  const amount = useMemo(() => {
    const n = Number(amountRaw);
    return Number.isFinite(n) ? n : 0;
  }, [amountRaw]);

  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(dateISO);
  const canSave = title.trim().length >= 2 && amount > 0 && dateOk && userId;

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

  const save = async () => {
    if (!canSave) { Alert.alert('Missing info', 'Check title, amount and date.'); return; }
    try {
      setSaving(true);
      await updateTx(tx.id, { title: title.trim(), category: category.trim() || 'Other', amount: isIncome ? amount : -amount, currency: tx.currency || 'LKR', dateISO, receiptUrl: receiptUrl || null }, userId!);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  const del = async () => {
    Alert.alert('Delete transaction', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { setSaving(true); await removeTx(tx.id, userId!); navigation.goBack(); }
        catch (e: any) { Alert.alert('Error', e?.message || 'Failed to delete'); }
        finally { setSaving(false); }
      }},
    ]);
  };

  return (
    <Screen preset="scroll" padded contentContainerStyle={{ paddingBottom: 40 }}>
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
        <AppInput value={category} onChangeText={setCategory} />
        <View style={{ height: 16 }} />
        <AppText muted style={{ marginBottom: 10, fontSize: 13 }}>Date (YYYY-MM-DD)</AppText>
        <AppInput value={dateISO} onChangeText={setDateISO} />

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
