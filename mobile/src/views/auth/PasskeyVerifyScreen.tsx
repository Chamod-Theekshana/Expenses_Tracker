import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, Pressable, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import OTPInput from '../../components/OTPInput';
import Icon from '../../components/Icon';
import { spacing } from '../../theme/colors';
import { AuthService } from '../../services/AuthService';
import { ThemeContext } from '../../store/theme';

export default function PasskeyVerifyScreen({ route, navigation }: any) {
  const { email } = route.params;
  const { colors } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const [passkey, setPasskey] = useState('');
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Reset error when user types again
  useEffect(() => {
    if (isError) setIsError(false);
  }, [passkey]);

  const handleVerify = async () => {
    if (passkey.length !== 6) {
      setIsError(true);
      return;
    }

    try {
      setLoading(true);
      // We assume backend handles 5 digit codes. 
      const response = await AuthService.verifyPasskey(email, passkey);
      navigation.navigate('PasswordCreate', {
        email,
        signupToken: response.signupToken,
      });
    } catch (error: any) {
      setIsError(true);
      setPasskey('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setLoading(true);
      await AuthService.sendPasskey(email);
      setResendCooldown(30);
      setPasskey('');
      setIsError(false);
    } catch (error: any) {
      setIsError(true);
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
            <AppText style={[styles.headerTitle, { color: colors.text }]}>Verification</AppText>
            <View style={styles.backBtn} />
          </View>

          {/* Subtitle */}
          <AppText muted style={styles.subtitle}>
            We sent a 6-digit code to the email{'\n'}
            <AppText style={{ color: colors.text, fontWeight: '500' }}>{email}</AppText>
          </AppText>

          {/* Re-enter Email */}
          <View style={styles.reenterRow}>
            <AppText muted style={styles.reenterText}>
              Incorrect Email Address?{' '}
            </AppText>
            <Pressable onPress={() => navigation.goBack()}>
              <AppText style={[styles.reenterAction, { color: colors.accent }]}>
                Re-enter Email
              </AppText>
            </Pressable>
          </View>

          {/* Illustration */}
          <View style={[styles.illustration, { backgroundColor: colors.accent + '15' }]}>
            <Icon name="mail" size={60} color={colors.accent} strokeWidth={1.5} />
          </View>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            <OTPInput 
              value={passkey} 
              onChangeText={setPasskey} 
              editable={!loading} 
              length={6} 
              isError={isError} 
            />
            
            {/* Error Message */}
            <View style={styles.errorContainer}>
              {isError && (
                <AppText style={[styles.errorText, { color: colors.danger }]}>
                  Please enter the valid code!
                </AppText>
              )}
            </View>

            {/* Resend Code */}
            <View style={styles.resendRow}>
              <AppText style={[styles.resendText, { color: colors.text }]}>
                Didn't receive code?{' '}
              </AppText>
              <Pressable onPress={handleResend} disabled={resendCooldown > 0 || loading}>
                <AppText style={[styles.resendAction, { color: resendCooldown > 0 ? colors.muted : colors.accent }]}>
                  {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Bottom Button */}
        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20, paddingHorizontal: spacing.lg }]}>
          <AppButton
            title="Verify Code"
            onPress={handleVerify}
            loading={loading}
            disabled={passkey.length !== 6 && !isError}
            style={[
              styles.fullWidthButton,
              // If not 5 digits and no error, you might want to show it as muted or solid, 
              // the mockups show the button enabled/disabled visually. AppButton handles this with 'disabled'.
            ]}
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
    marginBottom: 20,
    lineHeight: 24,
  },
  reenterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  reenterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  reenterAction: {
    fontSize: 14,
    fontWeight: '500',
  },
  illustration: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  otpContainer: {
    alignItems: 'center',
  },
  errorContainer: {
    height: 20,
    marginTop: 12,
    marginBottom: 8,
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 13,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  resendText: {
    fontSize: 15,
    fontWeight: '500',
  },
  resendAction: {
    fontSize: 15,
    fontWeight: '500',
  },
  bottomContainer: {
    width: '100%',
    paddingTop: 12,
  },
  fullWidthButton: {
    width: '100%',
  },
});
