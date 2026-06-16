import React, { useState, useMemo, useContext } from 'react';
import { View, StyleSheet, Alert, Pressable, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Icon from '../../components/Icon';
import { spacing } from '../../theme/colors';
import { AuthService } from '../../services/AuthService';
import { getFcmToken } from '../../services/PushNotificationService';
import { AuthContext } from '../../store/auth';
import { ThemeContext } from '../../store/theme';

export default function PasswordCreateScreen({ route, navigation }: any) {
  const { email, signupToken } = route.params;
  const { setAuthToken } = useContext(AuthContext);
  const { colors } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const passwordValid = useMemo(() => {
    return hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  }, [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial]);

  const canSubmit = useMemo(() => {
    return passwordValid && password === confirmPassword && password.length > 0;
  }, [passwordValid, password, confirmPassword]);

  const handleCreateAccount = async () => {
    if (!canSubmit) {
      if (!passwordValid) {
        Alert.alert('Invalid Password', 'Please meet all the password criteria listed.');
      } else {
        Alert.alert('Passwords do not match', 'Please make sure both passwords match.');
      }
      return;
    }

    try {
      setLoading(true);

      // Get FCM token
      const fcmToken = await getFcmToken();

      const resp = await AuthService.setPassword(email, password, signupToken, fcmToken);
      await setAuthToken(resp.token, { id: String(resp.user.id), email: resp.user.email });
      Alert.alert('Account Created!', 'Welcome! Your account is ready.', [{ text: 'OK' }]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const renderCheckItem = (label: string, met: boolean) => {
    return (
      <View style={styles.checkItemRow}>
        <Icon 
          name="check" 
          size={16} 
          color={met ? colors.accent : colors.muted} 
          strokeWidth={3} 
        />
        <AppText style={[styles.checkItemText, { color: met ? colors.accent : colors.text }]}>
          {label}
        </AppText>
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={[styles.wrap, { backgroundColor: colors.bg }]} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: spacing.lg, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
              <Icon name="arrow-left" size={24} color={colors.text} strokeWidth={2.5} />
            </Pressable>
            <AppText style={[styles.headerTitle, { color: colors.text }]}>Create Password</AppText>
            <View style={styles.backBtn} />
          </View>

          {/* Subtitle */}
          <AppText muted style={styles.subtitle}>
            Create a strong password for your account.
          </AppText>

          {/* Form */}
          <View style={styles.formContainer}>
            <AppText style={[styles.label, { color: colors.text }]}>
              New Password
            </AppText>
            <AppInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="john@123"
              right={
                <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={10}>
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.text} strokeWidth={2} />
                </Pressable>
              }
            />

            <View style={{ height: 16 }} />

            <AppText style={[styles.label, { color: colors.text }]}>
              Confirm New Password
            </AppText>
            <AppInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              placeholder="Enter New Password Again"
              right={
                <Pressable onPress={() => setShowConfirm((p) => !p)} hitSlop={10}>
                  <Icon name={showConfirm ? 'eye-off' : 'eye'} size={20} color={colors.text} strokeWidth={2} />
                </Pressable>
              }
            />
          </View>

          {/* Checklist */}
          <View style={styles.checklistContainer}>
            <AppText style={[styles.checklistTitle, { color: colors.text }]}>
              Make sure to contain at least
            </AppText>
            {renderCheckItem('minimum 8 characters', hasMinLength)}
            {renderCheckItem('One uppercase letter', hasUppercase)}
            {renderCheckItem('One lowercase letter', hasLowercase)}
            {renderCheckItem('One number', hasNumber)}
            {renderCheckItem('One special character (!@#$%)', hasSpecial)}
          </View>

        </ScrollView>

        {/* Bottom Button */}
        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20, paddingHorizontal: spacing.lg }]}>
          <AppButton
            title="Create Account"
            onPress={handleCreateAccount}
            loading={loading}
            disabled={!canSubmit && password.length > 0} 
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
    marginBottom: 32,
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 14,
  },
  checklistContainer: {
    marginBottom: 20,
  },
  checklistTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingLeft: 4,
  },
  checkItemText: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },
  bottomContainer: {
    width: '100%',
    paddingTop: 12,
  },
  fullWidthButton: {
    width: '100%',
  },
});
