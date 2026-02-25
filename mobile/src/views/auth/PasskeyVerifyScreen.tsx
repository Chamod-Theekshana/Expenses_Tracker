import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import OTPInput from '../../components/OTPInput';
import { colors, spacing } from '../../theme/colors';
import { AuthService } from '../../services/AuthService';

export default function PasskeyVerifyScreen({ route, navigation }: any) {
  const { email } = route.params;

  const [passkey, setPasskey] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (passkey.length !== 6) {
      Alert.alert('Invalid', 'Please enter all 6 digits');
      return;
    }

    try {
      setLoading(true);
      const response = await AuthService.verifyPasskey(email, passkey);
      navigation.navigate('PasswordCreate', {
        email,
        signupToken: response.signupToken,
      });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Verification failed');
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
      Alert.alert('Success', 'New passkey sent to your email');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to resend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <AppText title style={{ marginBottom: 6 }}>
        Enter Passkey
      </AppText>
      <AppText muted style={{ marginBottom: 18 }}>
        We sent a 6-digit code to {email}
      </AppText>

      <Card style={{ marginBottom: 16 }}>
        <AppText muted style={{ marginBottom: 16, textAlign: 'center' }}>
          Passkey
        </AppText>
        <OTPInput value={passkey} onChangeText={setPasskey} editable={!loading} />

        <AppButton
          title="Verify"
          onPress={handleVerify}
          loading={loading}
          disabled={passkey.length !== 6}
          style={{ marginTop: 24 }}
        />

        <AppButton
          title={resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Passkey'}
          variant="secondary"
          onPress={handleResend}
          disabled={resendCooldown > 0 || loading}
          style={{ marginTop: 12 }}
        />
      </Card>

      <AppText muted style={{ textAlign: 'center', fontSize: 13 }}>
        Passkey expires in 5 minutes • Max 5 attempts
      </AppText>
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
