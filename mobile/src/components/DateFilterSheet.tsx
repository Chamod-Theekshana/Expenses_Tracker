import React, { useContext } from 'react';
import { View, StyleSheet, Pressable, Modal } from 'react-native';
import AppText from './AppText';
import DateFilterBar from './DateFilterBar';
import { ThemeContext } from '../store/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function DateFilterSheet({ visible, onClose }: Props) {
  const { colors } = useContext(ThemeContext);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.dragIndicator, { backgroundColor: colors.border }]} />
          
          <View style={styles.header}>
            <AppText style={[styles.headerTitle, { color: colors.text }]}>Filter by Date</AppText>
            <Pressable onPress={onClose} hitSlop={10}>
              <AppText style={[styles.headerAction, { color: colors.accent }]}>Done</AppText>
            </Pressable>
          </View>
          
          {/* Reuse existing DateFilterBar for functionality */}
          <DateFilterBar />
          
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerAction: {
    fontSize: 15,
    fontWeight: '600',
  },
});
