import React, { useRef, useContext } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { radius } from '../theme/colors';
import { ThemeContext } from '../store/theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  editable?: boolean;
};

export default function OTPInput({ value, onChangeText, editable = true }: Props) {
  const { colors } = useContext(ThemeContext);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const newValue = value.split('');
    newValue[index] = text.slice(-1);
    const result = newValue.join('');
    onChangeText(result);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <TextInput
          key={i}
          ref={(ref) => { inputs.current[i] = ref; }}
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
            },
            value[i] && {
              borderColor: colors.accent,
              backgroundColor: colors.accentBg,
            },
          ]}
          maxLength={1}
          keyboardType="number-pad"
          value={value[i] || ''}
          onChangeText={(text) => handleChange(text, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          editable={editable}
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  input: {
    width: 50,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
  },
});
