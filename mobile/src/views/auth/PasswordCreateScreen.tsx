import React, { useState, useMemo, useContext } from 'react';
import { View, StyleSheet, Alert, Pressable } from 'react-native';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import { spacing } from '../../theme/colors';
import { AuthService } from '../../services/AuthService';
import { getFcmToken } from '../../services/PushNotificationService';
import { AuthContext } from '../../store/auth';
import { ThemeContext } from '../../store/theme';

export default function PasswordCreateScreen({ route, navigation }: any) {
  const { email, signupToken } = route.params;
  const { setAuthToken } = useContext(AuthContext);
  const { colors } = useContext(ThemeContext);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordValid = useMemo(() => {
    return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
  }, [password]);

  const canSubmit = useMemo(() => {
    return passwordValid && password === confirmPassword;
  }, [passwordValid, password, confirmPassword]);

  const handleCreateAccount = async () => {
    if (!canSubmit) {
      if (!passwordValid) {
        Alert.alert('Invalid Password', 'Password must be at least 8 characters with 1 uppercase letter and 1 number');
      } else {
        Alert.alert('Passwords do not match', 'Please make sure both passwords match');
      }
      return;
    }

    try {
      setLoading(true);

      // Get FCM token (permission was already requested at app open)
      const fcmToken = await getFcmToken();
      console.log('[Push] Sending FCM token with account creation:', fcmToken ? 'yes' : 'no');

      const resp = await AuthService.setPassword(email, password, signupToken, fcmToken);
      await setAuthToken(resp.token, { id: String(resp.user.id), email: resp.user.email });
      Alert.alert('Account Created!', 'Welcome! Your account is ready.', [{ text: 'OK' }]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <AppText title style={{ marginBottom: 6 }}>
        Set Password
      </AppText>
      <AppText muted style={{ marginBottom: 18 }}>
        Create a secure password for {email}
      </AppText>

      <Card style={{ marginBottom: 16 }}>
        <AppText muted style={{ marginBottom: 8 }}>
          Password
        </AppText>
        <AppInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          placeholder="Min 8 chars, 1 uppercase, 1 number"
          right={
            <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={10}>
              <AppText style={{ color: colors.accent, fontWeight: '600' }}>
                {showPassword ? 'Hide' : 'Show'}
              </AppText>
            </Pressable>
          }
        />

        <View style={{ height: 14 }} />

        <AppText muted style={{ marginBottom: 8 }}>
          Confirm Password
        </AppText>
        <AppInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirm}
          placeholder="Re-enter password"
          right={
            <Pressable onPress={() => setShowConfirm((p) => !p)} hitSlop={10}>
              <AppText style={{ color: colors.accent, fontWeight: '600' }}>
                {showConfirm ? 'Hide' : 'Show'}
              </AppText>
            </Pressable>
          }
        />

        {password.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <AppText style={{ fontSize: 12, color: password.length >= 8 ? colors.success : colors.muted }}>
              {password.length >= 8 ? '✓' : '○'} At least 8 characters
            </AppText>
            <AppText style={{ fontSize: 12, color: /[A-Z]/.test(password) ? colors.success : colors.muted }}>
              {/[A-Z]/.test(password) ? '✓' : '○'} 1 uppercase letter
            </AppText>
            <AppText style={{ fontSize: 12, color: /[0-9]/.test(password) ? colors.success : colors.muted }}>
              {/[0-9]/.test(password) ? '✓' : '○'} 1 number
            </AppText>
          </View>
        )}

        <AppButton
          title="Create Account"
          onPress={handleCreateAccount}
          loading={loading}
          disabled={!canSubmit}
          style={{ marginTop: 16 }}
        />
      </Card>

      <AppText muted style={{ textAlign: 'center', fontSize: 13 }}>
        After creating your account, you'll need to sign in
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: 56,
  },
});
