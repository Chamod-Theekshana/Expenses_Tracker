import React, { useContext, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, Pressable } from 'react-native';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import { spacing } from '../../theme/colors';
import { AuthContext } from '../../store/auth';
import Card from '../../components/Card';
import { ThemeContext } from '../../store/theme';
import { scaleHeight } from '../../constants/size';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen({ navigation }: any) {
  const { signUp } = useContext(AuthContext);
  const { colors } = useContext(ThemeContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const emailValid = EMAIL_REGEX.test(email.trim());
  const passwordsMatch = password === confirm;
  const passwordLongEnough = password.length >= 8;

  const canSubmit = useMemo(
    () => emailValid && passwordLongEnough && passwordsMatch,
    [emailValid, passwordLongEnough, passwordsMatch],
  );

  const onSubmit = async () => {
    if (!emailValid) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (!passwordLongEnough) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters.');
      return;
    }
    if (!passwordsMatch) {
      Alert.alert('Passwords Do Not Match', 'Please make sure both passwords are the same.');
      return;
    }
    try {
      setLoading(true);
      await signUp(email.trim().toLowerCase(), password);
    } catch (e: any) {
      Alert.alert('Sign Up Failed', e?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <AppText title style={{ marginBottom: 6 }}>
        Create account
      </AppText>
      <AppText muted style={{ marginBottom: 24 }}>
        Start tracking your finances with a clean dashboard.
      </AppText>

      <Card style={{ marginBottom: 16 }}>
        <AppText muted style={{ marginBottom: 8 }}>
          Email
        </AppText>
        <AppInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />

        <View style={{ height: 14 }} />

        <AppText muted style={{ marginBottom: 8 }}>
          Password
        </AppText>
        <AppInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          placeholder="min 8 characters"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          right={
            <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={10}>
              <AppText style={{ color: colors.accent, fontWeight: '600' }}>
                {showPassword ? 'Hide' : 'Show'}
              </AppText>
            </Pressable>
          }
        />
        {password.length > 0 && !passwordLongEnough && (
          <AppText style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>
            Password must be at least 8 characters
          </AppText>
        )}

        <View style={{ height: 14 }} />

        <AppText muted style={{ marginBottom: 8 }}>
          Confirm Password
        </AppText>
        <AppInput
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry={!showPassword}
          placeholder="repeat password"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
        {confirm.length > 0 && !passwordsMatch && (
          <AppText style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>
            Passwords do not match
          </AppText>
        )}

        <AppButton
          title="Create Account"
          onPress={onSubmit}
          loading={loading}
          disabled={!canSubmit || loading}
          style={{ marginTop: 16 }}
        />
      </Card>

      <View style={styles.footer}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <AppText muted>
            Already have an account?{' '}
            <AppText style={{ color: colors.accent, fontWeight: '600' }}>Sign in</AppText>
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: 56,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: scaleHeight(50),
    alignItems: 'center',
  },
});
