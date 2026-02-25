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
        <AppText style={{ color: selected ? colors.text : colors.muted }}>
          {selected?.label || placeholder || 'Select...'}
        </AppText>
        <AppText style={{ color: colors.muted }}>▼</AppText>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <ScrollView>
              {options.map(option => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.option,
                    { borderBottomColor: colors.border },
                    option.value === value && { backgroundColor: colors.surface2 }
                  ]}
                  onPress={() => {
                    onValueChange(option.value);
                    setVisible(false);
                  }}
                >
                  <AppText style={{ color: colors.text }}>{option.label}</AppText>
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
    height: 54,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: radius.lg,
    maxHeight: 300,
    overflow: 'hidden',
  },
  option: {
    padding: 16,
    borderBottomWidth: 1,
  },
});
