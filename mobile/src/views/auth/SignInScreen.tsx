import React, { useContext, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, Pressable } from 'react-native';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import { colors, spacing } from '../../theme/colors';
import { AuthContext } from '../../store/auth';
import Card from '../../components/Card';
import { scaleHeight } from '../../constants/size';

export default function SignInScreen({ navigation }: any) {
  const { signIn } = useContext(AuthContext);

  const [email, setEmail] = useState('demo@pulsespend.app');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const canSubmit = useMemo(() => email.includes('@') && password.length >= 6, [email, password]);

  const onSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('Check details', 'Use a valid email and at least 6 characters password.');
      return;
    }
    try {
      setLoading(true);
      await signIn(email.trim().toLowerCase(), password);
    } catch (e: any) {
      Alert.alert('Sign in failed', e?.message ?? 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <AppText title style={{ marginBottom: 6 }}>
        Welcome back
      </AppText>
      <AppText muted style={{ marginBottom: 18 }}>
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
        />

        <View style={{ height: 14 }} />

        <AppText muted style={{ marginBottom: 8 }}>
          Password
        </AppText>
        <AppInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!show}
          placeholder="••••••"
          right={
            <Pressable onPress={() => setShow((p) => !p)} hitSlop={10}>
              <AppText style={{ color: colors.accent, fontWeight: '700' }}>
                {show ? 'Hide' : 'Show'}
              </AppText>
            </Pressable>
          }
        />

        <AppButton
          title="Sign In"
          onPress={onSubmit}
          loading={loading}
          disabled={!canSubmit}
          style={{ marginTop: 16 }}
        />
      </Card>

      <View style={styles.footer}>
        <Pressable onPress={() => navigation.navigate('SignupEmail')} hitSlop={10}>
          <AppText muted>
            New here? <AppText style={{ color: colors.accent, fontWeight: '700' }}>Create account</AppText>
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    paddingTop: 56,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: scaleHeight(50),
  },
});
