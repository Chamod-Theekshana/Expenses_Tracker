import React, { useContext, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, Pressable } from 'react-native';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import { colors, spacing } from '../../theme/colors';
import { AuthContext } from '../../store/auth';
import Card from '../../components/Card';

export default function SignUpScreen({ navigation }: any) {
  const { signUp } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return email.includes('@') && password.length >= 6 && password === confirm;
  }, [email, password, confirm]);

  const onSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('Check details', 'Use a valid email and matching passwords (min 6 chars).');
      return;
    }
    try {
      setLoading(true);
      await signUp(email.trim().toLowerCase(), password);
    } catch (e: any) {
      Alert.alert('Sign up failed', e?.message ?? 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <AppText title style={{ marginBottom: 6 }}>
        Create account
      </AppText>
      <AppText muted style={{ marginBottom: 18 }}>
        Start tracking with a clean, fast dashboard.
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
        <AppInput value={password} onChangeText={setPassword} secureTextEntry placeholder="min 6 characters" />

        <View style={{ height: 14 }} />

        <AppText muted style={{ marginBottom: 8 }}>
          Confirm Password
        </AppText>
        <AppInput value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="repeat password" />

        <AppButton
          title="Create account"
          onPress={onSubmit}
          loading={loading}
          disabled={!canSubmit}
          style={{ marginTop: 16 }}
        />
      </Card>

      <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
        <AppText muted>
          Already have an account? <AppText style={{ color: colors.accent, fontWeight: '700' }}>Sign in</AppText>
        </AppText>
      </Pressable>
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
});
