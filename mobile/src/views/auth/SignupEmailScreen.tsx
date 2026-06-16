import React, { useState, useMemo, useContext } from 'react';
import { View, StyleSheet, Alert, Pressable, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Icon from '../../components/Icon';
import { spacing } from '../../theme/colors';
import { AuthService } from '../../services/AuthService';
import { ThemeContext } from '../../store/theme';

export default function SignupEmailScreen({ navigation }: any) {
  const { colors } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => email.includes('@'), [email]);

  const handleSendPasskey = async () => {
    if (!canSubmit) {
      Alert.alert('Invalid email', 'Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      await AuthService.sendPasskey(email.trim().toLowerCase());
      navigation.navigate('PasskeyVerify', { email: email.trim().toLowerCase() });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={[styles.wrap, { backgroundColor: colors.bg }]} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ paddingTop: insets.top + 20, flex: 1, paddingHorizontal: spacing.lg }}>
          
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
              <Icon name="arrow-left" size={24} color={colors.text} strokeWidth={2.5} />
            </Pressable>
            <AppText style={[styles.headerTitle, { color: colors.text }]}>Create Account</AppText>
            <View style={styles.backBtn} />
          </View>

          {/* Subtitle */}
          <AppText muted style={styles.subtitle}>
            Please enter your email address to receive verification code.
          </AppText>

          {/* Form */}
          <View style={styles.formContainer}>
            <AppText style={[styles.label, { color: colors.text }]}>
              Email Address
            </AppText>
            <AppInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="johnchristopher99@email.com"
              editable={!loading}
            />
          </View>

        </View>

        {/* Bottom Button */}
        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20, paddingHorizontal: spacing.lg }]}>
          <AppButton
            title="Send Verification Code"
            onPress={handleSendPasskey}
            loading={loading}
            disabled={!canSubmit}
            style={styles.fullWidthButton}
          />
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 32,
    lineHeight: 22,
  },
  formContainer: {
    marginBottom: 16,
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 14,
  },
  bottomContainer: {
    width: '100%',
    paddingTop: 12,
  },
  fullWidthButton: {
    width: '100%',
  },
});
