import React, { useContext, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, Pressable } from 'react-native';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import { spacing } from '../../theme/colors';
import { AuthContext } from '../../store/auth';
import Card from '../../components/Card';
import { scaleHeight } from '../../constants/size';
import { ThemeContext } from '../../store/theme';

export default function SignInScreen({ navigation }: any) {
  const { signIn } = useContext(AuthContext);
  const { colors } = useContext(ThemeContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = useMemo(
    () => emailValid && password.length >= 6,
    [emailValid, password],
  );

  const onSubmit = async () => {
    if (!emailValid) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters.');
      return;
    }
    try {
      setLoading(true);
      await signIn(email.trim().toLowerCase(), password);
    } catch (e: any) {
      Alert.alert('Sign In Failed', e?.message ?? 'Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <AppText title style={{ marginBottom: 6 }}>
        Welcome back
      </AppText>
      <AppText muted style={{ marginBottom: 24 }}>
        Sign in to continue tracking your spending.
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
          placeholder="••••••"
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          right={
            <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={10}>
              <AppText style={{ color: colors.accent, fontWeight: '600' }}>
                {showPassword ? 'Hide' : 'Show'}
              </AppText>
            </Pressable>
          }
        />

        <AppButton
          title="Sign In"
          onPress={onSubmit}
          loading={loading}
          disabled={!canSubmit || loading}
          style={{ marginTop: 16 }}
        />
      </Card>

      <View style={styles.footer}>
        <Pressable onPress={() => navigation.navigate('SignupEmail')} hitSlop={10}>
          <AppText muted>
            New here?{' '}
            <AppText style={{ color: colors.accent, fontWeight: '600' }}>Create account</AppText>
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
