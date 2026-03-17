import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import OTPInput from '../../components/OTPInput';
import Icon from '../../components/Icon';
import IconButton from '../../components/IconButton';
import { radius, spacing } from '../../theme/colors';
import { scaleHeight } from '../../constants/size';
import { OtpService } from '../../services/OtpService';
import { ThemeContext } from '../../store/theme';

export default function OTPVerifyScreen({ route, navigation }: any) {
  const { email } = route.params;
  const { colors, theme } = useContext(ThemeContext);

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid', 'Please enter all 6 digits');
      return;
    }

    try {
      setLoading(true);
      const response = await OtpService.verifyOTP(email, otp);
      navigation.navigate('PasswordCreate', {
        email,
        signupToken: response.signupToken,
      });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Verification failed');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setLoading(true);
      await OtpService.sendOTP(email);
      setResendCooldown(30);
      setOtp('');
      Alert.alert('Success', 'New passkey sent to your email');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to resend');
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
            <Icon name="key" size={32} color={colors.accent} />
          </View>
          <AppText title style={{ fontSize: 28, marginTop: 16 }}>
            Verify Passkey
          </AppText>
          <AppText muted style={{ fontSize: 16, marginTop: 8, textAlign: 'center' }}>
            We've sent a 6-digit secure code to
          </AppText>
          <AppText style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 4 }}>
            {email}
          </AppText>
        </View>

        <Card style={[styles.formCard, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText style={[styles.label, { color: colors.text, textAlign: 'center', marginBottom: 24 }]}>
            Enter 6-Digit Passkey
          </AppText>
          
          <OTPInput value={otp} onChangeText={setOtp} editable={!loading} />

          <AppButton
            title="Verify & Continue"
            onPress={handleVerify}
            loading={loading}
            disabled={otp.length !== 6 || loading}
            style={{ marginTop: 32 }}
            size="lg"
          />

          <AppButton
            title={resendCooldown > 0 ? `Resend Passkey in ${resendCooldown}s` : 'Resend Passkey'}
            variant="ghost"
            onPress={handleResend}
            disabled={resendCooldown > 0 || loading}
            style={{ marginTop: 12 }}
          />
        </Card>

        <View style={styles.footer}>
          <AppText muted style={{ fontSize: 13, textAlign: 'center' }}>
            Passkey expires in 5 minutes
          </AppText>
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
    fontSize: 15,
    fontWeight: '700',
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
