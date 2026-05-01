import React, { useContext, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, Pressable, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Icon from '../../components/Icon';
import { spacing } from '../../theme/colors';
import { AuthContext } from '../../store/auth';
import { scaleHeight } from '../../constants/size';
import { ThemeContext } from '../../store/theme';
import { images } from '../../constants/images';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen({ navigation }: any) {
  const { signIn } = useContext(AuthContext);
  const { colors, theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const emailValid = EMAIL_REGEX.test(email.trim());
  const canSubmit = useMemo(() => emailValid && password.length >= 6, [emailValid, password]);

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

  const onForgotPassword = () => {
    Alert.alert('Coming soon', 'Forgot password will be available soon.');
  };

  const pageBg = theme === 'light' ? '#F3F4F8' : colors.bg;
  const helperText = theme === 'light' ? '#6A6F86' : colors.textSecondary;

  return (
    <View style={[styles.wrap, { backgroundColor: pageBg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 16, scaleHeight(24)),
            paddingBottom: Math.max(insets.bottom + 16, scaleHeight(24)),
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandWrap}>
          <Image source={images.splashScreen} style={styles.brandLogo} resizeMode="contain" />
        </View>

        <View style={styles.header}>
          <AppText style={[styles.title, { color: colors.text }]}>Good to See You Again!</AppText>
          <AppText style={[styles.subtitle, { color: helperText }]}>Let’s get your finances on track today.</AppText>
        </View>

        <View style={styles.formWrap}>
          <AppText style={[styles.label, { color: colors.text }]}>Email Address</AppText>
          <AppInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="Enter your Email Address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
          />

          <View style={styles.fieldGap} />

          <AppText style={[styles.label, { color: colors.text }]}>Password</AppText>
          <AppInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="Enter your Password"
            autoComplete="password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={onSubmit}
            right={
              <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={10} style={{ padding: 4 }}>
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color={theme === 'light' ? '#151515' : colors.muted} />
              </Pressable>
            }
          />

          <View style={styles.metaRow}>
            <Pressable onPress={() => setRememberMe((v) => !v)} style={styles.rememberWrap} hitSlop={8}>
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: rememberMe ? colors.accent : theme === 'light' ? '#2F2F2F' : colors.border,
                    backgroundColor: rememberMe ? colors.accent : 'transparent',
                  },
                ]}
              >
                {rememberMe ? <Icon name="check" size={12} color="#FFFFFF" strokeWidth={2.8} /> : null}
              </View>
              <AppText style={[styles.metaText, { color: colors.accent }]}>Remember Me</AppText>
            </Pressable>

            <Pressable onPress={onForgotPassword} hitSlop={10} style={{ paddingVertical: 6 }}>
              <AppText style={[styles.metaText, { color: colors.accent }]}>Forgot Password?</AppText>
            </Pressable>
          </View>

          <AppButton
            title="Sign In"
            onPress={onSubmit}
            loading={loading}
            disabled={!canSubmit || loading}
            size="lg"
            style={styles.signInButton}
            textStyle={styles.signInButtonText}
          />

          <View style={styles.footer}>
            <Pressable onPress={() => navigation.navigate('SignupEmail')} hitSlop={10} style={{ padding: 8 }}>
              <AppText style={[styles.footerText, { color: colors.text }]}> 
                New Here? <AppText style={[styles.footerAccent, { color: colors.text }]}>Create Account</AppText>
              </AppText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: scaleHeight(22),
  },
  brandLogo: {
    width: 118,
    height: 86,
  },
  header: {
    alignItems: 'center',
    marginBottom: scaleHeight(44),
  },
  title: {
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 0,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 24,
    fontWeight: '500',
  },
  formWrap: {
    marginTop: scaleHeight(4),
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  fieldGap: {
    height: 16,
  },
  metaRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rememberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1.3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  signInButton: {
    marginTop: scaleHeight(52),
    borderRadius: 12,
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  signInButtonText: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  footerAccent: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
  },
});
