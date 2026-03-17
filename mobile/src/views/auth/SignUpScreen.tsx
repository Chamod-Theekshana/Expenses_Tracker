import React, { useContext, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, Pressable, ScrollView } from 'react-native';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Icon from '../../components/Icon';
import IconButton from '../../components/IconButton';
import { radius, spacing } from '../../theme/colors';
import { AuthContext } from '../../store/auth';
import Card from '../../components/Card';
import { ThemeContext } from '../../store/theme';
import { scaleHeight } from '../../constants/size';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen({ navigation }: any) {
  const { signUp } = useContext(AuthContext);
  const { colors, theme } = useContext(ThemeContext);

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

  const cardShadow = theme === 'light' ? styles.cardShadowLight : {};

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <View style={styles.topBar}>
        <IconButton icon="arrow-left" size={40} iconSize={24} onPress={() => navigation.goBack()} />
      </View>

      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: scaleHeight(40) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accent + '20' }]}>
            <Icon name="user-plus" size={32} color={colors.accent} />
          </View>
          <AppText title style={{ fontSize: 28, marginTop: 16 }}>
            Create account
          </AppText>
          <AppText muted style={{ fontSize: 16, marginTop: 8, textAlign: 'center' }}>
            Join PulseSpend to take control of your finances.
          </AppText>
        </View>

        <Card style={[styles.formCard, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText style={[styles.label, { color: colors.text }]}>Email</AppText>
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

          <View style={{ height: 20 }} />

          <AppText style={[styles.label, { color: colors.text }]}>Password</AppText>
          <AppInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            style={password.length > 0 && !passwordLongEnough ? { borderColor: colors.danger } : {}}
            right={
              <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={10} style={{ padding: 4 }}>
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.muted} />
              </Pressable>
            }
          />
          {password.length > 0 && !passwordLongEnough && (
            <AppText style={{ color: colors.danger, fontSize: 12, marginTop: 6, marginLeft: 4 }}>
              Password must be at least 8 characters
            </AppText>
          )}

          <View style={{ height: 20 }} />

          <AppText style={[styles.label, { color: colors.text }]}>Confirm Password</AppText>
          <AppInput
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!showPassword}
            placeholder="Repeat password"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={onSubmit}
            style={confirm.length > 0 && !passwordsMatch ? { borderColor: colors.danger } : {}}
          />
          {confirm.length > 0 && !passwordsMatch && (
            <AppText style={{ color: colors.danger, fontSize: 12, marginTop: 6, marginLeft: 4 }}>
              Passwords do not match
            </AppText>
          )}

          <AppButton
            title="Create Account"
            onPress={onSubmit}
            loading={loading}
            disabled={!canSubmit || loading}
            style={{ marginTop: 32 }}
            size="lg"
          />
        </Card>

        <View style={styles.footer}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ padding: 10 }}>
            <AppText muted style={{ fontSize: 15 }}>
              Already have an account?{' '}
              <AppText style={{ color: colors.accent, fontWeight: '700', fontSize: 15 }}>Sign in</AppText>
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: scaleHeight(50),
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: -8,
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
