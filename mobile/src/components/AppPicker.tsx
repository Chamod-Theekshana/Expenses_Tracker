import React, { useContext, useState } from 'react';
import { View, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import AppText from './AppText';
import { ThemeContext } from '../store/theme';
import { radius } from '../theme/colors';

type PickerOption = {
  label: string;
  value: string;
};

type Props = {
  options: PickerOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
};

export default function AppPicker({ options, value, onValueChange, placeholder }: Props) {
  const { colors } = useContext(ThemeContext);
  const [visible, setVisible] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <>
      <Pressable
        style={[styles.picker, { backgroundColor: colors.surface2, borderColor: colors.border }]}
        onPress={() => setVisible(true)}
      >
        <AppText style={{ color: selected ? colors.text : colors.muted, flex: 1 }}>
          {selected?.label || placeholder || 'Select...'}
        </AppText>
        <AppText style={{ color: colors.muted, fontSize: 12 }}>▼</AppText>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <ScrollView>
              {options.map(option => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.option,
                    { borderBottomColor: colors.border },
                    option.value === value && { backgroundColor: colors.accentBg },
                  ]}
                  onPress={() => {
                    onValueChange(option.value);
                    setVisible(false);
                  }}
                >
                  <AppText style={{ color: option.value === value ? colors.accent : colors.text, fontWeight: option.value === value ? '600' : '400' }}>
                    {option.label}
                  </AppText>
                  {option.value === value && (
                    <AppText style={{ color: colors.accent, fontSize: 16 }}>✓</AppText>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  picker: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: 360,
    overflow: 'hidden',
    paddingTop: 8,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  option: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
