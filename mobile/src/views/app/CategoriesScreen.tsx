import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import Screen from '../../components/Screen';
import IconButton from '../../components/IconButton';
import { ThemeContext } from '../../store/theme';
import { radius } from '../../theme/colors';
import { Category, CategoryService } from '../../services/CategoryService';

export default function CategoriesScreen({ navigation }: any) {
  const { colors } = useContext(ThemeContext);
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');

  const canAdd = useMemo(() => name.trim().length >= 2, [name]);

  const load = async () => {
    try {
      setLoading(true);
      const list = await CategoryService.list();
      setItems(list);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!canAdd) return;
    try {
      setLoading(true);
      await CategoryService.create(name.trim(), 'expense');
      setName('');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const del = async (id: string) => {
    Alert.alert('Delete category', 'Remove this category?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await CategoryService.remove(id);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to delete category');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen preset="fixed" padded>
      <View style={styles.topRow}>
        <AppText title>Categories</AppText>
        <IconButton icon="x" onPress={() => navigation.goBack()} accessibilityLabel="Close" />
      </View>

      <Card>
        <AppText muted style={{ marginBottom: 10, fontSize: 13 }}>
          Add a category
        </AppText>
        <AppInput value={name} onChangeText={setName} placeholder="e.g., Health, Gifts" />
        <AppButton title="Add" onPress={add} disabled={!canAdd} loading={loading} style={{ marginTop: 12 }} />
      </Card>

      <View style={{ height: 14 }} />

      <FlatList
        data={items.filter((c) => c.type !== 'income')}
        keyExtractor={(i) => i.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={() => (
          <Card>
            <AppText muted>No categories yet. Add one above.</AppText>
          </Card>
        )}
        renderItem={({ item }) => (
          <Pressable onLongPress={() => del(item.id)}>
            <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <AppText style={{ fontWeight: '600' }}>{item.name}</AppText>
              <AppText muted style={{ fontSize: 12 }}>
                Long-press to delete
              </AppText>
            </View>
          </Pressable>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
});
