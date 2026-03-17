import React, { useContext, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, Pressable, ScrollView } from 'react-native';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Icon from '../../components/Icon';
import { radius, spacing } from '../../theme/colors';
import { AuthContext } from '../../store/auth';
import Card from '../../components/Card';
import { scaleHeight } from '../../constants/size';
import { ThemeContext } from '../../store/theme';

export default function SignInScreen({ navigation }: any) {
  const { signIn } = useContext(AuthContext);
  const { colors, theme } = useContext(ThemeContext);

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

  const cardShadow = theme === 'light' ? styles.cardShadowLight : {};

  return (
    <ScrollView 
      style={[styles.wrap, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: scaleHeight(40) }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accent + '20' }]}>
          <Icon name="log-in" size={32} color={colors.accent} />
        </View>
        <AppText title style={{ fontSize: 28, marginTop: 16 }}>
          Welcome back
        </AppText>
        <AppText muted style={{ fontSize: 16, marginTop: 8, textAlign: 'center' }}>
          Sign in to continue tracking your spending and achieving your goals.
        </AppText>
      </View>

      <Card style={[styles.formCard, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AppText style={[styles.label, { color: colors.text }]}>Email</AppText>
        <AppInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Enter your email"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />

        <View style={{ height: 20 }} />

        <AppText style={[styles.label, { color: colors.text }]}>Password</AppText>
        <AppInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          placeholder="••••••••"
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          right={
            <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={10} style={{ padding: 4 }}>
              <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.muted} />
            </Pressable>
          }
        />

        <AppButton
          title="Sign In"
          onPress={onSubmit}
          loading={loading}
          disabled={!canSubmit || loading}
          style={{ marginTop: 32 }}
          size="lg"
        />
      </Card>

      <View style={styles.footer}>
        <Pressable onPress={() => navigation.navigate('SignupEmail')} hitSlop={10} style={{ padding: 10 }}>
          <AppText muted style={{ fontSize: 15 }}>
            New here?{' '}
            <AppText style={{ color: colors.accent, fontWeight: '700', fontSize: 15 }}>Create an account</AppText>
          </AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: scaleHeight(60),
  },
  header: {
    alignItems: 'center',
    marginBottom: scaleHeight(30),
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  formCard: {
    padding: 24,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingTop: 32,
  },
  cardShadowLight: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
});
